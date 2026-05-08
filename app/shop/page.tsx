import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { PageHero } from "@/components/page-hero";
import {
  filterProductsByCategory,
  filterProductsByColor,
  filterProductsByMaxPrice,
  getCategoryCounts,
  getColorCounts,
  getShopProducts,
} from "@/lib/products";
import { Search } from "lucide-react";

const maxSelectablePrice = 20000;

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    color?: string | string[];
    max_price?: string | string[];
  }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const selectedCategory = getSingleParam(params?.category);
  const selectedColor = getSingleParam(params?.color);
  const selectedMaxPrice = getPriceParam(params?.max_price);
  const allProducts = await getShopProducts();
  const categoryProducts = selectedCategory ? filterProductsByCategory(allProducts, selectedCategory) : allProducts;
  const colorProducts = selectedColor ? filterProductsByColor(categoryProducts, selectedColor) : categoryProducts;
  const filteredProducts = filterProductsByMaxPrice(colorProducts, selectedMaxPrice);
  const products = filteredProducts.slice(0, 12);
  const categories = getCategoryCounts(allProducts);
  const colors = getColorCounts(categoryProducts);
  const filterMaxPrice = selectedMaxPrice ?? maxSelectablePrice;
  const resultLabel =
    selectedCategory || selectedColor || selectedMaxPrice
      ? `Showing all ${filteredProducts.length} results`
      : `Showing 1-${products.length} of ${allProducts.length} results`;
  const sharedParams = {
    category: selectedCategory,
    color: selectedColor,
    max_price: selectedMaxPrice ? String(selectedMaxPrice) : "",
  };

  return (
    <main>
      <PageHero title={selectedCategory ? `Category: ${selectedCategory}` : "Shop"} />
      <section className="shop-wrap container">
        <aside className="shop-sidebar">
          <label className="sidebar-search">
            <span>Search products...</span>
            <Search size={18} />
          </label>

          <h3>Categories</h3>
          <ul className="category-list">
            <li>
              <Link className={!selectedCategory ? "active" : ""} href={buildShopHref({ ...sharedParams, category: "" })}>
                <span>All Products</span>
                <em>({allProducts.length})</em>
              </Link>
            </li>
            {categories.slice(0, 24).map((category) => (
              <li key={category.name}>
                <Link
                  className={`${isSelectedFilter(selectedCategory, category.name) ? "active" : ""} ${
                    category.level > 0 ? "is-child" : ""
                  }`}
                  href={buildShopHref({ ...sharedParams, category: category.name })}
                >
                  <span>{category.name}</span>
                  <em>({category.count})</em>
                </Link>
              </li>
            ))}
          </ul>

          <h3>Filter By</h3>
          <form className="price-filter" action="/shop">
            {selectedCategory ? <input name="category" type="hidden" value={selectedCategory} /> : null}
            {selectedColor ? <input name="color" type="hidden" value={selectedColor} /> : null}
            <input
              aria-label="Maximum price"
              defaultValue={filterMaxPrice}
              max={maxSelectablePrice}
              min="0"
              name="max_price"
              step="500"
              type="range"
            />
            <div className="filter-row">
              <button type="submit">Filter</button>
              <span>
                Price: {formatMoney(0)} - {formatMoney(filterMaxPrice)}
              </span>
            </div>
          </form>

          <h3>Color</h3>
          <ul className="category-list small">
            {colors.slice(0, 12).map((color) => (
              <li key={color.name}>
                <Link
                  className={isSelectedFilter(selectedColor, color.name) ? "active" : ""}
                  href={buildShopHref({ ...sharedParams, color: color.name })}
                >
                  <span>{color.name}</span>
                  <em>({color.count})</em>
                </Link>
              </li>
            ))}
            {selectedColor ? (
              <li>
                <Link href={buildShopHref({ ...sharedParams, color: "" })}>Clear color</Link>
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="shop-main">
          <div className="shop-toolbar">
            <span>{resultLabel}</span>
            <select aria-label="Sort products">
              <option>Default sorting</option>
              <option>Sort by popularity</option>
              <option>Sort by latest</option>
            </select>
          </div>
          <div className="shop-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filteredProducts.length > products.length ? (
            <nav className="pagination" aria-label="Pagination">
              <strong>1</strong>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>...</span>
              <span>{Math.ceil(filteredProducts.length / 12)}</span>
              <span>NEXT</span>
            </nav>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function isSelectedFilter(selected: string, value: string) {
  return selected.trim().toLowerCase() === value.trim().toLowerCase();
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getPriceParam(value: string | string[] | undefined) {
  const price = Number(getSingleParam(value));
  return Number.isFinite(price) && price > 0 ? price : null;
}

function buildShopHref(params: { category?: string; color?: string; max_price?: string }) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const queryString = query.toString();
  return queryString ? `/shop?${queryString}` : "/shop";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
