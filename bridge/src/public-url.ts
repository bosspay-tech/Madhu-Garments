import type { Request } from "express";

function firstOrigin(value?: string): string | null {
  if (!value?.trim()) return null;
  const first = value.split(",")[0].trim();
  if (!first) return null;
  if (first.startsWith("http://") || first.startsWith("https://")) {
    return first.replace(/\/+$/, "");
  }
  return `https://${first.replace(/\/+$/, "")}`;
}

function isLocalhostHost(host?: string): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  );
}

function isLocalhost(url: string): boolean {
  try {
    return isLocalhostHost(new URL(url).hostname);
  } catch {
    return url.includes("localhost") || url.includes("127.0.0.1");
  }
}

function requestHost(req: Request): string | null {
  return (
    req.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.get("host") ||
    null
  );
}

function isLocalDevRequest(req: Request): boolean {
  if (isLocalhostHost(requestHost(req) ?? undefined)) return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

function originFromRequest(req: Request): string | null {
  const host = requestHost(req);
  if (!host) return null;

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (req.secure ? "https" : "http");
  const origin = `${proto}://${host}`.replace(/\/+$/, "");

  if (isLocalhost(origin)) return null;
  return origin;
}

function isBossPayApiUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "api.bosspay24.com" || host === "dpxreal.com";
  } catch {
    return url.includes("api.bosspay24.com") || url.includes("dpxreal.com");
  }
}

function resolveFromEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = firstOrigin(process.env[key]);
    if (!value || isLocalhost(value) || isBossPayApiUrl(value)) continue;
    return value;
  }
  return null;
}

/** Bridge public URL at startup (Coolify injects COOLIFY_URL / COOLIFY_FQDN). */
export function resolveBridgeBaseUrl(): string | null {
  const fromEnv = resolveFromEnv(
    "BRIDGE_BASE_URL",
    "BRIDGE_PUBLIC_URL",
    "COOLIFY_URL",
    "PUBLIC_URL",
    "APP_URL",
  );
  if (fromEnv) return fromEnv;

  const coolifyFqdn = process.env.COOLIFY_FQDN?.split(",")[0]?.trim();
  if (coolifyFqdn) {
    return `https://${coolifyFqdn.replace(/\/+$/, "")}`;
  }

  return null;
}

export function resolveBridgePublicUrl(
  req: Request,
  fallbackPort = 3000,
): string {
  if (isLocalDevRequest(req)) {
    const devOverride = firstOrigin(process.env.BRIDGE_PUBLIC_URL);
    if (devOverride && isLocalhost(devOverride)) {
      return devOverride;
    }
    return `http://localhost:${fallbackPort}`;
  }

  return (
    resolveFromEnv(
      "BRIDGE_PUBLIC_URL",
      "BRIDGE_BASE_URL",
      "COOLIFY_URL",
      "PUBLIC_URL",
      "APP_URL",
    ) ??
    originFromRequest(req) ??
    `http://localhost:${fallbackPort}`
  );
}

/** Next.js storefront base (browser redirect after payment). */
export function resolveStorefrontUrl(req: Request): string {
  if (isLocalDevRequest(req)) {
    const devOverride = firstOrigin(process.env.STOREFRONT_URL);
    if (devOverride && isLocalhost(devOverride)) {
      return devOverride;
    }
    return (
      firstOrigin(process.env.STOREFRONT_DEV_URL)?.replace(/\/+$/, "") ??
      firstOrigin(process.env.SITE_URL)?.replace(/\/+$/, "") ??
      "http://localhost:3000"
    );
  }

  return (
    resolveFromEnv(
      "STOREFRONT_URL",
      "SITE_URL",
      "NEXT_PUBLIC_SITE_URL",
      "BRIDGE_BASE_URL",
      "COOLIFY_URL",
      "PUBLIC_URL",
    ) ??
    originFromRequest(req) ??
    "http://localhost:3000"
  );
}
