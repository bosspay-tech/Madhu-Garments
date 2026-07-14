import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";
import { requireAdminFromRequest } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const admin = await requireAdminFromRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
    }

    const { txn_id, random_address } = await req.json();
    if (!txn_id || !random_address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin() ?? getSupabase();

    // 1. Get the current transaction
    const { data: txn, error: getError } = await supabase
      .from("bosspay_txns")
      .select("gateway_payload")
      .eq("txn_id", txn_id)
      .single();

    if (getError || !txn) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    let payload = txn.gateway_payload;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        payload = {};
      }
    } else if (!payload) {
      payload = {};
    }

    // 2. Save the random address and update invoice status
    payload.random_address = random_address;
    payload.invoice_status = "issued";

    const { error: updateError } = await supabase
      .from("bosspay_txns")
      .update({ gateway_payload: payload })
      .eq("txn_id", txn_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
