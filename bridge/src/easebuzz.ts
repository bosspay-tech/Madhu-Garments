import { createHash } from "node:crypto";

export interface EasebuzzConfig {
  key: string;
  salt: string;
  payBaseUrl: string;
  statusUrl: string;
}

export interface InitiateEasebuzzPaymentParams {
  txnid: string;
  amount: number | string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  udf8?: string;
  udf9?: string;
  udf10?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
}

export interface EasebuzzInitiateResult {
  checkoutUrl: string;
  accessKey: string;
  txnid: string;
}

export interface EasebuzzTransaction {
  txnid: string;
  status: string;
  amount: string;
  email?: string;
  phone?: string;
  easepayid?: string;
  error?: string;
  error_Message?: string;
  [key: string]: unknown;
}

export interface EasebuzzRetrieveResponse {
  status: boolean;
  msg?: EasebuzzTransaction[] | string;
}

function sha512(value: string): string {
  return createHash("sha512").update(value).digest("hex").toLowerCase();
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function formatAmount(amount: number | string): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid amount");
  }
  return n.toFixed(2);
}

function buildFieldMap(
  config: EasebuzzConfig,
  params: InitiateEasebuzzPaymentParams,
): Record<string, string> {
  return {
    key: config.key,
    txnid: params.txnid,
    amount: formatAmount(params.amount),
    productinfo: params.productinfo,
    firstname: params.firstname,
    email: params.email,
    phone: params.phone,
    surl: params.surl,
    furl: params.furl,
    udf1: params.udf1 ?? "",
    udf2: params.udf2 ?? "",
    udf3: params.udf3 ?? "",
    udf4: params.udf4 ?? "",
    udf5: params.udf5 ?? "",
    udf6: params.udf6 ?? "",
    udf7: params.udf7 ?? "",
    udf8: params.udf8 ?? "",
    udf9: params.udf9 ?? "",
    udf10: params.udf10 ?? "",
    address1: params.address1 ?? "",
    address2: params.address2 ?? "",
    city: params.city ?? "",
    state: params.state ?? "",
    country: params.country ?? "",
    zipcode: params.zipcode ?? "",
  };
}

export function buildInitiateHash(
  fields: Record<string, string>,
  salt: string,
): string {
  const sequence = [
    "key",
    "txnid",
    "amount",
    "productinfo",
    "firstname",
    "email",
    "udf1",
    "udf2",
    "udf3",
    "udf4",
    "udf5",
    "udf6",
    "udf7",
    "udf8",
    "udf9",
    "udf10",
  ] as const;

  const parts = sequence.map((key) => fields[key] ?? "");
  return sha512(`${parts.join("|")}|${salt}`);
}

export function buildRetrieveHash(
  key: string,
  txnid: string,
  salt: string,
): string {
  return sha512(`${key}|${txnid}|${salt}`);
}

export async function initiateEasebuzzPayment(
  config: EasebuzzConfig,
  params: InitiateEasebuzzPaymentParams,
): Promise<EasebuzzInitiateResult> {
  const fields = buildFieldMap(config, params);
  fields.hash = buildInitiateHash(fields, config.salt);

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== "") body.set(key, value);
  }
  body.set("hash", fields.hash);

  const url = `${normalizeBaseUrl(config.payBaseUrl)}/payment/initiateLink`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const raw = await response.text();
  let data: { status?: number; data?: string; error?: string; msg?: string };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Easebuzz initiate returned non-JSON: ${raw.slice(0, 200)}`);
  }

  if (!response.ok || data.status !== 1 || !data.data) {
    const message =
      data.error || data.msg || raw || "Easebuzz payment initiation failed";
    throw new Error(message);
  }

  const accessKey = data.data;
  const checkoutUrl = `${normalizeBaseUrl(config.payBaseUrl)}/pay/${accessKey}`;

  return {
    checkoutUrl,
    accessKey,
    txnid: params.txnid,
  };
}

export async function retrieveEasebuzzTransaction(
  config: EasebuzzConfig,
  txnid: string,
): Promise<EasebuzzRetrieveResponse> {
  const hash = buildRetrieveHash(config.key, txnid, config.salt);
  const body = new URLSearchParams({
    key: config.key,
    txnid,
    hash,
  });

  const response = await fetch(config.statusUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const raw = await response.text();
  try {
    return JSON.parse(raw) as EasebuzzRetrieveResponse;
  } catch {
    throw new Error(`Easebuzz retrieve returned non-JSON: ${raw.slice(0, 200)}`);
  }
}

export function resolveEasebuzzStatus(
  status?: string,
): "success" | "failed" | "pending" {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "success") return "success";
  // Only genuinely non-terminal states stay pending. Everything else —
  // `dropped` (customer inactivity / no bank response), `bounced`, `failure`,
  // `userCancelled`, etc. — is treated as a terminal failure.
  if (
    normalized === "pending" ||
    normalized === "initiated" ||
    normalized === "in progress"
  ) {
    return "pending";
  }
  return "failed";
}

export function normalizeEasebuzzStatusResponse(
  result: EasebuzzRetrieveResponse,
  txnid: string,
) {
  if (!result.status || !Array.isArray(result.msg) || !result.msg.length) {
    return {
      success: false,
      data: [] as Array<Record<string, unknown>>,
      error:
        typeof result.msg === "string"
          ? result.msg
          : "Transaction not found",
    };
  }

  const match =
    result.msg.find((row) => row.txnid === txnid) ?? result.msg[0] ?? null;

  if (!match) {
    return { success: false, data: [], error: "Transaction not found" };
  }

  return {
    success: true,
    data: [
      {
        collectRef: match.txnid,
        status: (match.status || "").toUpperCase(),
        amount: match.amount,
        easepayid: match.easepayid,
        raw: match,
      },
    ],
  };
}
