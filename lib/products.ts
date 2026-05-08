import { getSupabase } from "@/lib/supabase";
import { CSV_PRODUCT_TYPE, PRODUCT_STORE_ID } from "@/lib/store";

export { CSV_PRODUCT_TYPE, PRODUCT_STORE_ID };

export type Product = {
  id: string;
  name: string;
  sku: string;
  color: string;
  image: string;
  categories: string;
  shortDescription: string;
  description: string;
  descriptionHtml: string;
  stock: number | null;
  tags: string;
  brand: string;
  regularPrice: number | null;
  salePrice: number | null;
  priceLabel: string;
  discount: number | null;
};

export type CategoryCount = {
  name: string;
  count: number;
  level: number;
};

export type FilterCount = {
  name: string;
  count: number;
};

type ProductRow = Record<string, unknown>;

let cache: Product[] | null = null;

export async function getProducts(): Promise<Product[]> {
  if (cache) {
    return cache;
  }

  const { data, error } = await getSupabase()
    .from("products")
    .select("*")
    .eq("store_id", PRODUCT_STORE_ID)
    .eq("type", CSV_PRODUCT_TYPE)
    .eq("is_active", true)
    .order("slug", { ascending: true });

  if (error) {
    console.error("Failed to load DB products:", error.message);
    cache = [];
    return cache;
  }

  cache = (data ?? []).map(toProduct).filter((product): product is Product => Boolean(product?.name && product.image));
  return cache;
}

export async function getShopProducts(): Promise<Product[]> {
  const preferredNames = [
    "Abstract Blue Print Oversized T-Shirt",
    "ADRO Men's 100% Cotton Regular Fit T-Shirt",
    "ADRO Men's Cotton Regular Fit T-Shirt",
    "Aervolt ShadowFit Varsity Jacket",
    "Amber Modal Co-ord Set",
    "AMETHYST GALAXY COCKTAIL SAREE",
    "Antara-Pink Banarasi Silk Saree",
    "Aqua Dive Gown",
    "Aspen Over-Sized Sweater",
    "Aurelian Edge Structured Luxe Jacket",
    "Avocet Modal Shirt",
  ];

  const products = await getProducts();
  const chosen = preferredNames
    .map((name) => products.find((product) => product.name.toLowerCase().includes(name.toLowerCase())))
    .filter((product): product is Product => Boolean(product));
  const chosenIds = new Set(chosen.map((product) => product.id));
  const rest = products.filter((product) => !chosenIds.has(product.id));

  return [...chosen, ...rest];
}

export function getCategoryCounts(products: Product[]): CategoryCount[] {
  const counts = new Map<string, number>();
  const levels = new Map<string, number>();

  for (const product of products) {
    const parts = getProductCategoryParts(product);

    for (const part of parts) {
      counts.set(part, (counts.get(part) ?? 0) + 1);
      if (!levels.has(part)) {
        levels.set(part, getCategoryLevel(product.categories, part));
      }
    }
  }

  return Array.from(counts, ([name, count]) => ({ name, count, level: levels.get(name) ?? 0 }))
    .filter((category) => category.name !== "")
    .sort((a, b) => a.level - b.level || b.count - a.count || a.name.localeCompare(b.name));
}

export function filterProductsByCategory(products: Product[], category: string): Product[] {
  const selected = normalizeCategory(category);

  if (!selected) {
    return products;
  }

  return products.filter((product) =>
    Array.from(getProductCategoryParts(product)).some((part) => normalizeCategory(part) === selected),
  );
}

export function filterProductsByColor(products: Product[], color: string): Product[] {
  const selected = normalizeCategory(color);

  if (!selected) {
    return products;
  }

  return products.filter((product) =>
    product.color
      .split(",")
      .map((part) => normalizeCategory(part))
      .includes(selected),
  );
}

export function filterProductsByMaxPrice(products: Product[], maxPrice: number | null): Product[] {
  if (!maxPrice || maxPrice <= 0) {
    return products;
  }

  return products.filter((product) => getProductUnitPrice(product) <= maxPrice);
}

export function getColorCounts(products: Product[]): FilterCount[] {
  const counts = new Map<string, number>();

  for (const product of products) {
    const colors = product.color
      .split(",")
      .map((color) => color.trim())
      .filter(Boolean);

    for (const color of new Set(colors)) {
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.id === id);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const category = product.categories
    .split(",")
    .map((part) => part.trim().split(">").pop()?.trim())
    .find(Boolean);
  const products = await getProducts();

  return products
    .filter((item) => item.id !== product.id)
    .filter((item) => (category ? item.categories.includes(category) : true))
    .slice(0, limit);
}

export function getProductUnitPrice(product: Product): number {
  return product.salePrice ?? product.regularPrice ?? 0;
}

function toProduct(row: ProductRow): Product | null {
  const basePrice = toNumber(row.base_price);
  const mrp = toNumber(row.mrp);
  const salePrice = mrp && basePrice && basePrice < mrp ? basePrice : null;
  const regularPrice = mrp ?? basePrice;
  const discount =
    regularPrice && salePrice && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : null;

  return {
    id: toString(row.id),
    name: toString(row.title),
    sku: toString(row.sku),
    color: toString(row.color),
    image: toString(row.image_url),
    categories: categoriesToString(row.categories),
    shortDescription: cleanHtml(toString(row.short_description)),
    description: cleanHtml(toString(row.description)),
    descriptionHtml: toString(row.description_html) || toString(row.description),
    stock: toNumber(row.stock),
    tags: toString(row.tags),
    brand: toString(row.brand),
    regularPrice,
    salePrice,
    priceLabel: formatPrice(regularPrice, salePrice),
    discount,
  };
}

function toString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const clean = toString(value).replace(/,/g, "");
  if (!clean) {
    return null;
  }

  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function categoriesToString(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(toString).filter(Boolean).join(", ");
  }

  return toString(value);
}

function cleanHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrice(regular: number | null, sale: number | null) {
  const money = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  if (regular && sale && sale < regular) {
    return money(sale);
  }

  if (sale) {
    return money(sale);
  }

  if (regular) {
    return money(regular);
  }

  return money(0);
}

function getProductCategoryParts(product: Product) {
  return new Set(
    product.categories
      .split(",")
      .flatMap((category) => category.split(">"))
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function getCategoryLevel(categories: string, name: string) {
  for (const category of categories.split(",")) {
    const parts = category
      .split(">")
      .map((part) => part.trim())
      .filter(Boolean);
    const index = parts.findIndex((part) => normalizeCategory(part) === normalizeCategory(name));

    if (index >= 0) {
      return index;
    }
  }

  return 0;
}

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}
