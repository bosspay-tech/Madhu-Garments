export async function createEasebuzzPaymentSession({
  collectRef,
  amount,
  email,
  phone,
}: {
  collectRef: string;
  amount: number;
  email: string;
  phone: string;
}) {
  const response = await fetch("/api/easebuzz/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      collect_ref: collectRef,
      email,
      phone,
    }),
  });

  return response.json();
}

export function savePaymentSession(collectRef: string) {
  sessionStorage.setItem("payment_gateway", "easebuzz");
  sessionStorage.setItem("payment_collect_ref", collectRef);
}
