import { NextResponse } from "next/server";

const MAX_SUBTOTAL_FOR_PROMO = 1599;

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      subtotal?: number;
    };

    const code = normalizeCode(body.code);
    const subtotal = Number(body.subtotal || 0);

    if (!code) {
      return NextResponse.json({ success: false, error: "Promo code is required." }, { status: 400 });
    }

    const configuredCode = normalizeCode(process.env.PROMO_CODE || "");
    const discountRupees = Number(process.env.PROMO_DISCOUNT_RUPEES || 0);

    if (!configuredCode || discountRupees <= 0) {
      return NextResponse.json({ success: false, error: "Promo codes are not configured." }, { status: 503 });
    }

    if (code !== configuredCode) {
      return NextResponse.json({ success: false, error: "Invalid promo code." }, { status: 400 });
    }

    const afterOffer = Math.max(0, subtotal);
    if (afterOffer > MAX_SUBTOTAL_FOR_PROMO) {
      return NextResponse.json(
        {
          success: false,
          error: `Promo code is valid only on orders of ₹${MAX_SUBTOTAL_FOR_PROMO} or less.`,
        },
        { status: 400 },
      );
    }
    let discount = Math.floor(discountRupees);

    discount = Math.max(0, Math.min(discount, afterOffer));

    return NextResponse.json({ success: true, discount }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

