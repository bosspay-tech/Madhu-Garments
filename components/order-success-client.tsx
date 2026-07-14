"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";
import { formatCartMoney, useCart } from "@/components/cart-provider";
import { getSupabase } from "@/lib/supabase";
import { createEasebuzzPaymentSession, savePaymentSession } from "@/lib/payment";
import { updateOrderStatus } from "@/lib/orders";
import { generateInvoicePDF } from "@/lib/invoice-generator";

const ORDER_SELECT =
  "id, transaction_id, created_at, status, total, customer_name, customer_email, customer_phone, customer_address, customer_city, customer_state, customer_pincode, billing_same_as_delivery, billing_name, billing_address, billing_city, billing_state, billing_pincode, items";

type OrderRow = {
  id: string;
  transaction_id?: string;
  created_at?: string;
  status?: string;
  total?: number | string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_pincode?: string;
  billing_same_as_delivery?: boolean;
  billing_name?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  items?: any[];
};

type PaymentStatus = "processing" | "success" | "failed" | "unknown";

function shortOrderRef(value: string) {
  return value.length > 12 ? `${value.slice(0, 12)}...` : value;
}

export function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const handledRef = useRef(false);

  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [txnId, setTxnId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState("");

  const handleDownloadInvoice = () => {
    if (!order) return;
    const doc = generateInvoicePDF(order as any);
    const invoiceNo = `INVC-${(order.transaction_id || txnId || order.id).slice(0, 8).toUpperCase()}`;
    doc.save(`${invoiceNo}.pdf`);
  };

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
          setMessage("Your payment was cancelled or could not be completed.");
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
          setMessage("Your payment was cancelled or could not be completed.");
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
            await updateOrderStatus(collectRef, "success");
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
            await updateOrderStatus(collectRef, "failed");
            setStatus("failed");
            setMessage("Your payment was cancelled or could not be completed.");
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

    const customerEmail = order.customer_email?.trim() || "";
    const customerPhone = order.customer_phone?.trim() || "";
    if (!customerEmail || !customerPhone) {
      setRetryError("Missing customer email or phone on this order.");
      return;
    }

    try {
      setRetryError("");
      setRetryLoading(true);

      await updateOrderStatus(txnId, "pending");

      const data = await createEasebuzzPaymentSession({
        collectRef: txnId,
        amount: Number(order.total || amount || 0),
        email: customerEmail,
        phone: customerPhone,
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
      <section className="payment-status-page container">
        <div className="payment-status-card payment-status-card--processing">
          <div className="payment-status-icon" aria-hidden="true">
            <LoaderCircle className="payment-status-spinner" />
          </div>
          <h1>Processing payment</h1>
          <p className="payment-status-message">Please wait while we confirm your payment with Easebuzz.</p>
        </div>
      </section>
    );
  }

  const isSuccess = status === "success";
  const isUnknown = status === "unknown";
  const isFailed = status === "failed";
  const canRetry = !isSuccess && txnId && order;
  const statusClass = isSuccess ? "success" : isUnknown ? "pending" : "failed";

  const title = isSuccess
    ? "Payment successful"
    : isUnknown
      ? "Payment status pending"
      : "Payment failed";

  const description = isSuccess
    ? "Thank you. Your MADHU GARMENTS order has been placed successfully."
    : isUnknown
      ? "We received your payment response, but the final status is still being confirmed. This may take a few moments."
      : message || "Something went wrong with your payment. You can try again safely.";

  const StatusIcon = isSuccess ? CheckCircle2 : isUnknown ? Clock3 : XCircle;

  return (
    <section className="payment-status-page container">
      <div className={`payment-status-card payment-status-card--${statusClass}`}>
        <div className="payment-status-icon" aria-hidden="true">
          <StatusIcon />
        </div>

        <div className="payment-status-copy">
          <span className="payment-status-badge">
            {isSuccess ? "Order confirmed" : isUnknown ? "Awaiting confirmation" : "Payment not completed"}
          </span>
          <h1>{title}</h1>
          <p className="payment-status-message">{description}</p>
        </div>

        {txnId || amount ? (
          <div className="payment-status-summary">
            {txnId ? (
              <div>
                <span>Order reference</span>
                <strong title={txnId}>{shortOrderRef(txnId)}</strong>
              </div>
            ) : null}
            {amount ? (
              <div>
                <span>Amount</span>
                <strong>{formatCartMoney(Number(amount))}</strong>
              </div>
            ) : null}
          </div>
        ) : null}

        {isFailed ? (
          <ul className="payment-status-tips">
            <li>Your cart is still saved and no amount was charged.</li>
            <li>You can retry payment using the same order reference.</li>
            <li>If money was deducted, it will be reversed automatically by your bank.</li>
          </ul>
        ) : null}

        {retryError ? <div className="payment-status-error">{retryError}</div> : null}

        <div className="payment-status-actions">
          {isSuccess && order && (
            <button
              className="payment-status-primary"
              onClick={handleDownloadInvoice}
              style={{ background: "#1f2937", color: "white", width: "100%", marginBottom: "12px", border: "none", cursor: "pointer" }}
              type="button"
            >
              Download Invoice PDF
            </button>
          )}
          {canRetry ? (
            <button
              className="payment-status-primary"
              disabled={retryLoading}
              onClick={handleRetryPayment}
              type="button"
            >
              {retryLoading ? "Redirecting to payment..." : "Retry payment"}
            </button>
          ) : null}

          <div className="payment-status-secondary">
            <Link className="payment-status-link" href="/shop">
              Continue shopping
            </Link>
            <Link className="payment-status-link payment-status-link--outline" href="/orders">
              View my orders
            </Link>
          </div>
        </div>

        {!isSuccess ? (
          <p className="payment-status-help">
            Need help? <Link href="/contact">Contact support</Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
