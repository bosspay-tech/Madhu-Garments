"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Link2, Minus, Plus, Share2, Trash2 } from "lucide-react";
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

  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<null | { code: string; discount: number }>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentUrlLoading, setPaymentUrlLoading] = useState(false);
  const [paymentUrlMessage, setPaymentUrlMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const promoDiscount = promoApplied?.discount ?? 0;
  const totalBeforeShipping = Math.max(0, subtotal - promoDiscount);
  const total = totalBeforeShipping + shipping;

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
    if (authLoading || !user) {
      setIsAdmin(false);
      return;
    }

    let alive = true;

    const checkAdmin = async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();

        if (!session?.access_token) {
          if (alive) setIsAdmin(false);
          return;
        }

        const response = await fetch("/api/admin/check", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = (await response.json()) as { isAdmin?: boolean };

        if (alive) {
          setIsAdmin(Boolean(result.isAdmin));
        }
      } catch {
        if (alive) setIsAdmin(false);
      }
    };

    checkAdmin();

    return () => {
      alive = false;
    };
  }, [authLoading, user]);

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

  useEffect(() => {
    setPaymentUrl("");
    setPaymentUrlMessage("");
  }, [items, promoApplied, total]);

  const startCheckoutPayment = async () => {
    if (!configured) {
      setError("Supabase is not configured. Please add Supabase environment variables before placing orders.");
      return null;
    }

    if (!user) {
      router.replace("/login");
      return null;
    }

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
      return null;
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
      return null;
    }

    savePaymentSession(collectRef);
    return payment.checkoutUrl as string;
  };

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPaymentUrlMessage("");

    setPlacing(true);
    try {
      const checkoutUrl = await startCheckoutPayment();
      if (!checkoutUrl) return;

      window.location.href = checkoutUrl;
    } finally {
      setPlacing(false);
    }
  };

  const handleSharePaymentUrl = async () => {
    if (!isAdmin) return;

    setError("");
    setPaymentUrlMessage("");
    setPaymentUrlLoading(true);

    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/payment-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          items,
          total,
          shippingDetails,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        checkoutUrl?: string;
        collectRef?: string;
        error?: string;
      };

      if (!response.ok || !result.success || !result.checkoutUrl) {
        setError(result.error || "Failed to create payment link.");
        return;
      }

      if (result.collectRef) {
        savePaymentSession(result.collectRef);
      }

      setPaymentUrl(result.checkoutUrl);
      setPaymentUrlMessage("Payment link ready. Share it with the payer.");
    } finally {
      setPaymentUrlLoading(false);
    }
  };

  const copyPaymentUrl = async () => {
    if (!paymentUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(paymentUrl);
        setPaymentUrlMessage("Payment link copied.");
        return;
      }

      setPaymentUrlMessage("Copy is not supported on this device.");
    } catch {
      setPaymentUrlMessage("Could not copy payment link.");
    }
  };

  const sharePaymentUrl = async () => {
    if (!paymentUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "MADHU GARMENTS payment",
          text: `Complete payment for your MADHU GARMENTS order (${formatCartMoney(total)}).`,
          url: paymentUrl,
        });
        return;
      }

      await copyPaymentUrl();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setPaymentUrlMessage("Could not share payment link.");
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
                <span className="checkout-line-price">
                  <strong>{formatCartMoney(item.unitPrice * item.quantity)}</strong>
                </span>
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
        <div className="checkout-promo">
          <strong>Promo code</strong>
          <div className="checkout-promo-row">
            <input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              type="text"
            />
            <button
              type="button"
              disabled={promoLoading || !promoCode.trim()}
              onClick={async () => {
                setPromoError("");
                setPromoLoading(true);
                try {
                  const response = await fetch("/api/promo/apply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      code: promoCode.trim(),
                      subtotal,
                    }),
                  });
                  const json = (await response.json()) as { success: boolean; discount?: number; error?: string };
                  if (!response.ok || !json.success || !json.discount) {
                    setPromoApplied(null);
                    setPromoError(json.error || "Invalid promo code.");
                  } else {
                    setPromoApplied({ code: promoCode.trim().toUpperCase(), discount: json.discount });
                    setPromoError("");
                  }
                } catch (err) {
                  setPromoApplied(null);
                  setPromoError(err instanceof Error ? err.message : "Failed to apply promo code.");
                } finally {
                  setPromoLoading(false);
                }
              }}
            >
              {promoLoading ? "Applying..." : "Apply"}
            </button>
          </div>
          {promoApplied ? (
            <p className="checkout-promo-applied">
              Applied <strong>{promoApplied.code}</strong> (-{formatCartMoney(promoApplied.discount)})
              <button
                type="button"
                onClick={() => {
                  setPromoApplied(null);
                  setPromoCode("");
                  setPromoError("");
                }}
              >
                Remove
              </button>
            </p>
          ) : null}
          {promoError ? <p className="checkout-promo-error">{promoError}</p> : null}
        </div>
        {promoDiscount > 0 ? (
          <div className="order-total-row">
            <span>Promo discount</span>
            <strong>-{formatCartMoney(promoDiscount)}</strong>
          </div>
        ) : null}
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
        <button className="place-order-button" disabled={placing || (isAdmin && paymentUrlLoading)} type="submit">
          {placing ? "Redirecting to payment..." : "Pay & Place Order"}
        </button>
        {isAdmin ? (
          <div className="checkout-payment-link">
            <button
              className="checkout-payment-link-button"
              disabled={placing || paymentUrlLoading}
              onClick={handleSharePaymentUrl}
              type="button"
            >
              <Link2 size={16} />
              {paymentUrlLoading ? "Creating payment link..." : "Get payment link to share"}
            </button>
            {paymentUrl ? (
              <div className="checkout-payment-link-box">
                <label htmlFor="checkout-payment-url">Payment URL</label>
                <div className="checkout-payment-link-row">
                  <input id="checkout-payment-url" readOnly type="url" value={paymentUrl} />
                  <button onClick={copyPaymentUrl} type="button">
                    <Copy size={15} />
                    Copy
                  </button>
                  <button onClick={sharePaymentUrl} type="button">
                    <Share2 size={15} />
                    Share
                  </button>
                </div>
                <p>Send this link to complete payment securely on Easebuzz.</p>
              </div>
            ) : null}
            {paymentUrlMessage ? <p className="checkout-payment-link-message">{paymentUrlMessage}</p> : null}
          </div>
        ) : null}
      </aside>
    </form>
  );
}
