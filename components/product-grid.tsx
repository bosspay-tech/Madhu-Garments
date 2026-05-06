import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/products";

type ProductGridProps = {
  title: string;
  products: Product[];
};

export function ProductGrid({ title, products }: ProductGridProps) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="home-products container">
      <h2>{title}</h2>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
