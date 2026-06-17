/**
 * DollerpayX bridge, folded into the Next.js app.
 *
 * Instead of running a second Express service and proxying `/bosspay/v1/*` to
 * it (the source of every "bridge not reachable" failure), the bridge runs
 * *inside* this Next.js app via `createWebFetchHandler` from
 * `@bosspay/bridge-node`. DollerpayX calls `https://<domain>/bosspay/v1/*`
 * directly and it is handled here — one service, one domain, one deploy.
 *
 * Required server-only env (Coolify → Environment Variables):
 *   - BOSSPAY_BRIDGE_SECRET   (same value as the lender PG `bridge_secret` in DPX admin)
 *   - BOSSPAY_API_BASE        (DPX callback base; defaults to the live host)
 *   - EASEBUZZ_KEY / EASEBUZZ_SALT
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  (optional — persistent txn store)
 */
import {
  createWebFetchHandler,
  MemoryTxnStore,
  SupabaseTxnStore,
  type BridgeHandlers,
  type CollectRequest,
  type CollectResult,
  type HandlerContext,
  type StatusRequest,
  type StatusResult,
  type TxnStore,
} from "@bosspay/bridge-node";
import { createClient } from "@supabase/supabase-js";
import { getEasebuzzConfig } from "./easebuzz-config";
import {
  initiateEasebuzzPayment,
  normalizeEasebuzzStatusResponse,
  retrieveEasebuzzTransaction,
} from "./easebuzz";

const DEFAULT_API_BASE = "https://dpxreal.com/backend-api";

/**
 * Easebuzz status → DPX status.
 *
 * NOTE: this intentionally does NOT reuse `resolveEasebuzzStatus` from
 * `lib/easebuzz.ts`, which maps unknown/`dropped`/`bounced` to `pending` (the
 * storefront's own checkout tolerates that). For DPX, only genuinely
 * non-terminal states stay pending; everything else — `dropped` (timeout),
 * `bounced`, `failure`, `userCancelled` — is a TERMINAL FAILURE, otherwise
 * dropped txns get polled forever.
 */
function resolveBridgeStatus(status?: string): "success" | "failed" | "pending" {
  const n = (status || "").trim().toLowerCase();
  if (n === "success") return "success";
  if (n === "pending" || n === "initiated" || n === "in progress") {
    return "pending";
  }
  return "failed";
}

function resolveStorefrontOrigin(): string {
  const url = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  return url.replace(/\/+$/, "");
}

function buildTxnStore(): TxnStore {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return new SupabaseTxnStore({ client });
  }
  // Fallback keeps the bridge functional (collect/status are poll-based and do
  // not depend on the store); push-callback resolution just won't survive a
  // restart without Supabase configured.
  return new MemoryTxnStore();
}

function buildEasebuzzHandlers(): BridgeHandlers {
  const ezb = getEasebuzzConfig();
  if (!ezb) return {};

  const handlers: BridgeHandlers = {
    easebuzz: {
      createCollection: async (req: CollectRequest): Promise<CollectResult> => {
        const txnid = req.txn_id;
        const amountRupees = req.amount / 100;
        const email =
          req.customer_email && req.customer_email.includes("@")
            ? req.customer_email
            : "customer@dollerpayx.in";
        const phone =
          (req.customer_phone || "").replace(/\D/g, "").slice(-10) ||
          "9999999999";
        const firstname =
          req.customer_email?.split("@")[0]?.trim() || "Customer";

        const origin = resolveStorefrontOrigin();
        const surl = `${origin}/api/easebuzz/return?outcome=success`;
        const furl = `${origin}/api/easebuzz/return?outcome=failed`;

        const result = await initiateEasebuzzPayment(ezb, {
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

        // Return only the Easebuzz payment LINK — DollerpayX mints the UPI
        // deeplink itself from the access_key in this URL.
        return {
          payment_url: result.checkoutUrl,
          pg_transaction_id: txnid,
          mode: "redirect",
        };
      },

      checkStatus: async (req: StatusRequest): Promise<StatusResult> => {
        const result = await retrieveEasebuzzTransaction(ezb, req.pg_txn_id);
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
          status: resolveBridgeStatus(String(row.status ?? "")),
          pg_transaction_id: req.pg_txn_id,
          amount: amountPaisa,
          ...(row.raw ? { raw_pg_response: row.raw } : {}),
        };
      },

      isAvailable: async () => true,
    },
  };

  return handlers;
}

let cachedHandler: ((req: Request) => Promise<Response>) | null = null;

/** Lazily-built singleton bridge handler (reads env at first request). */
export function getBridgeFetchHandler(): (req: Request) => Promise<Response> {
  if (cachedHandler) return cachedHandler;

  const bridgeSecret = process.env.BOSSPAY_BRIDGE_SECRET;
  if (!bridgeSecret) {
    throw new Error("BOSSPAY_BRIDGE_SECRET is not set");
  }

  const ctx: HandlerContext = {
    handlers: buildEasebuzzHandlers(),
    txnStore: buildTxnStore(),
    bosspayApiBase: process.env.BOSSPAY_API_BASE ?? DEFAULT_API_BASE,
    version: "1.0.0",
  };

  cachedHandler = createWebFetchHandler({ ctx, bridgeSecret });
  return cachedHandler;
}
