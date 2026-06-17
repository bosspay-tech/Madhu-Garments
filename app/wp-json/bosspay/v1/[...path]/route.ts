import { getBridgeFetchHandler } from "@/lib/dpx-bridge";

// DollerpayX's WordPress bridge adapter calls the bridge under `/wp-json/bosspay/v1/*`.
// The package's web-fetch matcher accepts that prefix; this route exposes it in Next.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  return getBridgeFetchHandler()(req);
}

export const GET = handle;
export const POST = handle;
