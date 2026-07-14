import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";
import { PRODUCT_STORE_ID } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) {
      return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
    }

    const client = getSupabaseAdmin() ?? getSupabase();
    const { data: orders, error: ordersError } = await client
      .from("orders")
      .select("*")
      .eq("store_id", PRODUCT_STORE_ID)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Database error loading admin orders:", ordersError);
      return NextResponse.json({ success: false, error: ordersError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (error) {
    console.error("Admin orders GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
