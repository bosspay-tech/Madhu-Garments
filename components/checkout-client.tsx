"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCartMoney, useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/use-auth";
import { getSupabase } from "@/lib/supabase";
import { createEasebuzzPaymentSession, savePaymentSession } from "@/lib/payment";
import { lookupIndianPincode } from "@/lib/pincode";
import { PRODUCT_STORE_ID } from "@/lib/store";

const shipping = 0;

type ShippingDetails = {
  firstName: string;
  lastName: string;
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
  const { items, removeItem, subtotal, updateQuantity } = useCart();
  const { configured, loading: authLoading, user } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeHint, setPincodeHint] = useState("");
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
    firstName: "",
    lastName: "",
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

  useEffect(() => {
    const pincode = shippingDetails.pincode.replace(/\D/g, "");

    if (pincode.length !== 6) {
      setPincodeLoading(false);
      setPincodeHint("");
      return;
    }

    let alive = true;

    const fetchLocation = async () => {
      setPincodeLoading(true);
      setPincodeHint("");

      try {
        const location = await lookupIndianPincode(pincode);
        if (!alive) return;

        if (location) {
          setShippingDetails((current) => ({
            ...current,
            city: location.city,
            state: location.state,
          }));
          setPincodeHint("");
        } else {
          setPincodeHint("Could not find city and state for this PIN code. Please enter them manually.");
        }
      } catch {
        if (!alive) return;
        setPincodeHint("Could not look up PIN code. Please enter city and state manually.");
      } finally {
        if (alive) {
          setPincodeLoading(false);
        }
      }
    };

    fetchLocation();

    return () => {
      alive = false;
    };
  }, [shippingDetails.pincode]);

  const updateShippingDetail = (field: keyof ShippingDetails, value: string) => {
    setShippingDetails((current) => ({ ...current, [field]: value }));
  };

  const updatePincode = (value: string) => {
    updateShippingDetail("pincode", value.replace(/\D/g, "").slice(0, 6));
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
      const collectRef = `ORD${Date.now()}`;

      const { error: insertError } = await getSupabase().from("orders").insert({
        store_id: PRODUCT_STORE_ID,
        user_id: user.id,
        items,
        total,
        transaction_id: collectRef,
        status: "pending",
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

      const payment = await createEasebuzzPaymentSession({
        collectRef,
        amount: total,
        email: shippingDetails.email,
        phone: shippingDetails.phone,
      });

      if (!payment.success || !payment.checkoutUrl) {
        await getSupabase().from("orders").update({ status: "failed" }).eq("transaction_id", collectRef);
        setError(payment.error || "Failed to start payment. Please try again.");
        return;
      }

      savePaymentSession(collectRef);
      window.location.href = payment.checkoutUrl;
    } finally {
      setPlacing(false);
    }
  };

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
            Street address
            <input required value={shippingDetails.street} onChange={(event) => updateShippingDetail("street", event.target.value)} />
          </label>
          <label>
            PIN code
            <input
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={shippingDetails.pincode}
              onChange={(event) => updatePincode(event.target.value)}
            />
            {pincodeLoading ? <span className="checkout-field-hint">Looking up city and state...</span> : null}
            {!pincodeLoading && pincodeHint ? <span className="checkout-field-hint checkout-field-hint-error">{pincodeHint}</span> : null}
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
          <strong>Secure online payment</strong>
          <p>Pay safely with UPI, cards, net banking, and wallets via Easebuzz.</p>
        </div>
        <button className="place-order-button" disabled={placing} type="submit">
          {placing ? "Redirecting to payment..." : "Pay & Place Order"}
        </button>
      </aside>
    </form>
  );
}
