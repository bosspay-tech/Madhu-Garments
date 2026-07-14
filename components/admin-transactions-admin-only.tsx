"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/use-auth";
import { getSupabase } from "@/lib/supabase";
import { AdminTransactionsClient } from "./admin-transactions-client";

export function AdminTransactionsAdminOnly() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured, loading: authLoading, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [successVolume, setSuccessVolume] = useState(0);
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");

  const page = searchParams.get("page") || "1";
  const query = searchParams.get("query") || "";
  const status = searchParams.get("status") || "all";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const sort = searchParams.get("sort") || "date-desc";

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

        const params = new URLSearchParams();
        params.set("page", page);
        params.set("limit", "20");
        if (query) params.set("query", query);
        if (status && status !== "all") params.set("status", status);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        params.set("sort", sort);

        const response = await fetch(`/api/admin/transactions?${params.toString()}`, {
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

        const json = (await response.json()) as { 
          success: boolean; 
          transactions: any[]; 
          totalCount?: number;
          successCount?: number;
          successVolume?: number;
        };

        if (!json.success) {
          if (alive) {
            setError("Failed to load admin transactions.");
            setLoading(false);
          }
          return;
        }

        if (alive) {
          setTransactions(json.transactions ?? []);
          setTotalCount(json.totalCount ?? 0);
          setSuccessCount(json.successCount ?? 0);
          setSuccessVolume(json.successVolume ?? 0);
          setAccessToken(session.access_token);
          setLoading(false);
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load admin transactions.");
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [authLoading, configured, router, user, page, query, status, startDate, endDate, sort]);

  if (authLoading || loading) {
    return <p style={{ padding: "0 0 60px" }}>Loading transactions...</p>;
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
    <AdminTransactionsClient
      accessToken={accessToken}
      transactions={transactions}
      totalCount={totalCount}
      successCount={successCount}
      successVolume={successVolume}
    />
  );
}
