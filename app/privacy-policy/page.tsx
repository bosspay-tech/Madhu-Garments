import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy | MADHU GARMENTS",
  description: "How MADHU GARMENTS collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="1 June 2026"
      intro={
        <p>
          Your privacy matters to us. This policy explains what information MADHU GARMENTS collects,
          how we use it, and the choices you have regarding your personal data.
        </p>
      }
    >
      <h2>1. Information we collect</h2>
      <p>We may collect the following information when you use our website or place an order:</p>
      <ul>
        <li>Contact details such as your name, email address, phone number and shipping address.</li>
        <li>Order and payment information required to process and deliver your purchase.</li>
        <li>Account details, including your login email and order history.</li>
        <li>Technical data such as your IP address, browser type and pages visited.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Process orders, payments and deliveries.</li>
        <li>Provide customer support and respond to your enquiries.</li>
        <li>Send order updates and, with your consent, promotional offers.</li>
        <li>Improve our website, products and overall shopping experience.</li>
      </ul>

      <h2>3. Payment security</h2>
      <p>
        Payments are handled by trusted third-party payment gateways. We do not store your card or
        banking details. All transactions are encrypted to keep your information safe.
      </p>

      <h2>4. Sharing your information</h2>
      <p>
        We do not sell your personal data. We share information only with service providers who help
        us operate our business &mdash; such as courier partners and payment processors &mdash; and
        only to the extent necessary to fulfil your order or comply with the law.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Our website uses cookies to remember your preferences, keep your cart active and understand
        how the site is used. You can disable cookies in your browser settings, though some features
        may not work as intended.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal data at any time. To
        do so, contact us using the details on this page. You can also unsubscribe from marketing
        emails using the link in any such message.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We retain your information only as long as necessary to provide our services and to meet
        legal, accounting or reporting requirements.
      </p>

      <h2>8. Updates to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be posted on this page
        with a revised &ldquo;last updated&rdquo; date.
      </p>
    </LegalLayout>
  );
}
