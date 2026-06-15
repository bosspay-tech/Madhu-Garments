"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { formatCartMoney, useCart } from "@/components/cart-provider";
import { getSupabase } from "@/lib/supabase";
import { createEasebuzzPaymentSession, orderToCustomer, savePaymentSession } from "@/lib/payment";

const ORDER_SELECT =
  "status, total, customer_name, customer_email, customer_phone, customer_address, customer_city, customer_state, customer_pincode";

type OrderRow = {
  status?: string;
  total?: number | string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_pincode?: string;
};

export function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const handledRef = useRef(false);

  const [status, setStatus] = useState<"processing" | "success" | "failed" | "unknown">("processing");
  const [txnId, setTxnId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const checkPayment = async () => {
      try {
        const collectRef =
          searchParams.get("collect_ref") ||
          searchParams.get("collectRef") ||
          searchParams.get("txnid") ||
          searchParams.get("order_id") ||
          sessionStorage.getItem("payment_collect_ref") ||
          "";

        if (!collectRef) {
          setMessage("No payment reference found in the URL.");
          setStatus("failed");
          return;
        }

        setTxnId(collectRef);

        const { data: orderRow } = await getSupabase()
          .from("orders")
          .select(ORDER_SELECT)
          .eq("transaction_id", collectRef)
          .single();

        if (orderRow) {
          setOrder(orderRow as OrderRow);
          setAmount(String(orderRow.total || ""));
        }

        if (searchParams.get("status") === "failed") {
          setStatus("failed");
          setMessage("Payment was not completed.");
          return;
        }

        if (orderRow?.status === "success") {
          clearCart();
          sessionStorage.removeItem("payment_gateway");
          sessionStorage.removeItem("payment_collect_ref");
          setStatus("success");
          return;
        }

        if (orderRow?.status === "failed") {
          setStatus("failed");
          setMessage("Payment was not completed.");
          return;
        }

        const response = await fetch("/api/easebuzz/payment-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collect_refs: [collectRef] }),
        });

        const result = await response.json();

        if (result.success && result.data?.length > 0) {
          const payment = result.data[0];
          const paymentStatus = (payment.status || "").toUpperCase();

          if (paymentStatus === "SUCCESS" || paymentStatus === "CAPTURED") {
            await getSupabase().from("orders").update({ status: "success" }).eq("transaction_id", collectRef);
            clearCart();
            sessionStorage.removeItem("payment_gateway");
            sessionStorage.removeItem("payment_collect_ref");
            setStatus("success");
            return;
          }

          if (
            paymentStatus === "FAILED" ||
            paymentStatus === "FAILURE" ||
            paymentStatus === "DECLINED" ||
            paymentStatus === "CANCELLED" ||
            paymentStatus === "USERCANCELLED"
          ) {
            await getSupabase().from("orders").update({ status: "failed" }).eq("transaction_id", collectRef);
            setStatus("failed");
            setMessage("Payment was not completed.");
            return;
          }
        }

        setStatus("unknown");
      } catch (error) {
        console.error("Error checking payment:", error);
        setMessage(error instanceof Error ? error.message : "Unable to verify payment.");
        setStatus("failed");
      }
    };

    checkPayment();
  }, [clearCart, searchParams]);

  const handleRetryPayment = async () => {
    if (!txnId || !order) {
      setRetryError("Order details not found. Please try checkout again.");
      return;
    }

    const customer = orderToCustomer(order);
    if (!customer.email || !customer.phone || !customer.name) {
      setRetryError("Missing customer details on this order.");
      return;
    }

    try {
      setRetryError("");
      setRetryLoading(true);

      await getSupabase().from("orders").update({ status: "pending" }).eq("transaction_id", txnId);

      const data = await createEasebuzzPaymentSession({
        collectRef: txnId,
        amount: Number(order.total || amount || 0),
        customer,
      });

      if (!data.success || !data.checkoutUrl) {
        throw new Error(data.error || "Failed to create payment");
      }

      savePaymentSession(txnId);
      window.location.href = data.checkoutUrl;
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Could not retry payment.");
      setRetryLoading(false);
    }
  };

  if (status === "processing") {
    return (
      <section className="checkout-empty container">
        <Clock3 />
        <h1>Processing payment</h1>
        <p>Please wait while we confirm your payment with Easebuzz.</p>
      </section>
    );
  }

  const isSuccess = status === "success";
  const isUnknown = status === "unknown";
  const canRetry = !isSuccess && txnId && order;

  return (
    <section className="checkout-empty container">
      {isSuccess ? <CheckCircle2 /> : isUnknown ? <Clock3 /> : <XCircle />}
      <h1>
        {isSuccess ? "Payment successful" : isUnknown ? "Payment status pending" : "Payment failed"}
      </h1>
      <p>
        {isSuccess
          ? "Thank you. Your MADHU GARMENTS order has been placed successfully."
          : isUnknown
            ? "We received a payment response, but the final status could not be confirmed yet. It may take a few moments."
            : message || "Something went wrong with your payment."}
      </p>

      {txnId ? (
        <p>
          Order ref: <strong>{txnId}</strong>
        </p>
      ) : null}

      {amount ? (
        <p>
          Amount: <strong>{formatCartMoney(Number(amount))}</strong>
        </p>
      ) : null}

      {retryError ? <div className="checkout-error">{retryError}</div> : null}

      <div className="account-actions">
        {canRetry ? (
          <button className="place-order-button" disabled={retryLoading} onClick={handleRetryPayment} type="button">
            {retryLoading ? "Redirecting..." : "Retry payment"}
          </button>
        ) : null}
        <Link href="/shop">Continue shopping</Link>
        <Link href="/orders">View my orders</Link>
      </div>
    </section>
  );
}
