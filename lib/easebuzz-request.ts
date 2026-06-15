import type { EasebuzzRequestOptions, InitiateEasebuzzPaymentParams } from "@/lib/easebuzz";

const UDF_KEYS = ["udf1", "udf2", "udf3", "udf4", "udf5", "udf6", "udf7", "udf8", "udf9", "udf10"] as const;

const OPTIONAL_EASEBUZZ_KEYS = [
  "show_payment_mode",
  "sub_merchant_id",
  "request_flow",
  "split_payments",
  "customer_authentication_id",
  "final_collection_date",
] as const;

export type CreateEasebuzzPaymentRequest = {
  amount?: number | string;
  collect_ref?: string;
  display_name?: string;
  txn_note?: string;
  user_ref?: string;
  email?: string;
  phone?: string;
  productinfo?: string;
  surl?: string;
  furl?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  headers?: Record<string, string>;
  extra_fields?: Record<string, string>;
} & Partial<Record<(typeof UDF_KEYS)[number], string>> &
  Partial<Record<(typeof OPTIONAL_EASEBUZZ_KEYS)[number], string>>;

export type PaymentStatusRequest = {
  collect_refs?: string[];
  txnid?: string;
  headers?: Record<string, string>;
};

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const entries = Object.entries(value).flatMap(([key, fieldValue]) => {
    if (typeof fieldValue !== "string") return [];
    const trimmed = fieldValue.trim();
    return trimmed ? [[key, trimmed] as const] : [];
  });

  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function buildEasebuzzRequestOptions(body: {
  headers?: Record<string, string>;
}): EasebuzzRequestOptions | undefined {
  const headers = asStringRecord(body.headers);
  return headers ? { headers } : undefined;
}

export function buildInitiateParamsFromRequest(
  body: CreateEasebuzzPaymentRequest,
  defaults: {
    txnid: string;
    firstname: string;
    email: string;
    phone: string;
    surl: string;
    furl: string;
    productinfo: string;
    amount: number;
  },
): InitiateEasebuzzPaymentParams {
  const params: InitiateEasebuzzPaymentParams = {
    txnid: defaults.txnid,
    amount: defaults.amount,
    productinfo: asString(body.productinfo) || defaults.productinfo,
    firstname: asString(body.display_name) || defaults.firstname,
    email: asString(body.email) || defaults.email,
    phone: asString(body.phone) || asString(body.user_ref) || defaults.phone,
    surl: asString(body.surl) || defaults.surl,
    furl: asString(body.furl) || defaults.furl,
    udf1: asString(body.udf1) || defaults.txnid,
    address1: asString(body.address1),
    address2: asString(body.address2),
    city: asString(body.city),
    state: asString(body.state),
    country: asString(body.country) || "India",
    zipcode: asString(body.zipcode),
    extraFields: asStringRecord(body.extra_fields),
  };

  for (const key of UDF_KEYS) {
    const value = asString(body[key]);
    if (value) params[key] = value;
  }

  for (const key of OPTIONAL_EASEBUZZ_KEYS) {
    const value = asString(body[key]);
    if (value) params[key] = value;
  }

  return params;
}
