"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/use-auth";
import { getSupabase } from "@/lib/supabase";
import { AdminOrdersClient } from "@/components/admin-orders-client";
import type { InvoiceOrder } from "@/lib/invoice-generator";

export function AdminOrdersAdminOnly() {
  const router = useRouter();
  const { configured, loading: authLoading, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!configured) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      if (authLoading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const {
          data: { session },
          error: sessionError,
          } = await getSupabase().auth.getSession();

        if (sessionError || !session?.access_token) {
          router.replace("/login");
          return;
        }

        const response = await fetch("/api/admin/orders", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          const apiError = payload?.error || `Request failed (${response.status}).`;

          if (response.status === 403) {
            router.replace("/");
            return;
          }

          if (alive) {
            setError(apiError);
            setLoading(false);
          }
          return;
        }

        const json = (await response.json()) as { success: boolean; orders: InvoiceOrder[] };
        if (!json.success) {
          if (alive) {
            setError("Failed to load admin orders.");
            setLoading(false);
          }
          return;
        }

        if (alive) {
          setOrders(json.orders ?? []);
          setAccessToken(session.access_token);
          setLoading(false);
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load admin orders.");
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [authLoading, configured, router, user]);

  if (authLoading || loading) {
    return <p style={{ padding: "0 0 60px" }}>Loading orders...</p>;
  }

  if (error) {
    return (
      <section className="checkout-empty container">
        <h1>Not authorized</h1>
        <p>{error}</p>
      </section>
    );
  }

  return (
    <AdminOrdersClient
      accessToken={accessToken}
      onOrderUpdated={(updatedOrder) => {
        setOrders((current) => current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)));
      }}
      orders={orders}
    />
  );
}
