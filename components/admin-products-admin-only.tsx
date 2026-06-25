"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/use-auth";
import { getSupabase } from "@/lib/supabase";
import type { Product } from "@/lib/products";
import { AdminProductsClient } from "@/components/admin-products-client";

export function AdminProductsAdminOnly() {
  const router = useRouter();
  const { configured, loading: authLoading, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
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

        const response = await fetch("/api/admin/products", {
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

        const json = (await response.json()) as { success: boolean; products: Product[] };
        if (!json.success) {
          if (alive) {
            setError("Failed to load admin products.");
            setLoading(false);
          }
          return;
        }

        if (alive) {
          setProducts(json.products ?? []);
          setLoading(false);
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load admin products.");
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [authLoading, configured, router, user]);

  if (authLoading || loading) {
    return <p style={{ padding: "0 0 60px" }}>Loading...</p>;
  }

  if (error) {
    return (
      <section className="checkout-empty container">
        <h1>Not authorized</h1>
        <p>{error}</p>
      </section>
    );
  }

  return <AdminProductsClient products={products} />;
}

