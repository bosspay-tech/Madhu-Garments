export type PaymentCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export type EasebuzzPaymentExtras = {
  productinfo?: string;
  txn_note?: string;
  address2?: string;
  country?: string;
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
  show_payment_mode?: string;
  sub_merchant_id?: string;
  request_flow?: string;
  split_payments?: string;
  customer_authentication_id?: string;
  final_collection_date?: string;
  extra_fields?: Record<string, string>;
  headers?: Record<string, string>;
};

export async function createEasebuzzPaymentSession({
  collectRef,
  amount,
  customer,
  extras,
}: {
  collectRef: string;
  amount: number;
  customer: PaymentCustomer;
  extras?: EasebuzzPaymentExtras;
}) {
  const response = await fetch("/api/easebuzz/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      collect_ref: collectRef,
      display_name: customer.name,
      email: customer.email,
      phone: customer.phone,
      user_ref: customer.phone,
      txn_note: extras?.txn_note ?? `Order ${collectRef}`,
      productinfo: extras?.productinfo ?? `MADHU GARMENTS order ${collectRef}`,
      address1: customer.address,
      address2: extras?.address2,
      city: customer.city,
      state: customer.state,
      zipcode: customer.pincode,
      country: extras?.country ?? "India",
      udf1: extras?.udf1,
      udf2: extras?.udf2,
      udf3: extras?.udf3,
      udf4: extras?.udf4,
      udf5: extras?.udf5,
      udf6: extras?.udf6,
      udf7: extras?.udf7,
      udf8: extras?.udf8,
      udf9: extras?.udf9,
      udf10: extras?.udf10,
      show_payment_mode: extras?.show_payment_mode,
      sub_merchant_id: extras?.sub_merchant_id,
      request_flow: extras?.request_flow,
      split_payments: extras?.split_payments,
      customer_authentication_id: extras?.customer_authentication_id,
      final_collection_date: extras?.final_collection_date,
      extra_fields: extras?.extra_fields,
      headers: extras?.headers,
    }),
  });

  return response.json();
}

export function savePaymentSession(collectRef: string) {
  sessionStorage.setItem("payment_gateway", "easebuzz");
  sessionStorage.setItem("payment_collect_ref", collectRef);
}

export function orderToCustomer(order: {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_pincode?: string;
}): PaymentCustomer {
  return {
    name: order.customer_name || "",
    email: order.customer_email || "",
    phone: order.customer_phone || "",
    address: order.customer_address || "",
    city: order.customer_city || "",
    state: order.customer_state || "",
    pincode: order.customer_pincode || "",
  };
}
