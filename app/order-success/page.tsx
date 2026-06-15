import { Suspense } from "react";
import { OrderSuccessClient } from "@/components/order-success-client";

export const metadata = {
  title: "Order Status | MADHU GARMENTS",
};

export default function OrderSuccessPage() {
  return (
    <main>
      <Suspense
        fallback={
          <section className="checkout-empty container">
            <h1>Processing payment</h1>
            <p>Please wait while we confirm your payment.</p>
          </section>
        }
      >
        <OrderSuccessClient />
      </Suspense>
    </main>
  );
}
