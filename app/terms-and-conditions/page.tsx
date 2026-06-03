import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms & Conditions | MADHU GARMENTS",
  description: "The terms and conditions that govern your use of the MADHU GARMENTS website and purchases.",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      lastUpdated="1 June 2026"
      intro={
        <p>
          Welcome to MADHU GARMENTS. By accessing our website or placing an order, you agree to the
          terms set out below. Please read them carefully before using our services.
        </p>
      }
    >
      <h2>1. About us</h2>
      <p>
        This website is operated by MADHU GARMENTS, a clothing business based in Tiruppur, Tamil
        Nadu, India (GST 33CFEPM5936E1ZJ, UDYAM-TN-28-0018044). Throughout the site the terms
        &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; refer to MADHU GARMENTS.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years of age, or accessing the site under the supervision of a
        parent or legal guardian, to place an order with us. By placing an order you confirm that
        the information you provide is accurate and complete.
      </p>

      <h2>3. Products &amp; pricing</h2>
      <p>
        We make every effort to display product colours, descriptions and prices as accurately as
        possible. Slight variations in colour may occur due to screen settings. All prices are
        listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated
        otherwise. We reserve the right to correct pricing errors and to update or discontinue any
        product without prior notice.
      </p>

      <h2>4. Orders &amp; acceptance</h2>
      <p>
        An order is confirmed only once you receive an order confirmation from us. We reserve the
        right to refuse or cancel any order due to stock unavailability, suspected fraud, or errors
        in pricing or product information. Where an order is cancelled after payment, a full refund
        will be issued.
      </p>

      <h2>5. Payments</h2>
      <p>
        Payments are processed through secure, trusted payment gateways. We do not store your card
        or banking details on our servers. You agree to provide current, complete and accurate
        purchase and account information for all purchases.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        All content on this site &mdash; including logos, images, designs, text and graphics &mdash;
        is the property of MADHU GARMENTS and is protected by applicable laws. You may not reproduce
        or use any content without our prior written permission.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        MADHU GARMENTS shall not be liable for any indirect, incidental or consequential damages
        arising from the use of, or inability to use, our website or products, to the extent
        permitted by law.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These terms are governed by the laws of India. Any disputes shall be subject to the
        exclusive jurisdiction of the courts of Tiruppur, Tamil Nadu.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. The latest version will always be available on
        this page, and continued use of the site constitutes acceptance of any changes.
      </p>
    </LegalLayout>
  );
}
