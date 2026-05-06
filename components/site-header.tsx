"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Minus, Plus, Search, ShoppingCart, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCartMoney, useCart } from "@/components/cart-provider";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about-us", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

const marqueeItems = [
  "WELCOME TO MADHU GARMENTS",
  "SIGN UP & ENJOY 10% OFF",
  "FREE SHIPPING ON ALL TAMIL NADU ORDERS RS. 2500+",
  "SIGN UP & ENJOY 10% OFF",
];

export function SiteHeader() {
  const pathname = usePathname();
  const { cartOpen, closeCart, itemCount, items, openCart, subtotal, updateQuantity } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const activePath = useMemo(() => (pathname === "/" ? "/" : `/${pathname.split("/")[1]}`), [pathname]);

  return (
    <>
      <header className="site-header">
        <div className="top-marquee" aria-label="Store announcements">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>
        <div className="shipping-bar">FREE SHIPPING ON ALL ORDERS OVER 2500. LEARN MORE!</div>
        <div className="main-header">
          <div className="container nav-row">
            <Link className="brand-logo navbar-logo" href="/" aria-label="MADHU GARMENTS home">
              Madhu
              <small>GARMENTS</small>
            </Link>
            <nav className="primary-nav" aria-label="Primary navigation">
              {links.map((link) => (
                <Link className={activePath === link.href ? "active" : ""} href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="nav-tools">
              <button aria-label="Open search" onClick={() => setSearchOpen(true)} type="button">
                <Search />
              </button>
              <button
                aria-label="Open account menu"
                className={accountOpen ? "active" : ""}
                onClick={() => setAccountOpen((value) => !value)}
                type="button"
              >
                <UserRound />
              </button>
              <button aria-label="Open cart" className="cart-button" onClick={openCart} type="button">
                <ShoppingCart />
                <span>{itemCount}</span>
              </button>
              {accountOpen && (
                <div className="account-dropdown">
                  <Link href="/my-account">Dashboard</Link>
                  <a href="#">Logout</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="modal-backdrop" onClick={() => setSearchOpen(false)}>
          <div className="search-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <strong>TYPE TO SEARCH</strong>
              <button aria-label="Close search" onClick={() => setSearchOpen(false)} type="button">
                <X />
              </button>
            </div>
            <label>
              <input autoFocus placeholder="Search products..." />
              <Search />
            </label>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="cart-overlay">
          <button className="cart-shade" aria-label="Close cart" onClick={closeCart} type="button" />
          <aside className="cart-drawer">
            <div className="cart-title">
              <strong>SHOPPING CART</strong>
              <span>{itemCount}</span>
              <button aria-label="Close cart" onClick={closeCart} type="button">
                <X />
              </button>
            </div>
            {items.length ? (
              <>
                <div className="cart-items">
                  {items.map((item) => (
                    <div className="cart-line" key={item.id}>
                      <img src={item.image} alt={item.name} />
                      <div>
                        <Link href={`/product/${item.id}`} onClick={closeCart}>
                          {item.name}
                        </Link>
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
                      </div>
                      <strong className="cart-line-total">{formatCartMoney(item.unitPrice * item.quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div className="cart-subtotal">
                  <span>Subtotal</span>
                  <strong>{formatCartMoney(subtotal)}</strong>
                </div>
                <Link className="cart-view-link" href="/cart" onClick={closeCart}>
                  View Cart
                </Link>
                <Link className="cart-checkout-link" href="/checkout" onClick={closeCart}>
                  Checkout
                </Link>
              </>
            ) : (
              <>
                <div className="empty-cart-icon">
                  <ShoppingCart />
                </div>
                <p>No products in the cart.</p>
                <Link href="/shop" onClick={closeCart}>
                  Continue Shopping
                </Link>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
