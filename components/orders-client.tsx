"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { formatCartMoney } from "@/components/cart-provider";
import { useAuth } from "@/components/use-auth";
import { getSupabase } from "@/lib/supabase";
import { PRODUCT_STORE_ID } from "@/lib/store";

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
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
};

export function OrdersClient() {
  const { configured, loading: authLoading, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      } else {
        setOrders((data ?? []) as Order[]);
      }

      setLoading(false);
    };

    fetchOrders();

    return () => {
      alive = false;
    };
  }, [authLoading, configured, user]);

  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + Number(order.total || 0), 0), [orders]);

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

  return (
    <>
      <AccountMenu active="orders" />
      <div className="account-panel orders-panel">
        <div className="orders-header">
          <div>
            <h2>My orders</h2>
            <p>Orders placed while logged in with this email account.</p>
          </div>
          <div className="orders-summary">
            <span>{orders.length} orders</span>
            <strong>{formatCartMoney(totalSpent)}</strong>
          </div>
        </div>

        {error ? <div className="checkout-error">{error}</div> : null}

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
        ) : orders.length ? (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-history-card" key={order.id}>
                <div className="order-history-top">
                  <div>
                    <span>{formatDate(order.created_at)}</span>
                    <h3>Order #{shortOrderId(order.id)}</h3>
                  </div>
                  <strong>{formatCartMoney(Number(order.total || 0))}</strong>
                </div>
                <div className="order-history-meta">
                  <span>{order.status || "placed"}</span>
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
              </article>
            ))}
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
