import "./env.js";
import express, { type Request, type Response } from "express";
import {
  createBossPayBridge,
  toExpress,
  SupabaseTxnStore,
  type BridgeHandlers,
  type CollectRequest,
  type CollectResult,
  type StatusRequest,
  type StatusResult,
} from "@bosspay/bridge-node";
import { createClient } from "@supabase/supabase-js";
import {
  initiateEasebuzzPayment,
  retrieveEasebuzzTransaction,
  normalizeEasebuzzStatusResponse,
  resolveEasebuzzStatus,
  type EasebuzzConfig,
} from "./easebuzz.js";
import {
  resolveBridgeBaseUrl,
  resolveBridgePublicUrl,
  resolveStorefrontUrl,
} from "./public-url.js";

const PORT = Number(process.env.PORT ?? 3000);
const BRIDGE_SECRET = process.env.BOSSPAY_BRIDGE_SECRET;
const BRIDGE_BASE_URL = process.env.BRIDGE_BASE_URL ?? resolveBridgeBaseUrl();
const BOSSPAY_API_BASE =
  process.env.BOSSPAY_API_BASE ?? "https://api.bosspay24.com";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    ["BRIDGE_BASE_URL", BRIDGE_BASE_URL],
    ["SUPABASE_URL", SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
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

const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const txnStore = new SupabaseTxnStore({ client: supabaseClient });

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

const bridge = createBossPayBridge({
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
    express.json({ limit: "1mb" })(req, res, next);
  }
});

app.use((req, res, next) => {
  if (req.path.includes("/bosspay/v1/")) {
    console.log(`[bridge] ${req.method} ${req.path} → bridgeHandler`);
    return bridgeHandler(req, res, next);
  }
  next();
});

async function handleEasebuzzCreatePayment(req: Request, res: Response) {
  if (!easebuzzConfig) {
    res.status(503).json({
      success: false,
      error: "Easebuzz is not configured (EASEBUZZ_KEY, EASEBUZZ_SALT)",
    });
    return;
  }

  const {
    amount,
    collect_ref,
    display_name,
    txn_note,
    user_ref,
    email,
    phone,
    productinfo,
    surl,
    furl,
    address1,
    city,
    state,
    country,
    zipcode,
  } = req.body ?? {};

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ success: false, error: "Invalid amount" });
    return;
  }

  const txnid = String(collect_ref || `ORD${Date.now()}`);
  const firstname = String(display_name || "Customer").trim();
  const customerEmail = String(email || "").trim();
  const customerPhone = String(phone || user_ref || "").trim();

  if (!customerEmail) {
    res.status(400).json({ success: false, error: "Customer email is required" });
    return;
  }
  if (!customerPhone) {
    res.status(400).json({ success: false, error: "Customer phone is required" });
    return;
  }

  const bridgePublicUrl = resolveBridgePublicUrl(req, PORT);
  const successUrl =
    surl || `${bridgePublicUrl}/api/easebuzz/return?outcome=success`;
  const failureUrl =
    furl || `${bridgePublicUrl}/api/easebuzz/return?outcome=failed`;

  console.log(
    `[easebuzz-create] txnid=${txnid} surl=${successUrl} furl=${failureUrl}`,
  );

  const result = await initiateEasebuzzPayment(easebuzzConfig, {
    txnid,
    amount: Number(amount),
    productinfo: productinfo || txn_note || `Order ${txnid}`,
    firstname,
    email: customerEmail,
    phone: customerPhone,
    surl: successUrl,
    furl: failureUrl,
    udf1: txnid,
    address1: address1 || undefined,
    city: city || undefined,
    state: state || undefined,
    country: country || "India",
    zipcode: zipcode || undefined,
  });

  res.json({
    success: true,
    checkoutUrl: result.checkoutUrl,
    transactionId: result.accessKey,
    collectRef: result.txnid,
  });
}

async function handleEasebuzzPaymentStatus(req: Request, res: Response) {
  if (!easebuzzConfig) {
    res.status(503).json({
      success: false,
      error: "Easebuzz is not configured (EASEBUZZ_KEY, EASEBUZZ_SALT)",
    });
    return;
  }

  const { collect_refs, txnid } = req.body ?? {};
  const refs = Array.isArray(collect_refs)
    ? collect_refs
    : txnid
      ? [txnid]
      : [];

  if (!refs.length) {
    res.status(400).json({
      success: false,
      error: "collect_refs array or txnid is required",
    });
    return;
  }

  const primaryTxnId = String(refs[0]);
  const result = await retrieveEasebuzzTransaction(easebuzzConfig, primaryTxnId);
  const normalized = normalizeEasebuzzStatusResponse(result, primaryTxnId);

  res.status(normalized.success ? 200 : 404).json(normalized);
}

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

app.post("/api/easebuzz/create-payment", async (req, res) => {
  try {
    await handleEasebuzzCreatePayment(req, res);
  } catch (err) {
    console.error("easebuzz create-payment error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

app.post("/api/easebuzz/payment-status", async (req, res) => {
  try {
    await handleEasebuzzPaymentStatus(req, res);
  } catch (err) {
    console.error("easebuzz payment-status error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

app.post("/api/easebuzz/return", handleEasebuzzReturn);
app.get("/api/easebuzz/return", handleEasebuzzReturn);

app.listen(PORT, () => {
  console.log(`Bridge server running on port ${PORT} (api=${BOSSPAY_API_BASE})`);
});