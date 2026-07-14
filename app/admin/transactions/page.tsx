import { Suspense } from "react";
import { AdminTransactionsAdminOnly } from "@/components/admin-transactions-admin-only";
import { PageHero } from "@/components/page-hero";
import { AdminNav } from "@/components/admin-nav";

export const metadata = {
  title: "Admin Transactions | MADHU GARMENTS",
};

export default function AdminTransactionsPage() {
  return (
    <main className="admin-page">
      <PageHero plain title="Admin Panel" />
      <AdminNav />
      <Suspense fallback={<p style={{ padding: "0 0 60px" }} className="container">Loading transactions...</p>}>
        <AdminTransactionsAdminOnly />
      </Suspense>
    </main>
  );
}
