"use client";

import { useMemo, useState } from "react";
import { 
  Search, 
  FileDown, 
  FileText, 
  Download, 
  CheckSquare, 
  Square,
  Calendar,
  X,
  Database
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InvoiceOrder } from "@/lib/invoice-generator";
import { generateInvoicePDF } from "@/lib/invoice-generator";
import { AdminInvoiceModal } from "@/components/admin-invoice-modal";
import JSZip from "jszip";
import { generateIndianAddress } from "@/lib/address-generator";

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

type AdminTransactionsClientProps = {
  transactions: any[];
  accessToken: string;
  totalCount: number;
  successCount: number;
  successVolume: number;
};

export function AdminTransactionsClient({ 
  transactions, 
  accessToken, 
  totalCount, 
  successCount, 
  successVolume 
}: AdminTransactionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for search input to prevent input lag
  const [searchInput, setSearchInput] = useState(searchParams.get("query") || "");

  // Sync filters from URL parameters
  const query = searchParams.get("query") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const statusFilter = (searchParams.get("status") || "all") as "all" | "pending" | "success" | "failed";
  const sort = (searchParams.get("sort") || "date-desc") as SortOption;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<InvoiceOrder | null>(null);
  const [activePayloadTxn, setActivePayloadTxn] = useState<any | null>(null);

  // URL updating helper
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "" || val === "all") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    // Reset page back to 1 when changing filters, sorting or search
    if (!updates.hasOwnProperty("page")) {
      params.delete("page");
    }
    router.push(`/admin/transactions?${params.toString()}`);
  };

  const currentPage = Number(searchParams.get("page") || "1");
  const limit = 20;
  const totalPages = Math.ceil(totalCount / limit);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 4) {
        pages.push("...");
      }
      
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 3) {
        pages.push("...");
      }
      
      pages.push(totalPages);
    }
    return pages;
  };

  // Helper: Convert transaction to InvoiceOrder
  const mappedTransactions = useMemo(() => {
    return transactions.map((txn) => {
      let payload = txn.gateway_payload;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (e) {}
      }

      let upiIntentVal = txn.upi_intent;
      if (typeof upiIntentVal === "string") {
        try {
          upiIntentVal = JSON.parse(upiIntentVal);
        } catch (e) {}
      }

      // Calculate amount in Rupees
      let amount = 0;
      if (txn.amount_paisa > 0) {
        amount = txn.amount_paisa / 100;
      } else {
        // Fallbacks for amount/price from payload and upi_intent
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

      // Check if random_address is already saved in payload, otherwise generate it deterministically from txn_id
      let randomAddr = payload?.random_address;
      if (!randomAddr) {
        randomAddr = generateIndianAddress(txn.txn_id);
      }

      const customerPhone = 
        payload?.parsed?.payerMobile || 
        payload?.payerMobile || 
        upiIntentVal?.inputs?.phone || 
        "N/A";
      
      const items = [
        {
          name: `Transaction Payment via ${txn.pg_type?.toUpperCase() || "SABPAISA"}`,
          quantity: 1,
          unitPrice: amount,
        }
      ];

      return {
        id: txn.txn_id,
        transaction_id: txn.txn_id,
        pg_transaction_id: txn.pg_transaction_id,
        pg_type: txn.pg_type,
        created_at: txn.created_at,
        customer_name: randomAddr.name,
        customer_email: randomAddr.email,
        customer_phone: customerPhone,
        customer_address: randomAddr.fullAddress,
        customer_city: randomAddr.city,
        customer_state: randomAddr.state,
        customer_pincode: randomAddr.pincode,
        billing_name: randomAddr.name,
        billing_address: randomAddr.fullAddress,
        billing_city: randomAddr.city,
        billing_state: randomAddr.state,
        billing_pincode: randomAddr.pincode,
        billing_same_as_delivery: true,
        items,
        total: amount,
        status: txn.payment_status || "success",
        order_status: "completed",
        invoice_status: payload?.invoice_status || "draft",
        store_id: "all-store",
        is_bosspay_txn: true,
        raw_txn: txn
      };
    });
  }, [transactions]);

  // Filter & Search & Sort transactions (now handled server-side)
  const processedTxns = mappedTransactions;

  // Aggregate stats
  const stats = useMemo(() => {
    return { 
      totalCount: totalCount, 
      successCount: successCount, 
      totalAmount: successVolume 
    };
  }, [totalCount, successCount, successVolume]);

  // Select all / Toggle row
  const handleSelectAll = () => {
    if (selectedIds.length === processedTxns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedTxns.map((t) => t.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((x) => x !== id);
      } else {
        return [...current, id];
      }
    });
  };

  // Call save-invoice API to store the randomized invoice details in DB
  const persistInvoiceDetails = async (txnId: string, randomAddress: any) => {
    try {
      await fetch("/api/admin/transactions/save-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          txn_id: txnId,
          random_address: randomAddress,
        }),
      });
    } catch (e) {
      console.error("Failed to save invoice status:", e);
    }
  };

  // Bulk ZIP Download
  const handleBulkZIPDownload = async () => {
    if (selectedIds.length === 0) return;
    setBulkDownloading(true);
    try {
      const zip = new JSZip();
      
      for (const id of selectedIds) {
        const txn = processedTxns.find((t) => t.id === id);
        if (!txn) continue;

        const doc = generateInvoicePDF(txn);
        const pdfBlob = doc.output("blob");
        const fileName = `TXN_INVOICE_${(txn.transaction_id || txn.id).toUpperCase()}.pdf`;
        zip.file(fileName, pdfBlob);

        if (txn.is_bosspay_txn && txn.transaction_id) {
          const addrPayload = {
            name: txn.customer_name,
            email: txn.customer_email,
            fullAddress: txn.customer_address,
            city: txn.customer_city,
            state: txn.customer_state,
            pincode: txn.customer_pincode,
          };
          await persistInvoiceDetails(txn.transaction_id, addrPayload);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TRANSACTION_INVOICES_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      router.refresh();
    } catch (err) {
      console.error("Bulk download failed:", err);
      alert("Failed to generate bulk ZIP download.");
    } finally {
      setBulkDownloading(false);
    }
  };

  // Individual PDF download
  const handleDownloadPDF = async (txn: InvoiceOrder) => {
    const doc = generateInvoicePDF(txn);
    const invoiceNo = `TXN-${(txn.transaction_id || txn.id).slice(0, 8).toUpperCase()}`;
    doc.save(`${invoiceNo}.pdf`);

    if (txn.is_bosspay_txn && txn.transaction_id) {
      const addrPayload = {
        name: txn.customer_name,
        email: txn.customer_email,
        fullAddress: txn.customer_address,
        city: txn.customer_city,
        state: txn.customer_state,
        pincode: txn.customer_pincode,
      };
      await persistInvoiceDetails(txn.transaction_id, addrPayload);
      router.refresh();
    }
  };

  // Helpers formatting
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatMoney = (val?: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  const getStatusBadge = (status?: string) => {
    const key = (status || "").toLowerCase().trim();
    if (key === "success" || key === "paid" || key === "captured") {
      return <span className="order-status-badge order-status-badge--success">Success</span>;
    }
    if (key === "failed" || key === "failure" || key === "cancelled" || key === "declined") {
      return <span className="order-status-badge order-status-badge--failed">Failed</span>;
    }
    return <span className="order-status-badge order-status-badge--pending">{status || "Pending"}</span>;
  };

  const getInvoiceStatusBadge = (invStatus?: string, status?: string) => {
    const val = (invStatus || (status === "success" || status === "paid" || status === "captured" ? "draft" : "draft")).toLowerCase().trim();
    if (val === "issued") {
      return <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>Issued</span>;
    }
    if (val === "void") {
      return <span style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>Void</span>;
    }
    return <span style={{ background: "#f3f4f6", color: "#4b5563", border: "1px solid #d1d5db", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>Draft</span>;
  };

  return (
    <section className="admin-products container" style={{ paddingBottom: "60px" }}>
      
      {/* Aggregate stats boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "25px" }}>
        <div style={{ background: "white", padding: "15px 20px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Total Filtered Transactions</span>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#111827" }}>{stats.totalCount}</h2>
        </div>
        <div style={{ background: "white", padding: "15px 20px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Success Payments</span>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#10b981" }}>{stats.successCount}</h2>
        </div>
        <div style={{ background: "white", padding: "15px 20px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Success Volume</span>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#b45309" }}>{formatMoney(stats.totalAmount)}</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-products-toolbar" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* Quick filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px", width: "100%" }}>
          <button
            onClick={() => updateUrlParams({ status: "all" })}
            type="button"
            className={`orders-filter ${statusFilter === "all" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            All Transactions
          </button>
          <button
            onClick={() => updateUrlParams({ status: "success" })}
            type="button"
            className={`orders-filter ${statusFilter === "success" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            Success
          </button>
          <button
            onClick={() => updateUrlParams({ status: "pending" })}
            type="button"
            className={`orders-filter ${statusFilter === "pending" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            Pending
          </button>
          <button
            onClick={() => updateUrlParams({ status: "failed" })}
            type="button"
            className={`orders-filter ${statusFilter === "failed" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            Failed
          </button>
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "15px", flexWrap: "wrap" }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              updateUrlParams({ query: searchInput });
            }}
            className="admin-products-controls" 
            style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}
          >
            {/* Search */}
            <label className="admin-products-search" style={{ flex: "1 1 300px" }}>
              <span className="sr-only">Search transactions</span>
              <input
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search Txn ID, PG ID, PG Type, Customer..."
                type="search"
                value={searchInput}
              />
            </label>

            {/* Dates */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", height: "38px" }}>
                <Calendar size={14} style={{ color: "#6b7280" }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => updateUrlParams({ startDate: e.target.value })}
                  style={{ border: "none", fontSize: "12px", outline: "none" }}
                  aria-label="Start date"
                />
              </div>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>to</span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", height: "38px" }}>
                <Calendar size={14} style={{ color: "#6b7280" }} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => updateUrlParams({ endDate: e.target.value })}
                  style={{ border: "none", fontSize: "12px", outline: "none" }}
                  aria-label="End date"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => updateUrlParams({ startDate: null, endDate: null })}
                  type="button"
                  style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}
                  title="Clear dates"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </form>

          {/* Sort */}
          <label className="admin-products-sort" style={{ margin: 0 }}>
            <span>Sort by</span>
            <select onChange={(e) => updateUrlParams({ sort: e.target.value })} value={sort}>
              <option value="date-desc">Date: Newest First</option>
              <option value="date-asc">Date: Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </label>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef3c7", border: "1px solid #f59e0b", padding: "12px 20px", borderRadius: "8px", marginBottom: "15px" }}>
          <div style={{ fontSize: "13px", color: "#92400e", fontWeight: "bold" }}>
            <span>{selectedIds.length} transactions selected</span>
          </div>
          <button
            onClick={handleBulkZIPDownload}
            disabled={bulkDownloading}
            type="button"
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#d97706", color: "white", padding: "6px 15px", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
          >
            <FileDown size={15} /> {bulkDownloading ? "Downloading ZIP..." : "Download Selected Invoices (ZIP)"}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="admin-products-table-wrap" style={{ borderRadius: "8px", overflow: "hidden" }}>
        <table className="admin-products-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "40px", padding: "12px" }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                  aria-label={selectedIds.length === processedTxns.length ? "Deselect all" : "Select all"}
                >
                  {selectedIds.length === processedTxns.length && processedTxns.length > 0 ? (
                    <CheckSquare size={16} style={{ color: "#3b82f6" }} />
                  ) : (
                    <Square size={16} style={{ color: "#9ca3af" }} />
                  )}
                </button>
              </th>
              <th scope="col">Transaction ID / Ref</th>
              <th scope="col">Payment Gateway ID</th>
              <th scope="col">Customer / Merchant</th>
              <th scope="col">Gateway</th>
              <th scope="col">Date/Time</th>
              <th scope="col">Amount</th>
              <th scope="col" style={{ textAlign: "center" }}>Status</th>
              <th scope="col" style={{ textAlign: "center" }}>Invoice</th>
              <th scope="col" style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedTxns.length > 0 ? (
              processedTxns.map((txn) => {
                const isSelected = selectedIds.includes(txn.id);
                return (
                  <tr key={txn.id} style={{ background: isSelected ? "#eff6ff" : "" }}>
                    <td style={{ padding: "12px" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleRow(txn.id)}
                        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                        aria-label={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} style={{ color: "#3b82f6" }} />
                        ) : (
                          <Square size={16} style={{ color: "#9ca3af" }} />
                        )}
                      </button>
                    </td>
                    <td>
                      <strong style={{ fontFamily: "monospace", fontSize: "12px", textTransform: "uppercase", color: "#111827" }}>
                        {txn.transaction_id}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#4b5563" }}>
                        {txn.pg_transaction_id || "—"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-products-name-cell">
                        <strong style={{ fontSize: "13px", color: "#111827" }}>{txn.customer_name}</strong>
                        <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#6b7280" }}>{txn.customer_email}</p>
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>
                        {txn.pg_type || "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#374151" }}>{formatDate(txn.created_at)}</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: "13px", color: "#111827" }}>{formatMoney(txn.total)}</strong>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {getStatusBadge(txn.status)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {getInvoiceStatusBadge(txn.invoice_status, txn.status)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          onClick={() => setActivePayloadTxn(txn.raw_txn)}
                          title="View Raw Payload JSON"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "4px", color: "#1d4ed8", cursor: "pointer" }}
                          type="button"
                        >
                          <Database size={13} />
                        </button>
                        <button
                          onClick={() => setActiveInvoiceOrder(txn)}
                          title="View Invoice in Browser"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer" }}
                          type="button"
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(txn)}
                          title="Download Invoice PDF"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "#1f2937", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}
                          type="button"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px" }} className="admin-products-empty">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "15px", background: "white", padding: "12px 20px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <div style={{ fontSize: "13px", color: "#4b5563" }}>
            Showing <strong style={{ color: "#111827" }}>{Math.min((currentPage - 1) * limit + 1, totalCount)}</strong> to{" "}
            <strong style={{ color: "#111827" }}>{Math.min(currentPage * limit, totalCount)}</strong> of{" "}
            <strong style={{ color: "#111827" }}>{totalCount}</strong> transactions
          </div>

          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            {/* Previous Button */}
            <button
              onClick={() => updateUrlParams({ page: String(currentPage - 1) })}
              disabled={currentPage <= 1}
              type="button"
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                background: currentPage <= 1 ? "#f3f4f6" : "white",
                color: currentPage <= 1 ? "#9ca3af" : "#374151",
                fontSize: "13px",
                fontWeight: "500",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer"
              }}
            >
              Previous
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`ellipsis-${idx}`} style={{ padding: "6px 10px", fontSize: "13px", color: "#6b7280" }}>
                    ...
                  </span>
                );
              }
              const isCurrent = Number(p) === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  onClick={() => updateUrlParams({ page: String(p) })}
                  type="button"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor: isCurrent ? "#3b82f6" : "#d1d5db",
                    background: isCurrent ? "#3b82f6" : "white",
                    color: isCurrent ? "white" : "#374151",
                    fontSize: "13px",
                    fontWeight: isCurrent ? "bold" : "normal",
                    cursor: "pointer"
                  }}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() => updateUrlParams({ page: String(currentPage + 1) })}
              disabled={currentPage >= totalPages}
              type="button"
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                background: currentPage >= totalPages ? "#f3f4f6" : "white",
                color: currentPage >= totalPages ? "#9ca3af" : "#374151",
                fontSize: "13px",
                fontWeight: "500",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer"
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {activeInvoiceOrder && (
        <AdminInvoiceModal
          onClose={() => setActiveInvoiceOrder(null)}
          order={activeInvoiceOrder}
        />
      )}

      {/* Raw Payload Modal */}
      {activePayloadTxn && (
        <AdminPayloadModal
          onClose={() => setActivePayloadTxn(null)}
          transaction={activePayloadTxn}
        />
      )}
    </section>
  );
}

type AdminPayloadModalProps = {
  transaction: any | null;
  onClose: () => void;
};

export function AdminPayloadModal({ transaction, onClose }: AdminPayloadModalProps) {
  if (!transaction) return null;

  // Pretty print JSON
  const formatJSON = (val: any) => {
    if (!val) return "null";
    let parsed = val;
    if (typeof val === "string") {
      try {
        parsed = JSON.parse(val);
      } catch (e) {}
    }
    return JSON.stringify(parsed, null, 2);
  };

  const getStatusBadge = (status?: string) => {
    const key = (status || "").toLowerCase().trim();
    if (key === "success" || key === "paid" || key === "captured") {
      return <span className="order-status-badge order-status-badge--success">Success</span>;
    }
    if (key === "failed" || key === "failure" || key === "cancelled" || key === "declined") {
      return <span className="order-status-badge order-status-badge--failed">Failed</span>;
    }
    return <span className="order-status-badge order-status-badge--pending">{status || "Pending"}</span>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div className="admin-edit-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="payload-modal-title"
        aria-modal="true"
        className="admin-edit-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{ maxWidth: "800px", width: "95%" }}
      >
        <div className="admin-edit-modal-header" style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "15px" }}>
          <div>
            <h2 id="payload-modal-title" style={{ fontSize: "16px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={18} style={{ color: "#3b82f6" }} /> Transaction Payload Data
            </h2>
            <p style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace", margin: "4px 0 0 0" }}>
              ID: {transaction.txn_id}
            </p>
          </div>
          <button
            className="admin-edit-modal-close"
            onClick={onClose}
            type="button"
            style={{ padding: "5px" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px", maxHeight: "calc(100vh - 200px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Metadata Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "#f9fafb", padding: "15px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>PG Transaction ID</span>
              <p style={{ margin: "3px 0 0 0", fontFamily: "monospace", fontSize: "13px", color: "#1f2937" }}>{transaction.pg_transaction_id || "—"}</p>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Payment Gateway</span>
              <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#1f2937", textTransform: "uppercase", fontWeight: "bold" }}>{transaction.pg_type || "—"}</p>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Status</span>
              <div style={{ margin: "3px 0 0 0" }}>{getStatusBadge(transaction.payment_status)}</div>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Created At</span>
              <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#1f2937" }}>{formatDate(transaction.created_at)}</p>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Updated At</span>
              <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#1f2937" }}>{formatDate(transaction.updated_at)}</p>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Amount Paisa</span>
              <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#1f2937", fontFamily: "monospace" }}>{transaction.amount_paisa}</p>
            </div>
          </div>

          {/* JSON fields */}
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px" }}>Gateway Payload</h3>
            <pre style={{
              background: "#1e1e1e",
              color: "#d4d4d4",
              padding: "15px",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "Consolas, Monaco, monospace",
              overflowX: "auto",
              maxHeight: "300px",
              border: "1px solid #2e2e2e"
            }}>
              {formatJSON(transaction.gateway_payload)}
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px" }}>UPI Intent</h3>
            <pre style={{
              background: "#1e1e1e",
              color: "#d4d4d4",
              padding: "15px",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "Consolas, Monaco, monospace",
              overflowX: "auto",
              maxHeight: "300px",
              border: "1px solid #2e2e2e"
            }}>
              {formatJSON(transaction.upi_intent)}
            </pre>
          </div>
        </div>

        <div className="admin-edit-actions" style={{ borderTop: "1px solid #e5e7eb", padding: "12px 20px" }}>
          <button className="admin-edit-cancel" onClick={onClose} type="button">
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
