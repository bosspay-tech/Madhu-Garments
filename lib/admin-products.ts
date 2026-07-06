import { getSupabaseAdmin, getSupabaseWithAccessToken } from "@/lib/supabase-server";
import { clearProductsCache, getProducts, productFromRow, type Product } from "@/lib/products";
import { getSupabase } from "@/lib/supabase";
import { CSV_PRODUCT_TYPE, PRODUCT_STORE_ID } from "@/lib/store";

export type AdminProductUpdateInput = {
  name?: string;
  sku?: string;
  brand?: string;
  color?: string;
  categories?: string;
  regularPrice?: number | null;
  salePrice?: number | null;
  stock?: number | null;
  image?: string;
  tags?: string;
  shortDescription?: string;
  description?: string;
};

function categoriesToArray(value: string) {
  return value
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
}

function getAdminWriteClient(accessToken?: string) {
  return getSupabaseAdmin() ?? (accessToken ? getSupabaseWithAccessToken(accessToken) : null);
}

function extractMissingColumn(message: string) {
  const quoted = message.match(/'([^']+)'\s+column/i);
  if (quoted?.[1]) {
    return quoted[1];
  }

  const doubleQuoted = message.match(/"([^"]+)"\s+column/i);
  return doubleQuoted?.[1] ?? null;
}

async function runProductUpdate(
  client: NonNullable<ReturnType<typeof getAdminWriteClient>>,
  id: string,
  update: Record<string, unknown>,
) {
  let payload = { ...update };
  const maxAttempts = Object.keys(update).length + 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await client
      .from("products")
      .update(payload)
      .eq("id", id)
      .eq("store_id", PRODUCT_STORE_ID)
      .eq("type", CSV_PRODUCT_TYPE)
      .select("*")
      .maybeSingle();

    if (!error) {
      return { data, error: null };
    }

    const missingColumn = extractMissingColumn(error.message);
    if (!missingColumn || !(missingColumn in payload)) {
      return { data: null, error };
    }

    const nextPayload = { ...payload };
    delete nextPayload[missingColumn];
    payload = nextPayload;

    if (!Object.keys(payload).length) {
      return {
        data: null,
        error: { message: "No supported product fields could be updated in the database." },
      };
    }
  }

  return { data: null, error: { message: "Failed to update product." } };
}

export async function getAdminProducts(): Promise<Product[]> {
  const client = getSupabaseAdmin() ?? getSupabase();
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("store_id", PRODUCT_STORE_ID)
    .eq("type", CSV_PRODUCT_TYPE)
    .order("title", { ascending: true });

  if (error) {
    console.error("Failed to load admin products:", error.message);
    return getProducts();
  }

  return (data ?? [])
    .map((row) => productFromRow(row as Record<string, unknown>))
    .filter((product): product is Product => Boolean(product?.name));
}

export async function updateAdminProduct(
  id: string,
  input: AdminProductUpdateInput,
  options?: { accessToken?: string },
): Promise<{ product: Product | null; error?: string }> {
  const client = getAdminWriteClient(options?.accessToken);
  if (!client) {
    return {
      product: null,
      error: "Cannot save product changes. Add SUPABASE_SERVICE_ROLE_KEY in server env, or allow admin updates in Supabase.",
    };
  }

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) update.title = input.name.trim();
  if (input.sku !== undefined) update.sku = input.sku.trim();
  if (input.brand !== undefined) update.brand = input.brand.trim();
  if (input.color !== undefined) update.color = input.color.trim();
  if (input.categories !== undefined) update.categories = categoriesToArray(input.categories);
  if (input.image !== undefined) update.image_url = input.image.trim();
  if (input.tags !== undefined) update.tags = input.tags.trim();
  if (input.shortDescription !== undefined) update.short_description = input.shortDescription.trim();
  if (input.description !== undefined) update.description = input.description.trim();
  if (input.stock !== undefined) update.stock = input.stock;

  if (input.regularPrice !== undefined || input.salePrice !== undefined) {
    const regularPrice = input.regularPrice ?? null;
    const salePrice = input.salePrice ?? null;

    if (salePrice != null && regularPrice != null && salePrice < regularPrice) {
      update.mrp = regularPrice;
      update.base_price = salePrice;
    } else if (regularPrice != null) {
      update.base_price = regularPrice;
      update.mrp = null;
    } else if (salePrice != null) {
      update.base_price = salePrice;
      update.mrp = null;
    } else {
      update.base_price = null;
      update.mrp = null;
    }
  }

  if (!Object.keys(update).length) {
    return { product: null, error: "No changes to save." };
  }

  const { data, error } = await runProductUpdate(client, id, update);

  if (error) {
    return { product: null, error: error.message };
  }

  if (!data) {
    return { product: null, error: "Product not found or update was blocked by database permissions." };
  }

  clearProductsCache();

  const product = productFromRow(data as Record<string, unknown>);
  if (!product) {
    return { product: null, error: "Updated product could not be loaded." };
  }

  return { product };
}
