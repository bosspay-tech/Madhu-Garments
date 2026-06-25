"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getProductUnitPrice, type Product } from "@/lib/products";

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

type AdminProductsClientProps = {
  products: Product[];
};

function formatMoney(value: number | null) {
  if (value == null || value <= 0) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function shortText(value: string, max = 80) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "—";
  }

  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

export function AdminProductsClient({ products }: AdminProductsClientProps) {
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [query, setQuery] = useState("");

  const sortedProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? products.filter((product) => {
          const searchable = [
            product.name,
            product.sku,
            product.brand,
            product.color,
            product.categories,
            product.tags,
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(normalizedQuery);
        })
      : products;

    const next = [...filtered];

    next.sort((a, b) => {
      if (sort === "price-asc") {
        return getProductUnitPrice(a) - getProductUnitPrice(b) || a.name.localeCompare(b.name);
      }

      if (sort === "price-desc") {
        return getProductUnitPrice(b) - getProductUnitPrice(a) || a.name.localeCompare(b.name);
      }

      if (sort === "name-desc") {
        return b.name.localeCompare(a.name);
      }

      return a.name.localeCompare(b.name);
    });

    return next;
  }, [products, query, sort]);

  const sortLabel =
    sort === "price-asc"
      ? "Price: Low to High"
      : sort === "price-desc"
        ? "Price: High to Low"
        : sort === "name-desc"
          ? "Name: Z to A"
          : "Name: A to Z";

  return (
    <section className="admin-products container">
      <div className="admin-products-toolbar">
        <div className="admin-products-summary">
          <strong>{sortedProducts.length}</strong>
          <span>{sortedProducts.length === 1 ? "product" : "products"}</span>
          {query.trim() ? <span className="admin-products-filter-note">matching &ldquo;{query.trim()}&rdquo;</span> : null}
        </div>

        <div className="admin-products-controls">
          <label className="admin-products-search">
            <span className="sr-only">Search products</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU, brand, color..."
              type="search"
              value={query}
            />
          </label>

          <label className="admin-products-sort">
            <span>Sort by</span>
            <select onChange={(event) => setSort(event.target.value as SortOption)} value={sort}>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </label>
        </div>
      </div>

      <p className="admin-products-sort-note">
        Showing <strong>{sortLabel}</strong>
      </p>

      <div className="admin-products-table-wrap">
        <table className="admin-products-table">
          <thead>
            <tr>
              <th scope="col">Image</th>
              <th scope="col">Product</th>
              <th scope="col">SKU</th>
              <th scope="col">Brand</th>
              <th scope="col">Category</th>
              <th scope="col">Color</th>
              <th scope="col">Regular</th>
              <th scope="col">Sale</th>
              <th scope="col">Price</th>
              <th scope="col">Stock</th>
              <th scope="col">Discount</th>
              <th scope="col">Tags</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.length ? (
              sortedProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.image ? (
                      <img alt={product.name} className="admin-products-thumb" src={product.image} />
                    ) : (
                      <span className="admin-products-empty-thumb">No image</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-products-name-cell">
                      <Link href={`/product/${product.id}`}>{product.name}</Link>
                      <p>{shortText(product.shortDescription || product.description, 110)}</p>
                    </div>
                  </td>
                  <td>{product.sku || "—"}</td>
                  <td>{product.brand || "—"}</td>
                  <td>{shortText(product.categories, 60)}</td>
                  <td>{product.color || "—"}</td>
                  <td>{formatMoney(product.regularPrice)}</td>
                  <td>{formatMoney(product.salePrice)}</td>
                  <td>
                    <strong className="admin-products-price">{product.priceLabel}</strong>
                  </td>
                  <td>{product.stock ?? "—"}</td>
                  <td>{product.discount ? `-${product.discount}%` : "—"}</td>
                  <td>{shortText(product.tags, 70)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="admin-products-empty" colSpan={12}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
