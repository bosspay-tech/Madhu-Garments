import { AdminOrdersAdminOnly } from "@/components/admin-orders-admin-only";
import { PageHero } from "@/components/page-hero";
import { AdminNav } from "@/components/admin-nav";

export const metadata = {
  title: "Admin Orders | MADHU GARMENTS",
};

export default function AdminOrdersPage() {
  return (
    <main className="admin-page">
      <PageHero plain title="Admin Panel" />
      <AdminNav />
      <AdminOrdersAdminOnly />
    </main>
  );
}

