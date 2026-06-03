import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  children: ReactNode;
};

export function LegalLayout({ title, lastUpdated, intro, children }: LegalLayoutProps) {
  return (
    <main>
      <PageHero title={title} />
      <section className="legal-section container">
        <article className="legal-prose">
          <p className="legal-updated">Last updated: {lastUpdated}</p>
          <div className="legal-intro">{intro}</div>
          {children}
        </article>
        <aside className="legal-aside">
          <h2>Need help?</h2>
          <p>Our team is happy to answer any questions about this policy.</p>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:sales@madhugarments.com">sales@madhugarments.com</a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <a href="tel:+917845414129">+91 78454 14129</a>
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                MADHU GARMENTS, 2nd Floor, 60 Feet Road, PN Road 1st Street,
                Kumarnathapuram, Tiruppur, Tamil Nadu 641602
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
