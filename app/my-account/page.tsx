import { AccountClient } from "@/components/account-client";
import { PageHero } from "@/components/page-hero";

export default function AccountPage() {
  return (
    <main>
      <PageHero title="My account" />
      <section className="account-wrap container">
        <AccountClient />
      </section>
    </main>
  );
}
