"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div
      className="container admin-nav-tabs"
      style={{
        display: "flex",
        gap: "10px",
        borderBottom: "2px solid #e5e7eb",
        marginTop: "20px",
        marginBottom: "20px",
        paddingBottom: "1px"
      }}
    >
      <Link
        href="/admin"
        style={{
          padding: "10px 20px",
          textDecoration: "none",
          fontWeight: "bold",
          fontSize: "14px",
          color: pathname === "/admin" ? "#111827" : "#6b7280",
          borderBottom: pathname === "/admin" ? "3px solid #1f2937" : "3px solid transparent",
          marginBottom: "-3px",
          transition: "all 0.2s ease"
        }}
      >
        Products List
      </Link>
      <Link
        href="/admin/orders"
        style={{
          padding: "10px 20px",
          textDecoration: "none",
          fontWeight: "bold",
          fontSize: "14px",
          color: pathname === "/admin/orders" ? "#111827" : "#6b7280",
          borderBottom: pathname === "/admin/orders" ? "3px solid #1f2937" : "3px solid transparent",
          marginBottom: "-3px",
          transition: "all 0.2s ease"
        }}
      >
        Orders Management
      </Link>
      <Link
        href="/admin/transactions"
        style={{
          padding: "10px 20px",
          textDecoration: "none",
          fontWeight: "bold",
          fontSize: "14px",
          color: pathname === "/admin/transactions" ? "#111827" : "#6b7280",
          borderBottom: pathname === "/admin/transactions" ? "3px solid #1f2937" : "3px solid transparent",
          marginBottom: "-3px",
          transition: "all 0.2s ease"
        }}
      >
        Transactions
      </Link>
    </div>
  );
}
