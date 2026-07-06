import { NextResponse } from "next/server";
import { getAdminProducts } from "@/lib/admin-products";
import { requireAdminFromRequest } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) {
      return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
    }

    const products = await getAdminProducts();
    return NextResponse.json({ success: true, products }, { status: 200 });
  } catch (error) {
    console.error("admin products error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

