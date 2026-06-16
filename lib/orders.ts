import { getSupabase } from "@/lib/supabase";
import { mapEasebuzzStatusToOrderStatus } from "@/lib/order-status";

export async function updateOrderStatus(transactionId: string, status: string) {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("Please log in again to update your order.");
  }

  const response = await fetch("/api/orders/update-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      status,
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to update order status.");
  }

  return result;
}

export async function syncOrderPaymentStatus(transactionId: string) {
  const response = await fetch("/api/easebuzz/payment-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collect_refs: [transactionId] }),
  });

  const result = await response.json();
  if (!result.success || !result.data?.length) {
    return null;
  }

  const paymentStatus = mapEasebuzzStatusToOrderStatus(result.data[0]?.status);
  if (!paymentStatus) {
    return null;
  }

  await updateOrderStatus(transactionId, paymentStatus);
  return paymentStatus;
}
