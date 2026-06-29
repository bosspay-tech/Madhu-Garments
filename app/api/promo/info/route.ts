import { NextResponse } from "next/server";

export async function GET() {
  const code = (process.env.PROMO_CODE || "").trim().toUpperCase();
  const discountRupees = Number(process.env.PROMO_DISCOUNT_RUPEES || 0);

  if (!code || discountRupees <= 0) {
    return NextResponse.json({ available: false }, { status: 200 });
  }

  return NextResponse.json({
    available: true,
    code,
    discountRupees,
  });
}
