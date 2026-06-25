import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getProducts, productFromRow, type Product } from "@/lib/products";
import { getSupabase } from "@/lib/supabase";
import { CSV_PRODUCT_TYPE, PRODUCT_STORE_ID } from "@/lib/store";

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
