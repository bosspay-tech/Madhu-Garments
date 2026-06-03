"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartProduct = {
  id: string;
  name: string;
  image: string;
  priceLabel: string;
  unitPrice: number;
};

export type CartItem = CartProduct & {
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  cartOpen: boolean;
  subtotal: number;
  addItem: (product: CartProduct, quantity?: number) => void;
  closeCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  openCart: () => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "madhu-garments-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, loaded]);

  const value = useMemo<CartContextValue>(() => {
    const addItem = (product: CartProduct, quantity = 1) => {
      setItems((current) => {
        const existing = current.find((item) => item.id === product.id);

        if (existing) {
          return current.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
          );
        }

        return [...current, { ...product, quantity }];
      });
      setCartOpen(true);
    };

    const openCart = () => {
      setCartOpen(true);
    };

    const closeCart = () => {
      setCartOpen(false);
    };

    const updateQuantity = (id: string, quantity: number) => {
      setItems((current) => {
        // Dropping below 1 removes the item from the cart.
        if (quantity < 1) {
          return current.filter((item) => item.id !== id);
        }

        return current.map((item) => (item.id === id ? { ...item, quantity } : item));
      });
    };

    const removeItem = (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
    };

    const clearCart = () => {
      setItems([]);
    };

    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

    return { items, itemCount, cartOpen, subtotal, addItem, closeCart, updateQuantity, openCart, removeItem, clearCart };
  }, [cartOpen, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}

export function formatCartMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
