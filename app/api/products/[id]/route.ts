import { NextResponse } from "next/server";
import { getProductById, getProductUnitPrice } from "@/lib/products";

type ProductRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ProductRouteProps) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        image: product.image,
        priceLabel: product.priceLabel,
        unitPrice: getProductUnitPrice(product),
      },
    });
  } catch (error) {
    console.error("product fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
