import fs from "node:fs";
import path from "node:path";

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

type Row = Record<string, string>;

let cache: Product[] | null = null;

export function getProducts(): Product[] {
  if (cache) {
    return cache;
  }

  const file = path.join(process.cwd(), "products.csv");
  const csv = fs.readFileSync(file, "utf8");
  const rows = parseCsv(csv);
  const variationPrices = getVariationPrices(rows);

  cache = rows
    .map((row, index) => toProduct(row, index, variationPrices.get(row.ID)))
    .filter((product): product is Product => Boolean(product?.name && product.image && getProductUnitPrice(product) > 0));

  return cache;
}

export function getShopProducts(): Product[] {
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

  const products = getProducts();
  const chosen = preferredNames
    .map((name) => products.find((product) => product.name.toLowerCase().includes(name.toLowerCase())))
    .filter((product): product is Product => Boolean(product));
  const chosenIds = new Set(chosen.map((product) => product.id));
  const rest = products.filter((product) => !chosenIds.has(product.id));

  return [...chosen, ...rest];
}

export function getCategoryCounts(): CategoryCount[] {
  const counts = new Map<string, number>();
  const levels = new Map<string, number>();

  for (const product of getProducts()) {
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

export function getColorCounts(products = getProducts()): FilterCount[] {
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

export function getProductById(id: string): Product | undefined {
  return getProducts().find((product) => product.id === id);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const category = product.categories
    .split(",")
    .map((part) => part.trim().split(">").pop()?.trim())
    .find(Boolean);

  return getProducts()
    .filter((item) => item.id !== product.id)
    .filter((item) => (category ? item.categories.includes(category) : true))
    .slice(0, limit);
}

export function getProductUnitPrice(product: Product): number {
  return product.salePrice ?? product.regularPrice ?? 0;
}

function toProduct(row: Row, index: number, fallbackPrice?: ProductPrice): Product | null {
  const image = firstImage(row.Images);
  const regularPrice = parsePrice(row["Regular price"]) ?? fallbackPrice?.regularPrice ?? null;
  const salePrice = parsePrice(row["Sale price"]) ?? fallbackPrice?.salePrice ?? null;
  const discount =
    regularPrice && salePrice && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : null;

  return {
    id: row.ID || `${index}`,
    name: row.Name?.trim() ?? "",
    sku: row.SKU?.trim() ?? "",
    color: getProductColor(row),
    image,
    categories: row.Categories ?? "",
    shortDescription: cleanHtml(row["Short description"] ?? ""),
    description: cleanHtml(row.Description ?? ""),
    descriptionHtml: row.Description ?? "",
    stock: parseStock(row.Stock),
    tags: row.Tags ?? "",
    brand: row.Brands ?? "",
    regularPrice,
    salePrice,
    priceLabel: formatPrice(regularPrice, salePrice),
    discount,
  };
}

type ProductPrice = {
  regularPrice: number | null;
  salePrice: number | null;
};

function getVariationPrices(rows: Row[]) {
  const prices = new Map<string, { regularPrices: number[]; salePrices: number[]; currentPrices: number[] }>();

  for (const row of rows) {
    if (row.Type !== "variation" || !row.Parent?.startsWith("id:")) {
      continue;
    }

    const parentId = row.Parent.replace("id:", "").trim();
    const regularPrice = parsePrice(row["Regular price"]);
    const salePrice = parsePrice(row["Sale price"]);
    const currentPrice = salePrice ?? regularPrice;

    if (!currentPrice || currentPrice <= 0) {
      continue;
    }

    const bucket = prices.get(parentId) ?? { regularPrices: [], salePrices: [], currentPrices: [] };
    bucket.currentPrices.push(currentPrice);

    if (regularPrice && regularPrice > 0) {
      bucket.regularPrices.push(regularPrice);
    }

    if (salePrice && salePrice > 0) {
      bucket.salePrices.push(salePrice);
    }

    prices.set(parentId, bucket);
  }

  return new Map(
    Array.from(prices, ([parentId, price]) => {
      const salePrice = price.salePrices.length ? Math.min(...price.salePrices) : null;
      const regularPrice = price.regularPrices.length ? Math.min(...price.regularPrices) : Math.min(...price.currentPrices);

      return [parentId, { regularPrice, salePrice }] as const;
    }),
  );
}

function getProductColor(row: Row) {
  const attributePairs = [
    ["Attribute 1 name", "Attribute 1 value(s)"],
    ["Attribute 2 name", "Attribute 2 value(s)"],
    ["Attribute 3 name", "Attribute 3 value(s)"],
  ];

  for (const [nameKey, valueKey] of attributePairs) {
    if (row[nameKey]?.trim().toLowerCase() === "color") {
      return row[valueKey]?.replace(/\\/g, "").trim() ?? "";
    }
  }

  return "";
}

function cleanHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function firstImage(value = "") {
  return value
    .split(",")
    .map((image) => image.trim())
    .find((image) => image.startsWith("http")) ?? "";
}

function parsePrice(value = "") {
  const clean = value.replace(/,/g, "").trim();
  if (!clean) {
    return null;
  }

  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function parseStock(value = "") {
  const clean = value.replace(/,/g, "").trim();
  if (!clean) {
    return null;
  }

  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
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

function parseCsv(csv: string): Row[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((dataRow) =>
    headers.reduce<Row>((record, header, index) => {
      record[header.replace(/^\uFEFF/, "")] = dataRow[index] ?? "";
      return record;
    }, {}),
  );
}
