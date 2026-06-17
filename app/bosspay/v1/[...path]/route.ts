import { getBridgeFetchHandler } from "@/lib/dpx-bridge";

// DollerpayX's WordPress bridge adapter calls the bridge under the `/wp-json/`
// prefix (e.g. `${base}/wp-json/bosspay/v1/health|collect|status/:id`).
// The package's web-fetch matcher already accepts that prefix; this route just
// exposes the path so Next.js dispatches it to the same handler as `/bosspay/v1/*`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  return getBridgeFetchHandler()(req);
}

export const GET = handle;
export const POST = handle;