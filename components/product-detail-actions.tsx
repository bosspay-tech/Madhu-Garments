"use client";

import { useState } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { type CartProduct, useCart } from "@/components/cart-provider";

type ProductDetailActionsProps = {
  product: CartProduct;
};

export function ProductDetailActions({ product }: ProductDetailActionsProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const addToCart = () => {
    addItem(product, quantity);
  };

  return (
    <>
      <div className="product-actions">
        <div className="quantity-stepper" aria-label="Quantity selector">
          <button
            aria-label="Decrease quantity"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            type="button"
          >
            <Minus size={15} />
          </button>
          <span>{quantity}</span>
          <button aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} type="button">
            <Plus size={15} />
          </button>
        </div>
        <button className="product-add-button" onClick={addToCart} type="button">
          Add to Cart
        </button>
      </div>
      <button className="product-wishlist-link" type="button">
        <Heart size={18} />
        Add to Wishlist
      </button>
    </>
  );
}
