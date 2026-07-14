"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  FileDown,
  Eye,
  FileText,
  Download,
  CheckSquare,
  Square,
  Calendar,
  X
} from "lucide-react";
import type { InvoiceOrder } from "@/lib/invoice-generator";
import { generateInvoicePDF } from "@/lib/invoice-generator";
import { AdminOrderDetailsModal } from "@/components/admin-order-details-modal";
import { AdminInvoiceModal } from "@/components/admin-invoice-modal";
import JSZip from "jszip";

type SortOption = "date-desc" | "date-asc" | "total-desc" | "total-asc" | "name-asc" | "name-desc";

type AdminOrdersClientProps = {
  orders: InvoiceOrder[];
  accessToken: string;
  onOrderUpdated: (order: InvoiceOrder) => void;
};

export function AdminOrdersClient({ orders, accessToken, onOrderUpdated }: AdminOrdersClientProps) {
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "success" | "failed">("all");
  const [sort, setSort] = useState<SortOption>("date-desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Modals state
  const [activeDetailsOrder, setActiveDetailsOrder] = useState<InvoiceOrder | null>(null);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<InvoiceOrder | null>(null);

  // 1. Filtering & Searching & Sorting
  const processedOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status Filter
      if (statusFilter !== "all") {
        const pStatus = (order.status || "").toLowerCase().trim();
        if (statusFilter === "success" && pStatus !== "success" && pStatus !== "paid" && pStatus !== "captured") {
          return false;
        }
        if (statusFilter === "failed" && pStatus !== "failed" && pStatus !== "failure" && pStatus !== "cancelled" && pStatus !== "declined") {
          return false;
        }
        if (statusFilter === "pending" && pStatus !== "pending" && pStatus !== "processing") {
          return false;
        }
      }

      // Date Range Filter
      if (startDate) {
        const orderDate = new Date(order.created_at || "");
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const orderDate = new Date(order.created_at || "");
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }

      // Search Query
      if (query.trim()) {
        const searchVal = query.toLowerCase().trim();
        const oId = (order.transaction_id || order.id || "").toLowerCase();
        const name = (order.customer_name || "").toLowerCase();
        const email = (order.customer_email || "").toLowerCase();
        const phone = (order.customer_phone || "").toLowerCase();
        const city = (order.customer_city || "").toLowerCase();
        const state = (order.customer_state || "").toLowerCase();

        return (
          oId.includes(searchVal) ||
          name.includes(searchVal) ||
          email.includes(searchVal) ||
          phone.includes(searchVal) ||
          city.includes(searchVal) ||
          state.includes(searchVal)
        );
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (sort === "date-asc") {
        return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
      }
      if (sort === "date-desc") {
        return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
      if (sort === "total-asc") {
        return Number(a.total || 0) - Number(b.total || 0);
      }
      if (sort === "total-desc") {
        return Number(b.total || 0) - Number(a.total || 0);
      }
      if (sort === "name-asc") {
        return (a.customer_name || "").localeCompare(b.customer_name || "");
      }
      if (sort === "name-desc") {
        return (b.customer_name || "").localeCompare(a.customer_name || "");
      }
      return 0;
    });
  }, [orders, query, startDate, endDate, statusFilter, sort]);

  // Aggregate stats of filtered set
  const stats = useMemo(() => {
    const totalOrders = processedOrders.length;
    const paidOrders = processedOrders.filter(
      (o) => ["success", "paid", "captured"].includes((o.status || "").toLowerCase().trim())
    );
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    return { totalOrders, revenue, paidCount: paidOrders.length };
  }, [processedOrders]);

  // Select all / toggle row functions
  const handleSelectAll = () => {
    if (selectedIds.length === processedOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedOrders.map((o) => o.id));
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

  // Bulk ZIP Download
  const handleBulkZIPDownload = async () => {
    if (selectedIds.length === 0) return;
    setBulkDownloading(true);
    try {
      const zip = new JSZip();

      selectedIds.forEach((id) => {
        const order = orders.find((o) => o.id === id);
        if (!order) return;

        const doc = generateInvoicePDF(order);
        const pdfBlob = doc.output("blob");
        const fileName = `INVOICE_${(order.transaction_id || order.id).toUpperCase()}.pdf`;
        zip.file(fileName, pdfBlob);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MADHU_GARMENTS_INVOICES_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Bulk download failed:", err);
      alert("Failed to generate bulk ZIP download.");
    } finally {
      setBulkDownloading(false);
    }
  };

  // Individual Invoice PDF download
  const handleDownloadPDF = (order: InvoiceOrder) => {
    const doc = generateInvoicePDF(order);
    const invoiceNo = `INVC-${(order.transaction_id || order.id).slice(0, 8).toUpperCase()}`;
    doc.save(`${invoiceNo}.pdf`);
  };

  // Format Helper functions
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMoney = (val?: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  const getPaymentStatusBadge = (status?: string) => {
    const key = (status || "").toLowerCase().trim();
    if (key === "success" || key === "paid" || key === "captured") {
      return <span className="order-status-badge order-status-badge--success">Success</span>;
    }
    if (key === "failed" || key === "failure" || key === "cancelled" || key === "declined") {
      return <span className="order-status-badge order-status-badge--failed">Failed</span>;
    }
    return <span className="order-status-badge order-status-badge--pending">{status || "Pending"}</span>;
  };

  const getOrderStatusBadge = (orderStatus?: string, status?: string) => {
    const val = (orderStatus || status || "pending").toLowerCase().trim();
    if (val === "delivered" || val === "completed") {
      return <span style={{ background: "#d1fae5", color: "#065f46", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Delivered</span>;
    }
    if (val === "shipped") {
      return <span style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Shipped</span>;
    }
    if (val === "processing") {
      return <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Processing</span>;
    }
    if (val === "cancelled" || val === "failed") {
      return <span style={{ background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Cancelled</span>;
    }
    return <span style={{ background: "#f3f4f6", color: "#374151", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Pending</span>;
  };

  const getInvoiceStatusBadge = (invStatus?: string, status?: string) => {
    const val = (invStatus || (status === "success" ? "issued" : "draft")).toLowerCase().trim();
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
      {/* 2. Overview Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "25px" }}>
        <div style={{ background: "white", padding: "15px 20px", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Total Filtered Orders</span>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#111827" }}>{stats.totalOrders}</h2>
        </div>
        <div style={{ background: "white", padding: "15px 20px", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Paid Orders</span>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#10b981" }}>{stats.paidCount}</h2>
        </div>
        <div style={{ background: "white", padding: "15px 20px", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase" }}>Filtered Revenue (Paid)</span>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#b45309" }}>{formatMoney(stats.revenue)}</h2>
        </div>
      </div>

      {/* 3. Toolbar (Search, Dates, Sorting) */}
      <div className="admin-products-toolbar" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>

        {/* Status Quick Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px", width: "100%" }}>
          <button
            onClick={() => setStatusFilter("all")}
            type="button"
            className={`orders-filter ${statusFilter === "all" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            All Orders
          </button>
          <button
            onClick={() => setStatusFilter("success")}
            type="button"
            className={`orders-filter ${statusFilter === "success" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            type="button"
            className={`orders-filter ${statusFilter === "pending" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("failed")}
            type="button"
            className={`orders-filter ${statusFilter === "failed" ? "is-active" : ""}`}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #d1d5db", fontSize: "13px", cursor: "pointer" }}
          >
            Failed
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "15px", flexWrap: "wrap" }}>

          <div className="admin-products-controls" style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}>

            {/* Search Input */}
            <label className="admin-products-search" style={{ flex: "1 1 300px" }}>
              <span className="sr-only">Search orders</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Order ID, Customer Name, Email, Phone, City..."
                type="search"
                value={query}
              />
            </label>

            {/* Date Picker Range */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", height: "38px" }}>
                <Calendar size={14} style={{ color: "#6b7280" }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ border: "none", fontSize: "12px", outline: "none" }}
                  aria-label="End date"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  type="button"
                  style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}
                  title="Clear dates"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Sort Dropdown */}
          <label className="admin-products-sort" style={{ margin: 0 }}>
            <span>Sort by</span>
            <select onChange={(event) => setSort(event.target.value as SortOption)} value={sort}>
              <option value="date-desc">Date: Newest First</option>
              <option value="date-asc">Date: Oldest First</option>
              <option value="total-desc">Amount: High to Low</option>
              <option value="total-asc">Amount: Low to High</option>
              <option value="name-asc">Customer: A to Z</option>
              <option value="name-desc">Customer: Z to A</option>
            </select>
          </label>
        </div>
      </div>

      {/* 4. Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef3c7", border: "1px solid #f59e0b", padding: "12px 20px", borderRadius: "8px", marginBottom: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#92400e", fontWeight: "bold" }}>
            <span>{selectedIds.length} orders selected</span>
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

      {/* 5. Orders Table */}
      <div className="admin-products-table-wrap" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)", borderRadius: "8px", overflow: "hidden" }}>
        <table className="admin-products-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "40px", padding: "12px" }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                  aria-label={selectedIds.length === processedOrders.length ? "Deselect all orders" : "Select all orders"}
                >
                  {selectedIds.length === processedOrders.length && processedOrders.length > 0 ? (
                    <CheckSquare size={16} style={{ color: "#3b82f6" }} />
                  ) : (
                    <Square size={16} style={{ color: "#9ca3af" }} />
                  )}
                </button>
              </th>
              <th scope="col">Order ID / Ref</th>
              <th scope="col">Customer Info</th>
              <th scope="col">Order Date</th>
              <th scope="col">Total Amount</th>
              <th scope="col" style={{ textAlign: "center" }}>Payment Status</th>
              <th scope="col" style={{ textAlign: "center" }}>Order Status</th>
              <th scope="col" style={{ textAlign: "center" }}>Invoice Status</th>
              <th scope="col" style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedOrders.length > 0 ? (
              processedOrders.map((order) => {
                const isSelected = selectedIds.includes(order.id);
                return (
                  <tr key={order.id} className={isSelected ? "row-selected" : ""} style={{ background: isSelected ? "#eff6ff" : "" }}>
                    <td style={{ padding: "12px" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleRow(order.id)}
                        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                        aria-label={isSelected ? "Deselect order" : "Select order"}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} style={{ color: "#3b82f6" }} />
                        ) : (
                          <Square size={16} style={{ color: "#9ca3af" }} />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="admin-products-name-cell">
                        <strong style={{ fontFamily: "monospace", fontSize: "12px", textTransform: "uppercase", color: "#111827" }}>
                          {order.transaction_id || order.id.slice(0, 12)}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div className="admin-products-name-cell">
                        <strong style={{ fontSize: "13px", color: "#111827" }}>{order.customer_name || "Guest Customer"}</strong>
                        <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#4b5563" }}>
                          {order.customer_email || "No Email"} | {order.customer_phone || "No Phone"}
                        </p>
                        {order.customer_city ? (
                          <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#9ca3af" }}>
                            Location: {order.customer_city}, {order.customer_state || ""}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#374151" }}>{formatDate(order.created_at)}</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: "13px", color: "#111827" }}>{formatMoney(order.total)}</strong>
                      <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#9ca3af" }}>{order.items?.length || 0} item type(s)</p>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {getPaymentStatusBadge(order.status)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {getOrderStatusBadge(order.order_status, order.status)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {getInvoiceStatusBadge(order.invoice_status, order.status)}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          onClick={() => setActiveDetailsOrder(order)}
                          title="View complete details"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer" }}
                          type="button"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => setActiveInvoiceOrder(order)}
                          title="View Generated Invoice"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer" }}
                          type="button"
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(order)}
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
                <td colSpan={9} className="admin-products-empty" style={{ textAlign: "center", padding: "40px" }}>
                  No orders found matching the filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Modals */}
      {activeDetailsOrder && (
        <AdminOrderDetailsModal
          onClose={() => setActiveDetailsOrder(null)}
          order={activeDetailsOrder}
        />
      )}

      {activeInvoiceOrder && (
        <AdminInvoiceModal
          onClose={() => setActiveInvoiceOrder(null)}
          order={activeInvoiceOrder}
        />
      )}
    </section>
  );
}
