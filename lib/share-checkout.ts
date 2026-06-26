function shareProductLoadedKey(productId: string) {
  return `madhu-share-product-loaded:${productId}`;
}

export function isShareProductLoaded(productId: string) {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(shareProductLoadedKey(productId)) === "1";
}

export function markShareProductLoaded(productId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(shareProductLoadedKey(productId), "1");
}

export function buildProductShareCheckoutUrl(productId: string, origin?: string) {
  const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const path = `/checkout?product=${encodeURIComponent(productId)}&share=1`;
  return base ? `${base}${path}` : path;
}
