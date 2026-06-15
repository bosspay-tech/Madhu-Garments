import { NextResponse } from "next/server";
import { initiateEasebuzzPayment } from "@/lib/easebuzz";
import { getEasebuzzConfig, resolveSiteUrl } from "@/lib/easebuzz-config";

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
    const body = await request.json();
    const {
      amount,
      collect_ref,
      display_name,
      txn_note,
      user_ref,
      email,
      phone,
      productinfo,
      surl,
      furl,
      address1,
      city,
      state,
      country,
      zipcode,
    } = body ?? {};

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
    const successUrl = surl || `${siteUrl}/api/easebuzz/return?outcome=success`;
    const failureUrl = furl || `${siteUrl}/api/easebuzz/return?outcome=failed`;

    const result = await initiateEasebuzzPayment(easebuzzConfig, {
      txnid,
      amount: Number(amount),
      productinfo: productinfo || txn_note || `Order ${txnid}`,
      firstname,
      email: customerEmail,
      phone: customerPhone,
      surl: successUrl,
      furl: failureUrl,
      udf1: txnid,
      address1: address1 || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || "India",
      zipcode: zipcode || undefined,
    });

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
