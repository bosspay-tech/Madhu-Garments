import { getSupabaseWithAccessToken } from "@/lib/supabase-server";

function getAdminEmailSet() {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(emails);
}

export function getAccessTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export async function getUserFromAccessToken(accessToken: string) {
  if (!accessToken) return null;

  const userClient = getSupabaseWithAccessToken(accessToken);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) return null;
  return user;
}

export function isAdminEmail(email: string) {
  const adminEmails = getAdminEmailSet();
  if (!adminEmails.size) return false;
  return adminEmails.has(email.trim().toLowerCase());
}
