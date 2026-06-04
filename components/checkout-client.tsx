"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Minus, Plus, Trash2 } from "lucide-react";
import { formatCartMoney, useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/use-auth";
import { getSupabase } from "@/lib/supabase";
import { PRODUCT_STORE_ID } from "@/lib/store";

const shipping = 0;

type ShippingDetails = {
  firstName: string;
  lastName: string;
  company: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  notes: string;
};

export function CheckoutClient() {
  const router = useRouter();
  const { clearCart, items, removeItem, subtotal, updateQuantity } = useCart();
  const { configured, loading: authLoading, user } = useAuth();
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
    firstName: "",
    lastName: "",
    company: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    notes: "",
  });

  const total = subtotal + shipping;

  useEffect(() => {
    if (!configured || authLoading || user) return;
    router.replace("/login");
  }, [authLoading, configured, router, user]);

  useEffect(() => {
    if (!user) return;

    const fullName =
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim().split(/\s+/) : [];
    const firstName = fullName[0] ?? "";
    const lastName = fullName.slice(1).join(" ");
    const phone = typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "";

    setShippingDetails((current) => ({
      ...current,
      firstName: current.firstName || firstName,
      lastName: current.lastName || lastName,
      email: current.email || user.email || "",
      phone: current.phone || phone,
    }));
  }, [user]);

  const updateShippingDetail = (field: keyof ShippingDetails, value: string) => {
    setShippingDetails((current) => ({ ...current, [field]: value }));
  };

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!configured) {
      setError("Supabase is not configured. Please add Supabase environment variables before placing orders.");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    setPlacing(true);
    try {
      const customerName = `${shippingDetails.firstName} ${shippingDetails.lastName}`.trim();
      const { error: insertError } = await getSupabase().from("orders").insert({
        store_id: PRODUCT_STORE_ID,
        user_id: user.id,
        items,
        total,
        status: "placed",
        customer_name: customerName,
        customer_email: shippingDetails.email,
        customer_phone: shippingDetails.phone,
        customer_address: shippingDetails.street,
        customer_city: shippingDetails.city,
        customer_state: shippingDetails.state,
        customer_pincode: shippingDetails.pincode,
      });

      if (insertError) {
        setError(insertError.message || "Failed to place order.");
        return;
      }

      setPlaced(true);
      clearCart();
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <section className="checkout-empty container">
        <CheckCircle2 />
        <h1>Order received</h1>
        <p>Thank you. Your MADHU GARMENTS order request has been captured.</p>
        <Link href="/shop">Continue Shopping</Link>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="checkout-empty container">
        <h1>Your cart is empty</h1>
        <p>Add products to your cart before checking out.</p>
        <Link href="/shop">Shop Products</Link>
      </section>
    );
  }

  if (configured && (authLoading || !user)) {
    return (
      <section className="checkout-empty container">
        <h1>Login required</h1>
        <p>Please log in before placing your order.</p>
        <Link href="/login">Login</Link>
      </section>
    );
  }

  return (
    <form className="checkout-wrap container" onSubmit={placeOrder}>
      <section className="billing-panel">
        <h1>Checkout</h1>
        <h2>Billing Details</h2>
        {error ? <div className="checkout-error">{error}</div> : null}
        <div className="checkout-fields">
          <label>
            First name
            <input required value={shippingDetails.firstName} onChange={(event) => updateShippingDetail("firstName", event.target.value)} />
          </label>
          <label>
            Last name
            <input required value={shippingDetails.lastName} onChange={(event) => updateShippingDetail("lastName", event.target.value)} />
          </label>
          <label className="wide">
            Company name
            <input value={shippingDetails.company} onChange={(event) => updateShippingDetail("company", event.target.value)} />
          </label>
          <label className="wide">
            Street address
            <input required value={shippingDetails.street} onChange={(event) => updateShippingDetail("street", event.target.value)} />
          </label>
          <label>
            Town / City
            <input required value={shippingDetails.city} onChange={(event) => updateShippingDetail("city", event.target.value)} />
          </label>
          <label>
            State
            <input
              placeholder="State"
              required
              value={shippingDetails.state}
              onChange={(event) => updateShippingDetail("state", event.target.value)}
            />
          </label>
          <label>
            PIN code
            <input inputMode="numeric" required value={shippingDetails.pincode} onChange={(event) => updateShippingDetail("pincode", event.target.value)} />
          </label>
          <label>
            Phone
            <input inputMode="tel" required value={shippingDetails.phone} onChange={(event) => updateShippingDetail("phone", event.target.value)} />
          </label>
          <label className="wide">
            Email address
            <input
              inputMode="email"
              required
              type="email"
              value={shippingDetails.email}
              onChange={(event) => updateShippingDetail("email", event.target.value)}
            />
          </label>
          <label className="wide">
            Order notes
            <textarea rows={5} value={shippingDetails.notes} onChange={(event) => updateShippingDetail("notes", event.target.value)} />
          </label>
        </div>
      </section>

      <aside className="order-panel">
        <h2>Your Order</h2>
        <div className="order-lines">
          {items.map((item) => (
            <div className="order-line" key={item.id}>
              <img src={item.image} alt={item.name} />
              <div>
                <strong>{item.name}</strong>
                <span>{formatCartMoney(item.unitPrice * item.quantity)}</span>
                <div className="cart-line-controls">
                  <button
                    aria-label={`Decrease ${item.name} quantity`}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    type="button"
                  >
                    <Minus size={13} />
                  </button>
                  <strong>{item.quantity}</strong>
                  <button
                    aria-label={`Increase ${item.name} quantity`}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    type="button"
                  >
                    <Plus size={13} />
                  </button>
                  <button aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)} type="button">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="order-total-row">
          <span>Subtotal</span>
          <strong>{formatCartMoney(subtotal)}</strong>
        </div>
        <div className="order-total-row">
          <span>Shipping</span>
          <strong>Free across India</strong>
        </div>
        <div className="order-grand-total">
          <span>Total</span>
          <strong>{formatCartMoney(total)}</strong>
        </div>
        <div className="payment-box">
          <strong>Direct bank transfer</strong>
          <p>Your order request will be confirmed by the MADHU GARMENTS team before payment collection.</p>
        </div>
        <button className="place-order-button" disabled={placing} type="submit">
          {placing ? "Placing Order..." : "Place Order"}
        </button>
      </aside>
    </form>
  );
}
