import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { getProductById, getProductUnitPrice, getRelatedProducts } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  return {
    title: product ? `${product.name} | MADHU GARMENTS` : "Product | MADHU GARMENTS",
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(product, 4);
  const categories = Array.from(
    new Set(
      product.categories
        .split(",")
        .flatMap((part) => part.split(">"))
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
  const breadcrumbCategories = product.categories
    .split(",")
    .map((part) => part.trim().split(">").pop()?.trim())
    .filter(Boolean)
    .slice(0, 2);
  const tags = product.tags
    .split(",")
    .map((tag) => tag.replace(/\\/g, "").trim())
    .filter(Boolean);
  const hasSalePrice = Boolean(product.regularPrice && product.salePrice && product.salePrice < product.regularPrice);
  const stockLabel = product.stock ? `${product.stock} in stock` : "In stock";

  return (
    <main className="product-page">
      <section className="product-detail-band">
        <div className="product-topline container">
          <p className="breadcrumb-line">
            Home / Shop {breadcrumbCategories.map((category) => ` / ${category}`).join("")} / {product.name}
          </p>
          <p className="product-nav-line">Previous <span>|</span> Next</p>
        </div>
        <div className="product-detail container">
          <div className="product-gallery">
            {product.discount ? <span className="sale-badge">-{product.discount}%</span> : null}
            <img src={product.image} alt={product.name} />
            <button aria-label="View larger product image" className="image-expand-button" type="button">
              +
            </button>
          </div>
          <div className="product-summary">
            <h1>{product.name}</h1>
            <p className="product-detail-price">
              {hasSalePrice ? <del>{formatMoney(product.regularPrice ?? 0)}</del> : null}
              <span>{product.priceLabel}</span>
            </p>
            <p className="product-copy">
              {product.shortDescription ||
                "Premium MADHU GARMENTS clothing selected for comfort, finish, and everyday occasion-ready styling."}
            </p>
            <div className="stock-block">
              <span>{stockLabel}</span>
              <div />
            </div>
            <ProductDetailActions
              product={{
                id: product.id,
                name: product.name,
                image: product.image,
                priceLabel: product.priceLabel,
                unitPrice: getProductUnitPrice(product),
              }}
            />
            <div className="product-meta">
              {product.sku ? (
                <p>
                  <span>SKU:</span> {product.sku}
                </p>
              ) : null}
              {categories.length ? (
                <p>
                  <span>Categories:</span> {categories.join(", ")}
                </p>
              ) : null}
              {tags.length ? (
                <p>
                  <span>Tags:</span> {tags.join(", ")}
                </p>
              ) : null}
              {product.brand ? (
                <p>
                  <span>Brand:</span> {product.brand}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="product-description container">
        <div className="product-tabs" role="tablist" aria-label="Product information">
          <button className="active" type="button">Description</button>
          <button type="button">Additional Information</button>
          <button type="button">Reviews (0)</button>
        </div>
        {product.descriptionHtml ? (
          <div className="description-html" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
        ) : (
          <p>{product.description || product.shortDescription || "A refined wardrobe piece from MADHU GARMENTS."}</p>
        )}
      </section>

      {related.length ? (
        <section className="related-products container">
          <h2>Related Products</h2>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
