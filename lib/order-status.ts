export type OrderStatusValue = "success" | "failed" | "pending" | "placed" | "unknown";

export function normalizeOrderStatus(status?: string | null): OrderStatusValue {
  const value = (status || "").toLowerCase().trim();

  if (value === "success" || value === "paid" || value === "captured") {
    return "success";
  }

  if (
    value === "failed" ||
    value === "failure" ||
    value === "cancelled" ||
    value === "canceled" ||
    value === "usercancelled" ||
    value === "declined"
  ) {
    return "failed";
  }

  if (value === "pending" || value === "processing") {
    return "pending";
  }

  if (value === "placed") {
    return "placed";
  }

  return value ? "unknown" : "pending";
}

export function getOrderStatusLabel(status?: string | null) {
  switch (normalizeOrderStatus(status)) {
    case "success":
      return "Payment successful";
    case "failed":
      return "Payment failed";
    case "pending":
      return "Payment pending";
    case "placed":
      return "Order placed";
    default:
      return "Status unknown";
  }
}

export function mapEasebuzzStatusToOrderStatus(status?: string | null): OrderStatusValue | null {
  const value = (status || "").toUpperCase();

  if (value === "SUCCESS" || value === "CAPTURED") {
    return "success";
  }

  if (
    value === "FAILED" ||
    value === "FAILURE" ||
    value === "DECLINED" ||
    value === "CANCELLED" ||
    value === "USERCANCELLED"
  ) {
    return "failed";
  }

  return null;
}
