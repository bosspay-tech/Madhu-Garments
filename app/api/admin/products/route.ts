import { NextResponse } from "next/server";
import { getAdminProducts } from "@/lib/admin-products";
import { getSupabaseWithAccessToken } from "@/lib/supabase-server";

function getAdminEmailSet() {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set(emails);
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const userClient = getSupabaseWithAccessToken(accessToken);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Invalid session." }, { status: 401 });
    }

    const adminEmails = getAdminEmailSet();
    const userEmail = (user.email ?? "").toLowerCase();

    // If no admin emails are configured, deny access (safer default).
    if (!adminEmails.size || !adminEmails.has(userEmail)) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const products = await getAdminProducts();
    return NextResponse.json({ success: true, products }, { status: 200 });
  } catch (error) {
    console.error("admin products error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

