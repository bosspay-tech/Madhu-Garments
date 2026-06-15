import { NextRequest, NextResponse } from "next/server";
import { resolveSiteUrl } from "@/lib/easebuzz-config";

function buildRedirectUrl(request: NextRequest, body: Record<string, string>) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const txnid = body.txnid || body.udf1 || query.txnid || query.collect_ref || "";
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

  const siteUrl = resolveSiteUrl(request);
  return `${siteUrl}/order-success?${params}`;
}

export async function GET(request: NextRequest) {
  const redirectUrl = buildRedirectUrl(request, {});
  return NextResponse.redirect(redirectUrl, 302);
}

export async function POST(request: NextRequest) {
  let body: Record<string, string> = {};

  try {
    const formData = await request.formData();
    body = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
    );
  } catch {
    body = {};
  }

  const redirectUrl = buildRedirectUrl(request, body);
  return NextResponse.redirect(redirectUrl, 302);
}
