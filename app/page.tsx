import Link from "next/link";
import { ArrowRight, Headphones, Heart, ShieldCheck, Truck } from "lucide-react";
import { ProductGrid } from "@/components/product-grid";
import { getProducts } from "@/lib/products";

const collectionCards = [
  {
    title: "Trending Design Wear",
    cta: "New Collection",
    image: "https://luxeria.in/wp-content/uploads/2022/02/collection-1.jpg",
  },
  {
    title: "Weekend Collection",
    cta: "Shop Now",
    image: "https://luxeria.in/wp-content/uploads/2022/02/collection-2.jpg",
  },
  {
    title: "It's Cold Outside",
    cta: "Check It Out",
    image: "https://luxeria.in/wp-content/uploads/2022/02/collection-3.jpg",
  },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();
  const withImages = products.filter((product) => product.image);
  const newArrivals = withImages.slice(0, 12);
  const tshirts = withImages.filter((product) => product.categories.includes("T-Shirts")).slice(0, 15);
  const featured = withImages.filter((product) => /jeans|trouser|cargo/i.test(product.categories)).slice(0, 15);
  const popular = withImages.slice(24, 42);

  return (
    <main>
      <section className="home-hero">
        <img className="home-hero-bg" src="/direct-hero-girl.png" alt="MADHU GARMENTS hero" />
        <Link className="dark-button hero-shop-button" href="/shop">
          Shop now <ArrowRight size={15} />
        </Link>
      </section>

      <section className="service-strip">
        <div>
          <Truck size={25} />
          <span>Fast order delivery</span>
        </div>
        <div>
          <Headphones size={25} />
          <span>Support 24/7</span>
        </div>
        <div>
          <ShieldCheck size={25} />
          <span>Secure Payment</span>
        </div>
        <div>
          <Heart size={25} />
          <span>Free Returns</span>
        </div>
      </section>

      <ProductGrid title="New Arrivals" products={newArrivals} />
      <ProductGrid title="T-shirt Collection" products={tshirts} />

      <section className="style-banner">
        <img src="/girlindrygrassfieldforaboutus.png" alt="MADHU GARMENTS style edit" />
        <div className="banner-dots">...</div>
        <h2>
          Elevate <span>your style</span> with <strong>MADHU...</strong>
        </h2>
      </section>

      <ProductGrid title="Featured Items" products={featured} />

      <section className="collection-strip">
        {collectionCards.map((card) => (
          <Link href="/shop" className="collection-card" key={card.title}>
            <img src={card.image} alt={card.title} />
            <div>
              <h3>{card.title}</h3>
              <span>{card.cta}</span>
            </div>
          </Link>
        ))}
      </section>

      <ProductGrid title="Popular Items" products={popular} />
    </main>
  );
}
