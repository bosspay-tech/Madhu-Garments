import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Refund and Returns Policy | MADHU GARMENTS",
  description: "Our policy on returns, exchanges, and refunds for orders placed with MADHU GARMENTS.",
};

export default function RefundAndReturnsPolicyPage() {
  return (
    <LegalLayout
      title="Refund and Returns Policy"
      lastUpdated="1 June 2026"
      intro={
        <p>
          We want you to love what you ordered. If something isn&rsquo;t right, here&rsquo;s how
          returns, exchanges and refunds work at MADHU GARMENTS.
        </p>
      }
    >
      <h2>1. Return window</h2>
      <p>
        You may request a return or exchange within <strong>7 days</strong> of receiving your order.
        To be eligible, items must be unused, unwashed and in their original condition with all tags
        and packaging intact.
      </p>

      <h2>2. Items that cannot be returned</h2>
      <ul>
        <li>Products marked as final sale or clearance.</li>
        <li>Items damaged due to misuse, washing or normal wear after delivery.</li>
        <li>Innerwear and other items excluded for hygiene reasons.</li>
      </ul>

      <h2>3. How to request a return</h2>
      <p>
        Email us at <a href="mailto:sales@madhugarments.com">sales@madhugarments.com</a> or call
        <a href="tel:+917845414129"> +91 78454 14129</a> with your order number and the reason for
        the return. Our team will guide you through the next steps and share the return address.
      </p>

      <h2>4. Exchanges</h2>
      <p>
        If you need a different size or colour, we&rsquo;ll happily arrange an exchange subject to
        availability. If the item is unavailable, we&rsquo;ll issue a refund instead.
      </p>

      <h2>5. Refunds</h2>
      <p>
        Once we receive and inspect your returned item, we&rsquo;ll notify you of the approval of
        your refund. Approved refunds are processed to your original payment method within
        <strong> 5&ndash;7 business days</strong>. Depending on your bank, it may take additional
        time to reflect in your account.
      </p>

      <h2>6. Damaged or wrong items</h2>
      <p>
        If you receive a damaged, defective or incorrect product, please contact us within 48 hours
        of delivery with photos. We&rsquo;ll arrange a replacement or full refund at no extra cost
        to you.
      </p>

      <h2>7. Shipping costs</h2>
      <p>
        Original shipping charges are non-refundable unless the return is due to our error. Return
        shipping costs may be borne by the customer except in cases of damaged or incorrect items.
      </p>
    </LegalLayout>
  );
}
