import { getBridgeFetchHandler } from "@/lib/dpx-bridge";

// The bridge verifies an HMAC signature over the raw body and must run on Node
// (uses node:crypto + the Supabase client), never the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catch-all for the DollerpayX bridge namespace:
 *   GET  /bosspay/v1/health
 *   GET  /bosspay/v1/status/:pgTxnId
 *   POST /bosspay/v1/collect
 *
 * `createWebFetchHandler` matches the route by pathname suffix and verifies the
 * signature, so we just forward the raw Request and return its Response.
 */
async function handle(req: Request): Promise<Response> {
  return getBridgeFetchHandler()(req);
}

export const GET = handle;
export const POST = handle;
