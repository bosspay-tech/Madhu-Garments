import { NextResponse } from "next/server";
import { initiateEasebuzzPayment } from "@/lib/easebuzz";
import { getEasebuzzConfig, resolveSiteUrl } from "@/lib/easebuzz-config";
import {
  buildEasebuzzRequestOptions,
  buildInitiateParamsFromRequest,
  type CreateEasebuzzPaymentRequest,
} from "@/lib/easebuzz-request";

export async function POST(request: Request) {
  const easebuzzConfig = getEasebuzzConfig();

  if (!easebuzzConfig) {
    return NextResponse.json(
      {
        success: false,
        error: "Easebuzz is not configured (EASEBUZZ_KEY, EASEBUZZ_SALT)",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as CreateEasebuzzPaymentRequest;
    const { amount, collect_ref, display_name, email, phone, user_ref, txn_note } = body ?? {};

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }

    const txnid = String(collect_ref || `ORD${Date.now()}`);
    const firstname = String(display_name || "Customer").trim();
    const customerEmail = String(email || "").trim();
    const customerPhone = String(phone || user_ref || "").trim();

    if (!customerEmail) {
      return NextResponse.json({ success: false, error: "Customer email is required" }, { status: 400 });
    }

    if (!customerPhone) {
      return NextResponse.json({ success: false, error: "Customer phone is required" }, { status: 400 });
    }

    const siteUrl = resolveSiteUrl(request);
    const successUrl = body.surl || `${siteUrl}/api/easebuzz/return?outcome=success`;
    const failureUrl = body.furl || `${siteUrl}/api/easebuzz/return?outcome=failed`;

    const params = buildInitiateParamsFromRequest(body, {
      txnid,
      firstname,
      email: customerEmail,
      phone: customerPhone,
      surl: successUrl,
      furl: failureUrl,
      productinfo: txn_note ? String(txn_note) : `Order ${txnid}`,
      amount: Number(amount),
    });

    const result = await initiateEasebuzzPayment(
      easebuzzConfig,
      params,
      buildEasebuzzRequestOptions(body),
    );

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      transactionId: result.accessKey,
      collectRef: result.txnid,
    });
  } catch (error) {
    console.error("easebuzz create-payment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
