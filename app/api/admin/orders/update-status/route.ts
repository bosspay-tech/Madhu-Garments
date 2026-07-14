import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) {
      return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
    }

    const body = await request.json();
    const orderId = String(body?.order_id || "").trim();
    
    if (!orderId) {
      return NextResponse.json({ success: false, error: "order_id is required." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    
    if (body.status !== undefined) {
      updatePayload.status = String(body.status).trim();
    }
    if (body.order_status !== undefined) {
      updatePayload.order_status = String(body.order_status).trim();
    }
    if (body.invoice_status !== undefined) {
      updatePayload.invoice_status = String(body.invoice_status).trim();
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update." }, { status: 400 });
    }

    const client = getSupabaseAdmin() ?? getSupabase();
    
    // Attempt update with error catching for missing columns
    const { data: updatedOrder, error: updateError } = await runOrderUpdate(client, orderId, updatePayload);

    if (updateError) {
      console.error("Error updating order status:", updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updatedOrder }, { status: 200 });
  } catch (error) {
    console.error("Admin order update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

async function runOrderUpdate(
  client: any,
  id: string,
  update: Record<string, any>
) {
  const payload = { ...update };
  
  // Try updating with everything first
  const { data, error } = await client
    .from("orders")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (!error) {
    return { data, error: null };
  }

  // Check if error is due to missing columns (order_status or invoice_status)
  const errMsg = error.message || "";
  if (errMsg.includes("column") || errMsg.includes("does not exist") || error.code === "42703") {
    console.warn("Custom order/invoice status columns not found in database. Retrying with basic status update.");
    
    const fallbackPayload: Record<string, any> = {};
    if ("status" in payload) {
      fallbackPayload.status = payload.status;
    }
    
    if (Object.keys(fallbackPayload).length === 0) {
      return { data: null, error: { message: "Custom columns do not exist. Please run migration." } };
    }

    const { data: fallbackData, error: fallbackError } = await client
      .from("orders")
      .update(fallbackPayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    return { data: fallbackData, error: fallbackError };
  }

  return { data: null, error };
}
