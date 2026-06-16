import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { OrderSuccessClient } from "@/components/order-success-client";

export const metadata = {
  title: "Order Status | MADHU GARMENTS",
};

export default function OrderSuccessPage() {
  return (
    <main>
      <Suspense
        fallback={
          <section className="payment-status-page container">
            <div className="payment-status-card payment-status-card--processing">
              <div className="payment-status-icon" aria-hidden="true">
                <LoaderCircle className="payment-status-spinner" />
              </div>
              <h1>Processing payment</h1>
              <p className="payment-status-message">Please wait while we confirm your payment.</p>
            </div>
          </section>
        }
      >
        <OrderSuccessClient />
      </Suspense>
    </main>
  );
}
