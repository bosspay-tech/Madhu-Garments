import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin-auth";
import { createEasebuzzPaymentSession } from "@/lib/payment-server";
import { getSupabaseWithAccessToken } from "@/lib/supabase-server";
import { PRODUCT_STORE_ID } from "@/lib/store";

type PaymentLinkRequest = {
  items?: unknown[];
  total?: number;
  shippingDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

export async function POST(request: Request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) {
      return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
    }

    const body = (await request.json()) as PaymentLinkRequest;
    const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total || 0);
    const shipping = body.shippingDetails ?? {};

    if (!items.length || total <= 0) {
      return NextResponse.json({ success: false, error: "Invalid checkout details." }, { status: 400 });
    }

    const customerName = `${String(shipping.firstName || "").trim()} ${String(shipping.lastName || "").trim()}`.trim();
    const customerEmail = String(shipping.email || "").trim();
    const customerPhone = String(shipping.phone || "").trim();

    if (!customerName || !customerEmail || !customerPhone) {
      return NextResponse.json({ success: false, error: "Customer name, email, and phone are required." }, { status: 400 });
    }

    const collectRef = `ORD${Date.now()}`;
    const userClient = getSupabaseWithAccessToken(admin.accessToken);

    const { error: insertError } = await userClient.from("orders").insert({
      store_id: PRODUCT_STORE_ID,
      user_id: admin.user.id,
      items,
      total,
      transaction_id: collectRef,
      status: "pending",
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_address: String(shipping.street || "").trim(),
      customer_city: String(shipping.city || "").trim(),
      customer_state: String(shipping.state || "").trim(),
      customer_pincode: String(shipping.pincode || "").trim(),
    });

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    const payment = await createEasebuzzPaymentSession({
      collectRef,
      amount: total,
      email: customerEmail,
      phone: customerPhone,
      request,
    });

    if (!payment.success || !payment.checkoutUrl) {
      await userClient.from("orders").update({ status: "failed" }).eq("transaction_id", collectRef);
      return NextResponse.json(
        { success: false, error: payment.error || "Failed to create payment link." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: payment.checkoutUrl,
      collectRef,
    });
  } catch (error) {
    console.error("admin payment-link error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
