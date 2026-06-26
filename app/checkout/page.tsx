import { Suspense } from "react";
import { CheckoutClient } from "@/components/checkout-client";

export const metadata = {
  title: "Checkout | MADHU GARMENTS",
};

export default function CheckoutPage() {
  return (
    <main>
      <Suspense
        fallback={
          <section className="checkout-empty container">
            <h1>Loading checkout...</h1>
          </section>
        }
      >
        <CheckoutClient />
      </Suspense>
    </main>
  );
}
