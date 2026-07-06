import { getSupabaseAdmin } from "@/lib/supabase-server";
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
): Promise<{ product: Product | null; error?: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { product: null, error: "Server database access is not configured." };
  }

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) update.title = input.name.trim();
  if (input.sku !== undefined) update.sku = input.sku.trim();
  if (input.brand !== undefined) update.brand = input.brand.trim();
  if (input.color !== undefined) update.color = input.color.trim();
  if (input.categories !== undefined) update.categories = input.categories.trim();
  if (input.image !== undefined) update.image_url = input.image.trim();
  if (input.tags !== undefined) update.tags = input.tags.trim();
  if (input.shortDescription !== undefined) update.short_description = input.shortDescription.trim();
  if (input.description !== undefined) update.description = input.description.trim();
  if (input.stock !== undefined) update.stock = input.stock;

  if (input.regularPrice !== undefined || input.salePrice !== undefined) {
    const regularPrice = input.regularPrice ?? null;
    const salePrice = input.salePrice ?? null;

    if (regularPrice != null) {
      update.mrp = regularPrice;
    }

    if (salePrice != null && regularPrice != null && salePrice < regularPrice) {
      update.base_price = salePrice;
    } else if (regularPrice != null) {
      update.base_price = regularPrice;
    } else if (salePrice != null) {
      update.base_price = salePrice;
      update.mrp = salePrice;
    }
  }

  if (!Object.keys(update).length) {
    return { product: null, error: "No changes to save." };
  }

  const { data, error } = await client
    .from("products")
    .update(update)
    .eq("id", id)
    .eq("store_id", PRODUCT_STORE_ID)
    .eq("type", CSV_PRODUCT_TYPE)
    .select("*")
    .single();

  if (error) {
    return { product: null, error: error.message };
  }

  clearProductsCache();

  const product = productFromRow(data as Record<string, unknown>);
  if (!product) {
    return { product: null, error: "Updated product could not be loaded." };
  }

  return { product };
}
