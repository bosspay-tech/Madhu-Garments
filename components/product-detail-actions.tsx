"use client";

import { useState } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { type CartProduct, useCart } from "@/components/cart-provider";
import { ProductShareButton } from "@/components/product-share-button";

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
      <div className="product-secondary-actions">
        <button className="product-soft-action" type="button">
          <Heart size={17} strokeWidth={2} />
          <span>Add to Wishlist</span>
        </button>
        <ProductShareButton productId={product.id} productName={product.name} />
      </div>
    </>
  );
}
