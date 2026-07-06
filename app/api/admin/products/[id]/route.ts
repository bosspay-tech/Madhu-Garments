import { NextResponse } from "next/server";
import { updateAdminProduct } from "@/lib/admin-products";
import { requireAdminFromRequest } from "@/lib/admin-auth";

type ProductRouteProps = {
  params: Promise<{ id: string }>;
};

function toOptionalNumber(value: unknown) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function PATCH(request: Request, { params }: ProductRouteProps) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) {
      return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const { product, error } = await updateAdminProduct(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      sku: typeof body.sku === "string" ? body.sku : undefined,
      brand: typeof body.brand === "string" ? body.brand : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      categories: typeof body.categories === "string" ? body.categories : undefined,
      image: typeof body.image === "string" ? body.image : undefined,
      tags: typeof body.tags === "string" ? body.tags : undefined,
      shortDescription: typeof body.shortDescription === "string" ? body.shortDescription : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      stock: body.stock !== undefined ? toOptionalNumber(body.stock) : undefined,
      regularPrice: body.regularPrice !== undefined ? toOptionalNumber(body.regularPrice) : undefined,
      salePrice: body.salePrice !== undefined ? toOptionalNumber(body.salePrice) : undefined,
    });

    if (error || !product) {
      return NextResponse.json({ success: false, error: error || "Failed to update product." }, { status: 400 });
    }

    return NextResponse.json({ success: true, product }, { status: 200 });
  } catch (error) {
    console.error("admin product update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
