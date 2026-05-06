"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Minus, Plus, Trash2 } from "lucide-react";
import { formatCartMoney, useCart } from "@/components/cart-provider";

const shipping = 0;

export function CheckoutClient() {
  const { clearCart, items, removeItem, subtotal, updateQuantity } = useCart();
  const [placed, setPlaced] = useState(false);

  const total = subtotal + shipping;

  const placeOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlaced(true);
    clearCart();
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

  return (
    <form className="checkout-wrap container" onSubmit={placeOrder}>
      <section className="billing-panel">
        <h1>Checkout</h1>
        <h2>Billing Details</h2>
        <div className="checkout-fields">
          <label>
            First name
            <input required />
          </label>
          <label>
            Last name
            <input required />
          </label>
          <label className="wide">
            Company name
            <input />
          </label>
          <label className="wide">
            Street address
            <input required />
          </label>
          <label>
            Town / City
            <input required />
          </label>
          <label>
            State
            <input defaultValue="Tamil Nadu" required />
          </label>
          <label>
            PIN code
            <input inputMode="numeric" required />
          </label>
          <label>
            Phone
            <input inputMode="tel" required />
          </label>
          <label className="wide">
            Email address
            <input inputMode="email" required type="email" />
          </label>
          <label className="wide">
            Order notes
            <textarea rows={5} />
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
          <strong>Free</strong>
        </div>
        <div className="order-grand-total">
          <span>Total</span>
          <strong>{formatCartMoney(total)}</strong>
        </div>
        <div className="payment-box">
          <strong>Direct bank transfer</strong>
          <p>Your order request will be confirmed by the MADHU GARMENTS team before payment collection.</p>
        </div>
        <button className="place-order-button" type="submit">
          Place Order
        </button>
      </aside>
    </form>
  );
}
