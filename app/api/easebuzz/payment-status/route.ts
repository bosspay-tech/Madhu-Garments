import { NextResponse } from "next/server";
import { normalizeEasebuzzStatusResponse, retrieveEasebuzzTransaction } from "@/lib/easebuzz";
import { getEasebuzzConfig } from "@/lib/easebuzz-config";
import { buildEasebuzzRequestOptions, type PaymentStatusRequest } from "@/lib/easebuzz-request";

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
    const body = (await request.json()) as PaymentStatusRequest;
    const { collect_refs, txnid } = body ?? {};
    const refs = Array.isArray(collect_refs) ? collect_refs : txnid ? [txnid] : [];

    if (!refs.length) {
      return NextResponse.json(
        {
          success: false,
          error: "collect_refs array or txnid is required",
        },
        { status: 400 },
      );
    }

    const primaryTxnId = String(refs[0]);
    const result = await retrieveEasebuzzTransaction(
      easebuzzConfig,
      primaryTxnId,
      buildEasebuzzRequestOptions(body),
    );
    const normalized = normalizeEasebuzzStatusResponse(result, primaryTxnId);

    return NextResponse.json(normalized, { status: normalized.success ? 200 : 404 });
  } catch (error) {
    console.error("easebuzz payment-status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
