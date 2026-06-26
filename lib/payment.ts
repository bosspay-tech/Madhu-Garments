export async function createEasebuzzPaymentSession({
  collectRef,
  amount,
  email,
  phone,
  address,
}: {
  collectRef: string;
  amount: number;
  email: string;
  phone: string;
  address?: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
}) {
  const response = await fetch("/api/easebuzz/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      collect_ref: collectRef,
      email,
      phone,
      ...(address
        ? {
            display_name: address.name,
            address1: address.street,
            city: address.city,
            state: address.state,
            zipcode: address.pincode,
            country: "India",
          }
        : {}),
    }),
  });

  return response.json();
}

export function savePaymentSession(collectRef: string) {
  sessionStorage.setItem("payment_gateway", "easebuzz");
  sessionStorage.setItem("payment_collect_ref", collectRef);
}
