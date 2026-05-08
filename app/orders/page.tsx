import { OrdersClient } from "@/components/orders-client";
import { PageHero } from "@/components/page-hero";

export const metadata = {
  title: "Orders | MADHU GARMENTS",
};

export default function OrdersPage() {
  return (
    <main>
      <PageHero title="Orders" />
      <section className="account-wrap container">
        <OrdersClient />
      </section>
    </main>
  );
}
