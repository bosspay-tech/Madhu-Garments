"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Product } from "@/lib/products";

type AdminProductEditModalProps = {
  product: Product | null;
  accessToken: string;
  onClose: () => void;
  onSaved: (product: Product) => void;
};

type EditFormState = {
  name: string;
  sku: string;
  brand: string;
  color: string;
  categories: string;
  regularPrice: string;
  salePrice: string;
  stock: string;
  image: string;
  tags: string;
  shortDescription: string;
  description: string;
};

function toFormState(product: Product): EditFormState {
  return {
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    color: product.color,
    categories: product.categories,
    regularPrice: product.regularPrice != null ? String(product.regularPrice) : "",
    salePrice: product.salePrice != null ? String(product.salePrice) : "",
    stock: product.stock != null ? String(product.stock) : "",
    image: product.image,
    tags: product.tags,
    shortDescription: product.shortDescription,
    description: product.description,
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function AdminProductEditModal({ product, accessToken, onClose, onSaved }: AdminProductEditModalProps) {
  const [form, setForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!product) {
      setForm(null);
      setError("");
      return;
    }

    setForm(toFormState(product));
    setError("");
  }, [product]);

  if (!product || !form) {
    return null;
  }

  const updateField = (field: keyof EditFormState, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const regularPrice = parseOptionalNumber(form.regularPrice);
    const salePrice = parseOptionalNumber(form.salePrice);
    const stock = parseOptionalNumber(form.stock);

    if (form.regularPrice.trim() && regularPrice == null) {
      setError("Enter a valid regular price.");
      setSaving(false);
      return;
    }

    if (form.salePrice.trim() && salePrice == null) {
      setError("Enter a valid sale price.");
      setSaving(false);
      return;
    }

    if (form.stock.trim() && stock == null) {
      setError("Enter a valid stock value.");
      setSaving(false);
      return;
    }

    if (regularPrice != null && salePrice != null && salePrice >= regularPrice) {
      setError("Sale price must be lower than regular price.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          brand: form.brand,
          color: form.color,
          categories: form.categories,
          regularPrice,
          salePrice,
          stock,
          image: form.image,
          tags: form.tags,
          shortDescription: form.shortDescription,
          description: form.description,
        }),
      });

      const json = (await response.json()) as { success: boolean; product?: Product; error?: string };

      if (!response.ok || !json.success || !json.product) {
        setError(json.error || "Failed to update product.");
        return;
      }

      onSaved(json.product);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-edit-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="admin-edit-modal-title"
        aria-modal="true"
        className="admin-edit-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="admin-edit-modal-header">
          <div>
            <h2 id="admin-edit-modal-title">Edit product</h2>
            <p>{product.name}</p>
          </div>
          <button className="admin-edit-modal-close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="admin-edit-form" onSubmit={handleSubmit}>
          {error ? <div className="admin-edit-error">{error}</div> : null}

          <div className="admin-edit-grid">
            <label>
              Product name
              <input onChange={(event) => updateField("name", event.target.value)} required value={form.name} />
            </label>
            <label>
              SKU
              <input onChange={(event) => updateField("sku", event.target.value)} value={form.sku} />
            </label>
            <label>
              Brand
              <input onChange={(event) => updateField("brand", event.target.value)} value={form.brand} />
            </label>
            <label>
              Color
              <input onChange={(event) => updateField("color", event.target.value)} value={form.color} />
            </label>
            <label>
              Regular price (₹)
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => updateField("regularPrice", event.target.value)}
                step="0.01"
                type="number"
                value={form.regularPrice}
              />
            </label>
            <label>
              Sale price (₹)
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => updateField("salePrice", event.target.value)}
                step="0.01"
                type="number"
                value={form.salePrice}
              />
            </label>
            <label>
              Stock
              <input
                inputMode="numeric"
                min="0"
                onChange={(event) => updateField("stock", event.target.value)}
                type="number"
                value={form.stock}
              />
            </label>
            <label>
              Image URL
              <input onChange={(event) => updateField("image", event.target.value)} value={form.image} />
            </label>
            <label className="wide">
              Categories
              <input onChange={(event) => updateField("categories", event.target.value)} value={form.categories} />
            </label>
            <label className="wide">
              Tags
              <input onChange={(event) => updateField("tags", event.target.value)} value={form.tags} />
            </label>
            <label className="wide">
              Short description
              <textarea
                onChange={(event) => updateField("shortDescription", event.target.value)}
                rows={3}
                value={form.shortDescription}
              />
            </label>
            <label className="wide">
              Description
              <textarea onChange={(event) => updateField("description", event.target.value)} rows={4} value={form.description} />
            </label>
          </div>

          <div className="admin-edit-actions">
            <button className="admin-edit-cancel" disabled={saving} onClick={onClose} type="button">
              Cancel
            </button>
            <button className="admin-edit-save" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
