export type PaymentCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export async function createEasebuzzPaymentSession({
  collectRef,
  amount,
  customer,
}: {
  collectRef: string;
  amount: number;
  customer: PaymentCustomer;
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
      txn_note: `Order ${collectRef}`,
      productinfo: `MADHU GARMENTS order ${collectRef}`,
      address1: customer.address,
      city: customer.city,
      state: customer.state,
      zipcode: customer.pincode,
      country: "India",
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
