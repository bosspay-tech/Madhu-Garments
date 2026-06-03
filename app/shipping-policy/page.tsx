import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Shipping Policy | MADHU GARMENTS",
  description: "Delivery timelines, charges, and shipping information for MADHU GARMENTS orders.",
};

export default function ShippingPolicyPage() {
  return (
    <LegalLayout
      title="Shipping Policy"
      lastUpdated="1 June 2026"
      intro={
        <p>
          We ship across India with trusted courier partners. Here&rsquo;s everything you need to
          know about how and when your MADHU GARMENTS order reaches you.
        </p>
      }
    >
      <h2>1. Processing time</h2>
      <p>
        Orders are processed within <strong>1&ndash;2 business days</strong> of confirmation. Orders
        placed on weekends or public holidays are processed on the next working day.
      </p>

      <h2>2. Delivery time</h2>
      <p>
        Once dispatched, orders are typically delivered within <strong>4&ndash;7 business days</strong>,
        depending on your location. Remote areas may take a little longer.
      </p>

      <h2>3. Shipping charges</h2>
      <ul>
        <li>
          <strong>Free shipping</strong> on all Tamil Nadu orders over Rs. 2,500.
        </li>
        <li>Standard shipping charges, where applicable, are shown at checkout before payment.</li>
      </ul>

      <h2>4. Order tracking</h2>
      <p>
        Once your order ships, we&rsquo;ll share a tracking number by email or SMS so you can follow
        its journey to your doorstep.
      </p>

      <h2>5. Delivery delays</h2>
      <p>
        While we work hard to deliver on time, delays can occasionally occur due to weather,
        courier issues or other circumstances beyond our control. We appreciate your patience and
        will keep you informed.
      </p>

      <h2>6. Incorrect address</h2>
      <p>
        Please ensure your shipping address and contact details are accurate. We are not responsible
        for orders delivered to an incorrect address provided at checkout. If a parcel is returned
        to us due to an incorrect address, re-shipping charges may apply.
      </p>

      <h2>7. Questions</h2>
      <p>
        For any shipping-related queries, reach us at
        <a href="mailto:sales@madhugarments.com"> sales@madhugarments.com</a> or
        <a href="tel:+917845414129"> +91 78454 14129</a>.
      </p>
    </LegalLayout>
  );
}
