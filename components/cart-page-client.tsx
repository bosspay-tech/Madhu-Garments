"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { formatCartMoney, useCart } from "@/components/cart-provider";

export function CartPageClient() {
  const { items, subtotal, updateQuantity } = useCart();

  if (!items.length) {
    return (
      <section className="checkout-empty container">
        <h1>Your cart is empty</h1>
        <p>Add products to your cart before viewing the cart.</p>
        <Link href="/shop">Shop Products</Link>
      </section>
    );
  }

  return (
    <section className="cart-page container">
      <h1>Cart</h1>
      <div className="cart-page-lines">
        {items.map((item) => (
          <div className="cart-page-line" key={item.id}>
            <img src={item.image} alt={item.name} />
            <Link href={`/product/${item.id}`}>{item.name}</Link>
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
            </div>
            <strong>{formatCartMoney(item.unitPrice * item.quantity)}</strong>
          </div>
        ))}
      </div>
      <div className="cart-page-total">
        <span>Subtotal</span>
        <strong>{formatCartMoney(subtotal)}</strong>
      </div>
      <Link className="cart-page-checkout" href="/checkout">
        Checkout
      </Link>
    </section>
  );
}
