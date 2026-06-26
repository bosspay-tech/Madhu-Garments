import { initiateEasebuzzPayment } from "@/lib/easebuzz";
import { getEasebuzzConfig, resolveSiteUrl } from "@/lib/easebuzz-config";
import { buildEasebuzzRequestOptions, buildInitiateParamsFromRequest } from "@/lib/easebuzz-request";

export async function createEasebuzzPaymentSession({
  collectRef,
  amount,
  email,
  phone,
  request,
}: {
  collectRef: string;
  amount: number;
  email: string;
  phone: string;
  request: Request;
}) {
  const easebuzzConfig = getEasebuzzConfig();

  if (!easebuzzConfig) {
    return {
      success: false as const,
      error: "Easebuzz is not configured (EASEBUZZ_KEY, EASEBUZZ_SALT)",
    };
  }

  const txnid = collectRef;
  const siteUrl = resolveSiteUrl(request);
  const successUrl = `${siteUrl}/api/easebuzz/return?outcome=success`;
  const failureUrl = `${siteUrl}/api/easebuzz/return?outcome=failed`;

  const params = buildInitiateParamsFromRequest(
    { amount, collect_ref: collectRef, email, phone },
    {
      txnid,
      firstname: "Customer",
      email,
      phone,
      surl: successUrl,
      furl: failureUrl,
      productinfo: `Order ${txnid}`,
      amount,
    },
  );

  const result = await initiateEasebuzzPayment(easebuzzConfig, params, buildEasebuzzRequestOptions({}));

  return {
    success: true as const,
    checkoutUrl: result.checkoutUrl,
    collectRef: result.txnid,
  };
}
