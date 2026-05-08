import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_STORE_ID = "all-store";
const CSV_PRODUCT_TYPE = "madhu-products-csv";
const root = process.cwd();

loadDotEnv(path.join(root, ".env"));

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase config. Add NEXT_PUBLIC_SUPABASE_URL and a writable Supabase key to .env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const csvPath = path.join(root, "products.csv");
const csv = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(csv);
const variationPrices = getVariationPrices(rows);
const products = rows
  .map((row, index) => toProduct(row, index, variationPrices.get(row.ID)))
  .filter((product) => product && product.title && product.image_url && Number(product.base_price) > 0);

console.log(`Parsed ${products.length} storefront products from products.csv.`);

const { error: deleteError } = await supabase
  .from("products")
  .delete()
  .eq("store_id", PRODUCT_STORE_ID)
  .eq("type", CSV_PRODUCT_TYPE);

if (deleteError) {
  console.error("Failed to delete previous Madhu CSV products:", deleteError.message);
  process.exit(1);
}

let optionalColumns = ["mrp", "short_description", "sku", "color", "tags", "brand", "stock", "description_html", "badge"];
let inserted = false;

while (!inserted) {
  const payload = products.map((product) => withColumns(product, optionalColumns));
  const { error } = await insertInBatches(payload);

  if (!error) {
    inserted = true;
    break;
  }

  const missingColumn = optionalColumns.find((column) => mentionsColumn(error.message, column));
  if (!missingColumn) {
    console.error("Failed to insert CSV products:", error.message);
    process.exit(1);
  }

  optionalColumns = optionalColumns.filter((column) => column !== missingColumn);
  console.warn(`Column '${missingColumn}' is not available in Supabase; retrying without it.`);
}

console.log(`Inserted ${products.length} Madhu CSV products into Supabase.`);
console.log(`Store filter: store_id='${PRODUCT_STORE_ID}', type='${CSV_PRODUCT_TYPE}'`);

async function insertInBatches(payload) {
  const batchSize = 100;

  for (let index = 0; index < payload.length; index += batchSize) {
    const batch = payload.slice(index, index + batchSize);
    const { error } = await supabase.from("products").insert(batch);

    if (error) {
      return { error };
    }
  }

  return { error: null };
}

function withColumns(product, optionalColumns) {
  const base = {
    store_id: product.store_id,
    title: product.title,
    description: product.description,
    base_price: product.base_price,
    categories: product.categories,
    type: product.type,
    is_active: product.is_active,
    image_url: product.image_url,
    slug: product.slug,
  };

  for (const column of optionalColumns) {
    base[column] = product[column] ?? null;
  }

  return base;
}

function mentionsColumn(message, column) {
  const lower = message.toLowerCase();
  return lower.includes(`'${column.toLowerCase()}'`) || lower.includes(`"${column.toLowerCase()}"`);
}

function toProduct(row, index, fallbackPrice) {
  const regularPrice = parsePrice(row["Regular price"]) ?? fallbackPrice?.regularPrice ?? null;
  const salePrice = parsePrice(row["Sale price"]) ?? fallbackPrice?.salePrice ?? null;
  const currentPrice = salePrice ?? regularPrice;
  const discount =
    regularPrice && salePrice && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : null;

  return {
    store_id: PRODUCT_STORE_ID,
    title: row.Name?.trim() ?? "",
    description: cleanHtml(row.Description ?? ""),
    short_description: cleanHtml(row["Short description"] ?? ""),
    base_price: currentPrice,
    mrp: regularPrice && salePrice && salePrice < regularPrice ? regularPrice : null,
    categories: categoriesToArray(row.Categories),
    type: CSV_PRODUCT_TYPE,
    is_active: true,
    image_url: firstImage(row.Images),
    slug: `madhu-csv-${String(index).padStart(5, "0")}-${slugify(row.ID || row.Name || String(index))}`,
    sku: row.SKU?.trim() ?? "",
    color: getProductColor(row),
    tags: row.Tags ?? "",
    brand: row.Brands ?? "",
    stock: parseStock(row.Stock),
    description_html: row.Description ?? "",
    badge: discount ? `-${discount}%` : null,
  };
}

function getVariationPrices(rows) {
  const prices = new Map();

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

    if (regularPrice && regularPrice > 0) bucket.regularPrices.push(regularPrice);
    if (salePrice && salePrice > 0) bucket.salePrices.push(salePrice);

    prices.set(parentId, bucket);
  }

  return new Map(
    Array.from(prices, ([parentId, price]) => {
      const salePrice = price.salePrices.length ? Math.min(...price.salePrices) : null;
      const regularPrice = price.regularPrices.length ? Math.min(...price.regularPrices) : Math.min(...price.currentPrices);

      return [parentId, { regularPrice, salePrice }];
    }),
  );
}

function categoriesToArray(value = "") {
  return value
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
}

function getProductColor(row) {
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
  return (
    value
      .split(",")
      .map((image) => image.trim())
      .find((image) => image.startsWith("http")) ?? ""
  );
}

function parsePrice(value = "") {
  const clean = value.replace(/,/g, "").trim();
  if (!clean) return null;

  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function parseStock(value = "") {
  const clean = value.replace(/,/g, "").trim();
  if (!clean) return null;

  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseCsv(csv) {
  const rows = [];
  let current = "";
  let row = [];
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
    headers.reduce((record, header, index) => {
      record[header.replace(/^\uFEFF/, "")] = dataRow[index] ?? "";
      return record;
    }, {}),
  );
}

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}
