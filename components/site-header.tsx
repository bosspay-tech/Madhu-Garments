"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Minus, Plus, Search, ShoppingCart, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatCartMoney, useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/use-auth";
import { signOut } from "@/lib/auth-service";
import { GLOBAL_OFFER_RUPEES_OFF } from "@/lib/products";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about-us", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

const marqueeItems = [
  "WELCOME TO MADHU GARMENTS",
  "SIGN UP & ENJOY 10% OFF",
  "PAN INDIA DELIVERY AVAILABLE",
  "SIGN UP & ENJOY 10% OFF",
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartOpen, closeCart, itemCount, items, openCart, subtotal, updateQuantity } = useCart();
  const offerTotal = useMemo(
    () => items.reduce((total, item) => total + GLOBAL_OFFER_RUPEES_OFF * item.quantity, 0),
    [items],
  );
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activePath = useMemo(() => (pathname === "/" ? "/" : `/${pathname.split("/")[1]}`), [pathname]);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setAccountOpen(false);
    setMenuOpen(false);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();

    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
    setSearchOpen(false);
  };

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
        <div className="shipping-bar">PAN INDIA DELIVERY AVAILABLE. FREE SHIPPING ON ORDERS OVER RS. 2500.</div>
        <div className="main-header">
          <div className="container nav-row">
            <button
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="nav-burger"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              <Menu />
            </button>
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
                  {user ? (
                    <>
                      <Link href="/my-account" onClick={() => setAccountOpen(false)}>
                        Dashboard
                      </Link>
                      <Link href="/orders" onClick={() => setAccountOpen(false)}>
                        Orders
                      </Link>
                      <button onClick={handleSignOut} type="button">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setAccountOpen(false)}>
                        Login
                      </Link>
                      <Link href="/signup" onClick={() => setAccountOpen(false)}>
                        Sign up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu-overlay">
          <button className="cart-shade" aria-label="Close menu" onClick={() => setMenuOpen(false)} type="button" />
          <aside className="mobile-menu-drawer">
            <div className="mobile-menu-head">
              <span className="brand-logo">
                Madhu
                <small>GARMENTS</small>
              </span>
              <button aria-label="Close menu" onClick={() => setMenuOpen(false)} type="button">
                <X />
              </button>
            </div>
            <nav className="mobile-menu-nav" aria-label="Mobile navigation">
              {links.map((link) => (
                <Link
                  className={activePath === link.href ? "active" : ""}
                  href={link.href}
                  key={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mobile-menu-account">
              {user ? (
                <>
                  <Link href="/my-account" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/orders" onClick={() => setMenuOpen(false)}>
                    Orders
                  </Link>
                  <button onClick={handleSignOut} type="button">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {searchOpen && (
        <div className="modal-backdrop" onClick={() => setSearchOpen(false)}>
          <form className="search-modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSearchSubmit}>
            <div>
              <strong>TYPE TO SEARCH</strong>
              <button aria-label="Close search" onClick={() => setSearchOpen(false)} type="button">
                <X />
              </button>
            </div>
            <label>
              <input
                autoFocus
                placeholder="Search products..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button aria-label="Search products" type="submit">
                <Search />
              </button>
            </label>
          </form>
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
                      {item.originalUnitPrice && item.originalUnitPrice > item.unitPrice ? (
                        <del className="cart-line-original">{formatCartMoney(item.originalUnitPrice * item.quantity)}</del>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="cart-subtotal">
                  <span>Subtotal</span>
                  <strong>{formatCartMoney(subtotal)}</strong>
                </div>
                <div className="cart-subtotal">
                  <span>Offer discount</span>
                  <strong>-{formatCartMoney(offerTotal)}</strong>
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
