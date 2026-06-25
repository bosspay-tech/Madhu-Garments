import { AdminProductsAdminOnly } from "@/components/admin-products-admin-only";
import { PageHero } from "@/components/page-hero";

export const metadata = {
  title: "Admin Products | MADHU GARMENTS",
};

export default function AdminPage() {
  return (
    <main className="admin-page">
      <PageHero plain title="Admin Products" />
      <AdminProductsAdminOnly />
    </main>
  );
}
