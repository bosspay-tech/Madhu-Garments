import type { EasebuzzConfig } from "@/lib/easebuzz";

/** Server-only Easebuzz credentials. Set these in Coolify env (no NEXT_PUBLIC_ prefix). */
export function getEasebuzzConfig(): EasebuzzConfig | null {
  const key = process.env.EASEBUZZ_KEY?.trim();
  const salt = process.env.EASEBUZZ_SALT?.trim();

  if (!key || !salt) {
    return null;
  }

  return {
    key,
    salt,
    payBaseUrl: process.env.EASEBUZZ_URL?.trim() || "https://pay.easebuzz.in",
    statusUrl:
      process.env.EASEBUZZ_STATUS_URL?.trim() ||
      "https://dashboard.easebuzz.in/transaction/v2.1/retrieve",
  };
}

/** Public site URL for Easebuzz return redirects. Prefer SITE_URL in Coolify (runtime, server-only). */
export function resolveSiteUrl(request: Request): string {
  const envUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}