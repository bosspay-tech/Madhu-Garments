"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const unitPrice = product.salePrice ?? product.regularPrice ?? 0;
  const hasSalePrice = Boolean(product.regularPrice && product.salePrice && product.salePrice < product.regularPrice);

  return (
    <article className="product-card">
      <Link className="product-image" href={`/product/${product.id}`}>
        {product.discount ? <span className="sale-badge">-{product.discount}%</span> : null}
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <h3>
        <Link href={`/product/${product.id}`}>{product.name}</Link>
      </h3>
      <p className="price">
        {hasSalePrice ? <del>{formatMoney(product.regularPrice ?? 0)}</del> : null}
        <span>{product.priceLabel}</span>
      </p>
      <button
        className="add-cart-button"
        onClick={() =>
          addItem({
            id: product.id,
            name: product.name,
            image: product.image,
            priceLabel: product.priceLabel,
            unitPrice,
          })
        }
        type="button"
      >
        <ShoppingBag size={14} />
        Add to Cart
      </button>
      <button className="wishlist" type="button">
        <Heart size={13} />
        Add to Wishlist
      </button>
    </article>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
