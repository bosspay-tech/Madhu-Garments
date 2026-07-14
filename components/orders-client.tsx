"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { formatCartMoney } from "@/components/cart-provider";
import { useAuth } from "@/components/use-auth";
import { getOrderStatusLabel, normalizeOrderStatus, type OrderStatusValue } from "@/lib/order-status";
import { syncOrderPaymentStatus } from "@/lib/orders";
import { getSupabase } from "@/lib/supabase";
import { PRODUCT_STORE_ID } from "@/lib/store";
import { generateInvoicePDF } from "@/lib/invoice-generator";

type OrderItem = {
  id?: string;
  name?: string;
  image?: string;
  quantity?: number;
  unitPrice?: number;
  priceLabel?: string;
};

type Order = {
  id: string;
  created_at?: string;
  items?: OrderItem[];
  total?: number | string;
  status?: string;
  transaction_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
};

type StatusFilter = "all" | OrderStatusValue;

export function OrdersClient() {
  const { configured, loading: authLoading, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const handleDownloadInvoice = (order: Order) => {
    const doc = generateInvoicePDF(order as any);
    const invoiceNo = `INVC-${(order.transaction_id || order.id).slice(0, 8).toUpperCase()}`;
    doc.save(`${invoiceNo}.pdf`);
  };

  useEffect(() => {
    if (authLoading || !configured || !user) {
      return;
    }

    let alive = true;

    const fetchOrders = async () => {
      setLoading(true);
      setError("");

      const { data, error: ordersError } = await getSupabase()
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("store_id", PRODUCT_STORE_ID)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (ordersError) {
        setError(ordersError.message || "Failed to load orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const nextOrders = (data ?? []) as Order[];
      setOrders(nextOrders);
      setLoading(false);

      const pendingOrders = nextOrders.filter(
        (order) => normalizeOrderStatus(order.status) === "pending" && order.transaction_id,
      );

      if (!pendingOrders.length) {
        return;
      }

      setSyncing(true);

      const syncedOrders = [...nextOrders];

      for (const order of pendingOrders) {
        if (!order.transaction_id) continue;

        try {
          const syncedStatus = await syncOrderPaymentStatus(order.transaction_id);
          if (!alive || !syncedStatus) continue;

          const index = syncedOrders.findIndex((item) => item.id === order.id);
          if (index >= 0) {
            syncedOrders[index] = { ...syncedOrders[index], status: syncedStatus };
          }
        } catch (syncError) {
          console.error("Failed to sync order status:", syncError);
        }
      }

      if (alive) {
        setOrders(syncedOrders);
        setSyncing(false);
      }
    };

    fetchOrders();

    return () => {
      alive = false;
    };
  }, [authLoading, configured, user]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return orders;
    }

    return orders.filter((order) => normalizeOrderStatus(order.status) === statusFilter);
  }, [orders, statusFilter]);

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (counts, order) => {
        const status = normalizeOrderStatus(order.status);
        counts[status] = (counts[status] || 0) + 1;
        counts.all += 1;
        return counts;
      },
      { all: 0, success: 0, failed: 0, pending: 0, placed: 0, unknown: 0 },
    );
  }, [orders]);

  const totalSpent = useMemo(
    () =>
      orders
        .filter((order) => normalizeOrderStatus(order.status) === "success")
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders],
  );

  if (!configured) {
    return (
      <div className="account-panel">
        <h2>Connect Supabase</h2>
        <p>Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to load account orders.</p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="account-panel">
        <p>Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-panel">
        <h2>Sign in to view orders</h2>
        <p>Your MADHU GARMENTS order history appears here after you log in with email OTP.</p>
        <div className="account-actions">
          <Link href="/login">Login</Link>
          <Link href="/shop">Continue shopping</Link>
        </div>
      </div>
    );
  }

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "success", label: "Paid" },
    { key: "failed", label: "Failed" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <>
      <AccountMenu active="orders" />
      <div className="account-panel orders-panel">
        <div className="orders-header">
          <div>
            <h2>My orders</h2>
            <p>Track paid, failed, and pending payments from your account.</p>
          </div>
          <div className="orders-summary">
            <span>{orders.length} orders</span>
            <strong>{formatCartMoney(totalSpent)} paid</strong>
          </div>
        </div>

        {syncing ? <div className="orders-sync-note">Refreshing payment status for pending orders...</div> : null}
        {error ? <div className="checkout-error">{error}</div> : null}

        {orders.length ? (
          <div className="orders-filters">
            {filters.map((filter) => (
              <button
                className={`orders-filter${statusFilter === filter.key ? " is-active" : ""}`}
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                type="button"
              >
                <span className="orders-filter-label">{filter.label}</span>
                <span className="orders-filter-count">{statusCounts[filter.key] || 0}</span>
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="orders-list">
            {[0, 1, 2].map((item) => (
              <div className="order-history-card order-history-skeleton" key={item}>
                <span />
                <strong />
                <p />
              </div>
            ))}
          </div>
        ) : filteredOrders.length ? (
          <div className="orders-list">
            {filteredOrders.map((order) => {
              const status = normalizeOrderStatus(order.status);

              return (
                <article className="order-history-card" key={order.id}>
                  <div className="order-history-top">
                    <div>
                      <span>{formatDate(order.created_at)}</span>
                      <h3>Order #{shortOrderId(order.transaction_id || order.id)}</h3>
                    </div>
                    <strong>{formatCartMoney(Number(order.total || 0))}</strong>
                  </div>
                  <div className="order-history-meta">
                    <span className={`order-status-badge order-status-badge--${status}`}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                    <span>{order.items?.length ?? 0} item types</span>
                    {order.customer_phone ? <span>{order.customer_phone}</span> : null}
                  </div>
                  {order.items?.length ? (
                    <div className="order-history-items">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={`${item.id ?? item.name ?? "item"}-${index}`}>
                          {item.image ? <img src={item.image} alt={item.name || "Ordered item"} /> : <PackageCheck size={18} />}
                          <span>{item.name || "Product"}</span>
                          <strong>x{item.quantity ?? 1}</strong>
                        </div>
                      ))}
                      {order.items.length > 3 ? <em>+{order.items.length - 3} more</em> : null}
                    </div>
                  ) : null}
                  <div className="order-history-actions" style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                    {status === "success" && (
                      <button
                        className="order-retry-link"
                        onClick={() => handleDownloadInvoice(order)}
                        style={{ background: "#1f2937", color: "white", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                        type="button"
                      >
                        Download Invoice
                      </button>
                    )}
                    {status === "failed" && order.transaction_id && (
                      <Link className="order-retry-link" href={`/order-success?collect_ref=${order.transaction_id}&status=failed`}>
                        Retry payment
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : orders.length ? (
          <div className="orders-empty">
            <PackageCheck />
            <h3>No {statusFilter === "all" ? "" : `${getOrderStatusLabel(statusFilter).toLowerCase()} `}orders</h3>
            <p>Try another filter to view your order history.</p>
          </div>
        ) : (
          <div className="orders-empty">
            <PackageCheck />
            <h3>No orders yet</h3>
            <p>Once you place an order while logged in, it will show up here.</p>
            <Link href="/shop">Shop products</Link>
          </div>
        )}
      </div>
    </>
  );
}

function shortOrderId(id: string) {
  return id ? id.slice(0, 8).toUpperCase() : "ORDER";
}

function formatDate(value?: string) {
  if (!value) {
    return "Order date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
