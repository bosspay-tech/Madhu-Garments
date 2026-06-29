import { NextResponse } from "next/server";

const MAX_SUBTOTAL_FOR_PROMO = 1599;

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
    maxSubtotal: MAX_SUBTOTAL_FOR_PROMO,
  });
}
