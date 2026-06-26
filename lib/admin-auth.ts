import { getSupabaseWithAccessToken } from "@/lib/supabase-server";

export function getAdminEmailSet() {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(emails);
}

export function isAdminEmail(email: string) {
  const adminEmails = getAdminEmailSet();
  if (!adminEmails.size) return false;
  return adminEmails.has(email.trim().toLowerCase());
}

export function getAccessTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export async function getUserFromAccessToken(accessToken: string) {
  const userClient = getSupabaseWithAccessToken(accessToken);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function requireAdminFromRequest(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return { ok: false as const, status: 401, error: "Authentication required." };
  }

  const user = await getUserFromAccessToken(accessToken);
  if (!user) {
    return { ok: false as const, status: 401, error: "Invalid session." };
  }

  if (!isAdminEmail(user.email ?? "")) {
    return { ok: false as const, status: 403, error: "Forbidden." };
  }

  return { ok: true as const, user, accessToken };
}
