import { NextResponse } from "next/server";
import { normalizeOrderStatus } from "@/lib/order-status";
import { getSupabaseAdmin, getSupabaseWithAccessToken } from "@/lib/supabase-server";

const ALLOWED_STATUSES = new Set(["success", "failed", "pending", "placed"]);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const transactionId = String(body?.transaction_id || "").trim();
    const status = normalizeOrderStatus(body?.status);

    if (!transactionId) {
      return NextResponse.json({ success: false, error: "transaction_id is required." }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: "Invalid order status." }, { status: 400 });
    }

    const userClient = getSupabaseWithAccessToken(accessToken);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Invalid session." }, { status: 401 });
    }

    const { data: order, error: orderError } = await userClient
      .from("orders")
      .select("id, user_id, transaction_id")
      .eq("transaction_id", transactionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ success: false, error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const admin = getSupabaseAdmin();
    const writeClient = admin ?? userClient;

    const { error: updateError } = await writeClient
      .from("orders")
      .update({ status })
      .eq("transaction_id", transactionId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("orders update-status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
