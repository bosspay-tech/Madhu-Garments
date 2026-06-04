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
  const productDescription = buildProductDescription(product, categories);
  const informationRows = buildInformationRows(product, categories, stockLabel);
  const summaryDescription = cleanProductText(product.shortDescription);

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
              {summaryDescription ||
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
        <div className="product-info-grid">
          <article>
            <h2>Description</h2>
            <p>{productDescription}</p>
            <ul className="product-highlights">
              <li>Selected for comfortable wear and neat finishing.</li>
              <li>Suitable for personal orders, gifting, and bulk enquiries.</li>
              <li>Ships across India through trusted courier partners.</li>
            </ul>
          </article>
          <article>
            <h2>Additional Information</h2>
            <table className="additional-info-table">
              <tbody>
                {informationRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </div>
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

function buildProductDescription(product: {
  name: string;
  color: string;
  shortDescription: string;
  description: string;
}, categories: string[]) {
  const importedDescription = cleanProductText(product.shortDescription || product.description);

  if (importedDescription && importedDescription.length <= 420) {
    return importedDescription;
  }

  const category = categories[categories.length - 1] || "garment";
  const color = product.color ? ` in ${product.color}` : "";

  return `${product.name} is a quality ${category.toLowerCase()}${color} from MADHU GARMENTS, selected for a clean look, comfortable wear, and reliable everyday finish.`;
}

function cleanProductText(value: string) {
  return value
    .replace(/\\r\\n|\\n|\\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildInformationRows(product: {
  sku: string;
  color: string;
  categories: string;
  stock: number | null;
  tags: string;
  brand: string;
  description: string;
}, categories: string[], stockLabel: string) {
  const detailText = cleanProductText(product.tags ? `${product.description} ${product.tags}` : product.description);
  const sku = product.sku || getDetailValue(detailText, ["Product Code", "SKU"]);
  const color = product.color || getDetailValue(detailText, ["Colour", "Color"]);
  const material = getDetailValue(detailText, ["Material", "Fabric Details", "Content"]);
  const pattern = getDetailValue(detailText, ["Pattern"]);
  const length = getDetailValue(detailText, ["Length"]);
  const care = getDetailValue(detailText, ["Care Information", "Care"]);
  const rows = [
    { label: "SKU", value: sku || "Available on request" },
    { label: "Color", value: color || "As shown in product image" },
    { label: "Category", value: categories.join(", ") || product.categories || "Apparel" },
    { label: "Brand", value: product.brand || "MADHU GARMENTS" },
    { label: "Availability", value: stockLabel },
    { label: "Shipping", value: "PAN India delivery available" },
    { label: "Care", value: care || "Follow the garment care label for best results" },
  ];

  if (material) {
    rows.splice(3, 0, { label: "Material", value: material });
  }

  if (pattern) {
    rows.splice(3, 0, { label: "Pattern", value: pattern });
  }

  if (length) {
    rows.splice(3, 0, { label: "Length", value: length });
  }

  const tags = product.tags
    .split(",")
    .map((tag) => tag.replace(/\\/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);

  if (tags.length) {
    rows.push({ label: "Tags", value: tags.join(", ") });
  }

  return rows;
}

function getDetailValue(text: string, labels: string[]) {
  const labelPattern = labels.map(escapeRegExp).join("|");
  const stopLabels = [
    "Pattern",
    "Colour",
    "Color",
    "Material",
    "Length",
    "Care Information",
    "Description",
    "Fabric Details",
    "Product Code",
    "Content",
    "SKU",
  ].map(escapeRegExp);
  const match = text.match(new RegExp(`(?:${labelPattern})\\s*:\\s*(.*?)(?=\\s+(?:${stopLabels.join("|")})\\s*:|$)`, "i"));

  return match?.[1]?.trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
