import "./env.js";
import express, { type Request, type Response } from "express";
import {
  createBossPayBridge,
  MemoryTxnStore,
  toExpress,
  type BridgeHandlers,
  type CollectRequest,
  type CollectResult,
  type StatusRequest,
  type StatusResult,
} from "@bosspay/bridge-node";
import {
  initiateEasebuzzPayment,
  retrieveEasebuzzTransaction,
  normalizeEasebuzzStatusResponse,
  resolveEasebuzzStatus,
  type EasebuzzConfig,
} from "./easebuzz.js";
import { resolveBridgeBaseUrl, resolveStorefrontUrl } from "./public-url.js";

const PORT = Number(process.env.PORT ?? 3000);
const BRIDGE_SECRET = process.env.BOSSPAY_BRIDGE_SECRET;
const BRIDGE_BASE_URL = resolveBridgeBaseUrl();
const BOSSPAY_API_BASE =
  process.env.BOSSPAY_API_BASE ?? "https://api.bosspay24.com";

const EASEBUZZ_KEY = process.env.EASEBUZZ_KEY;
const EASEBUZZ_SALT = process.env.EASEBUZZ_SALT;
const EASEBUZZ_URL =
  process.env.EASEBUZZ_URL ?? "https://pay.easebuzz.in";
const EASEBUZZ_STATUS_URL =
  process.env.EASEBUZZ_STATUS_URL ??
  "https://dashboard.easebuzz.in/transaction/v2.1/retrieve";

const easebuzzConfig: EasebuzzConfig | null =
  EASEBUZZ_KEY && EASEBUZZ_SALT
    ? {
        key: EASEBUZZ_KEY,
        salt: EASEBUZZ_SALT,
        payBaseUrl: EASEBUZZ_URL,
        statusUrl: EASEBUZZ_STATUS_URL,
      }
    : null;

const missing = (
  [
    ["BOSSPAY_BRIDGE_SECRET", BRIDGE_SECRET],
    ["BRIDGE_BASE_URL (or COOLIFY_URL / COOLIFY_FQDN)", BRIDGE_BASE_URL],
    ["EASEBUZZ_KEY", EASEBUZZ_KEY],
    ["EASEBUZZ_SALT", EASEBUZZ_SALT],
  ] as const
)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const handlers: BridgeHandlers = {};

if (easebuzzConfig) {
  const ezbConfig = easebuzzConfig;
  handlers.easebuzz = {
    createCollection: async (req: CollectRequest): Promise<CollectResult> => {
      const txnid = req.txn_id;
      const amountRupees = req.amount / 100;
      const email =
        req.customer_email && req.customer_email.includes("@")
          ? req.customer_email
          : "customer@dollerpayx.in";
      const phone =
        (req.customer_phone || "").replace(/\D/g, "").slice(-10) || "9999999999";
      const firstname =
        req.customer_email?.split("@")[0]?.trim() || "Customer";

      const surl = `${BRIDGE_BASE_URL}/api/easebuzz/return?outcome=success`;
      const furl = `${BRIDGE_BASE_URL}/api/easebuzz/return?outcome=failed`;

      const result = await initiateEasebuzzPayment(ezbConfig, {
        txnid,
        amount: amountRupees,
        productinfo: `Order ${txnid}`,
        firstname,
        email,
        phone,
        surl,
        furl,
        udf1: txnid,
      });

      return {
        payment_url: result.checkoutUrl,
        pg_transaction_id: txnid,
        mode: "redirect",
      };
    },

    checkStatus: async (req: StatusRequest): Promise<StatusResult> => {
      const result = await retrieveEasebuzzTransaction(ezbConfig, req.pg_txn_id);
      const normalized = normalizeEasebuzzStatusResponse(result, req.pg_txn_id);
      if (!normalized.success || !normalized.data.length) {
        return { status: "pending", pg_transaction_id: req.pg_txn_id, amount: 0 };
      }
      const row = normalized.data[0] as {
        status?: string;
        amount?: unknown;
        raw?: Record<string, unknown>;
      };
      const amountPaisa = Math.max(0, Math.round(Number(row.amount ?? 0) * 100));
      return {
        status: resolveEasebuzzStatus(String(row.status ?? "")),
        pg_transaction_id: req.pg_txn_id,
        amount: amountPaisa,
        ...(row.raw ? { raw_pg_response: row.raw } : {}),
      };
    },

    isAvailable: async () => true,
  };
}

const txnStore = new MemoryTxnStore();

createBossPayBridge({
  bridgeSecret: BRIDGE_SECRET!,
  bosspayApiBase: BOSSPAY_API_BASE,
  handlers,
  txnStore,
  version: "1.0.0",
});

const bridgeHandler = toExpress({
  ctx: {
    handlers,
    txnStore,
    bosspayApiBase: BOSSPAY_API_BASE,
    version: "1.0.0",
  },
  bridgeSecret: BRIDGE_SECRET!,
});

const app = express();

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "madhu-garments-easebuzz-bridge" });
});

app.use((req, res, next) => {
  const isBridgeRoute = req.path.includes("/bosspay/v1/");
  const isEasebuzzReturn = req.path === "/api/easebuzz/return";

  if (isEasebuzzReturn) {
    express.urlencoded({ extended: true, limit: "1mb" })(req, res, next);
  } else if (isBridgeRoute) {
    express.raw({ type: "*/*", limit: "1mb" })(req, res, next);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  if (req.path.includes("/bosspay/v1/")) {
    return bridgeHandler(req, res, next);
  }
  next();
});

function handleEasebuzzReturn(req: Request, res: Response) {
  const body = (req.body ?? {}) as Record<string, string>;
  const query = req.query as Record<string, string>;
  const txnid =
    body.txnid || body.udf1 || query.txnid || query.collect_ref || "";
  const pgStatus = (body.status || "").toLowerCase();
  const failed =
    query.outcome === "failed" ||
    pgStatus === "failure" ||
    pgStatus === "failed" ||
    pgStatus === "usercancelled";

  const params = new URLSearchParams({ gateway: "easebuzz" });
  if (txnid) {
    params.set("collect_ref", txnid);
    params.set("txnid", txnid);
  }
  if (failed) {
    params.set("status", "failed");
  }

  const storefrontUrl = resolveStorefrontUrl(req);
  const redirectUrl = `${storefrontUrl}/order-success?${params}`;
  console.log(`[easebuzz-return] txnid=${txnid} redirect=${redirectUrl}`);
  res.redirect(302, redirectUrl);
}

app.post("/api/easebuzz/return", handleEasebuzzReturn);
app.get("/api/easebuzz/return", handleEasebuzzReturn);

app.listen(PORT, () => {
  console.log(`Bridge server running on port ${PORT}`);
});
