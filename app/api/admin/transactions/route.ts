import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) {
      return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const query = searchParams.get("query") || "";
    const status = searchParams.get("status") || "all";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const sort = searchParams.get("sort") || "date-desc";

    const client = getSupabaseAdmin() ?? getSupabase();
    
    // 1. Build query for paginated results
    let queryBuilder = client
      .from("bosspay_txns")
      .select("*", { count: "exact" });

    // Apply query filters
    if (query) {
      queryBuilder = queryBuilder.or(`txn_id.ilike.%${query}%,pg_transaction_id.ilike.%${query}%,pg_type.ilike.%${query}%`);
    }

    if (status && status !== "all") {
      if (status === "success") {
        queryBuilder = queryBuilder.in("payment_status", ["success", "paid", "captured"]);
      } else if (status === "failed") {
        queryBuilder = queryBuilder.in("payment_status", ["failed", "failure", "cancelled", "declined"]);
      } else if (status === "pending") {
        queryBuilder = queryBuilder.in("payment_status", ["pending", "processing"]);
      }
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      queryBuilder = queryBuilder.gte("created_at", start.toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder = queryBuilder.lte("created_at", end.toISOString());
    }

    // Apply sorting
    if (sort === "date-asc") {
      queryBuilder = queryBuilder.order("created_at", { ascending: true });
    } else if (sort === "date-desc") {
      queryBuilder = queryBuilder.order("created_at", { ascending: false });
    } else if (sort === "amount-asc") {
      queryBuilder = queryBuilder.order("amount_paisa", { ascending: true });
    } else if (sort === "amount-desc") {
      queryBuilder = queryBuilder.order("amount_paisa", { ascending: false });
    } else {
      queryBuilder = queryBuilder.order("created_at", { ascending: false });
    }

    // Apply pagination range
    const from = (page - 1) * limit;
    const to = page * limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data: transactions, count, error: txnsError } = await queryBuilder;

    if (txnsError) {
      console.error("Database error loading bosspay_txns:", txnsError);
      return NextResponse.json({ success: false, error: txnsError.message }, { status: 500 });
    }

    // 2. Fetch lightweight rows for aggregates (successCount and successVolume)
    // We fetch same filters but without pagination and status filters to get exact totals for dashboard boxes
    let statsBuilder = client
      .from("bosspay_txns")
      .select("amount_paisa, payment_status, gateway_payload, upi_intent");

    if (query) {
      statsBuilder = statsBuilder.or(`txn_id.ilike.%${query}%,pg_transaction_id.ilike.%${query}%,pg_type.ilike.%${query}%`);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      statsBuilder = statsBuilder.gte("created_at", start.toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      statsBuilder = statsBuilder.lte("created_at", end.toISOString());
    }

    const { data: statsRows } = await statsBuilder;

    let successCount = 0;
    let successVolume = 0;
    let totalMatchedCount = statsRows ? statsRows.length : 0;

    if (statsRows) {
      for (const row of statsRows) {
        const isSuccess = ["success", "paid", "captured"].includes((row.payment_status || "").toLowerCase().trim());
        
        // If we filtered by status specifically, only count those in the total count of matches
        const matchesStatusFilter = 
          status === "all" ||
          (status === "success" && isSuccess) ||
          (status === "failed" && ["failed", "failure", "cancelled", "declined"].includes((row.payment_status || "").toLowerCase().trim())) ||
          (status === "pending" && ["pending", "processing"].includes((row.payment_status || "").toLowerCase().trim()));

        if (isSuccess) {
          successCount++;
          
          let amount = 0;
          if (row.amount_paisa > 0) {
            amount = row.amount_paisa / 100;
          } else {
            let payload = row.gateway_payload;
            if (typeof payload === "string") {
              try { payload = JSON.parse(payload); } catch (e) {}
            }
            let upiIntentVal = row.upi_intent;
            if (typeof upiIntentVal === "string") {
              try { upiIntentVal = JSON.parse(upiIntentVal); } catch (e) {}
            }
            let checkoutUrlAmount = 0;
            if (payload?.checkoutUrl) {
              try {
                const amMatch = payload.checkoutUrl.match(/[?&]am=([^&]+)/);
                if (amMatch) {
                  checkoutUrlAmount = Number(amMatch[1]) || 0;
                }
              } catch (e) {}
            }
            const rawAmount = 
              payload?.price ??
              payload?.amount_rupees ??
              payload?.upiIntent?.amountRupees ??
              payload?.amountRupees ??
              payload?.parsed?.amount ??
              payload?.parsed?.paidAmount ??
              (checkoutUrlAmount > 0 ? checkoutUrlAmount : null) ??
              upiIntentVal?.amount_rupees ??
              upiIntentVal?.inputs?.amount_rupees ??
              0;
            amount = Number(rawAmount) || 0;
          }
          successVolume += amount;
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactions: transactions ?? [],
      totalCount: count ?? totalMatchedCount,
      successCount,
      successVolume
    }, { status: 200 });
  } catch (error) {
    console.error("Admin transactions GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
