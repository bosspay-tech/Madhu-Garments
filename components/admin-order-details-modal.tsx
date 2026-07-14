"use client";

import { X, Calendar, User, Phone, Mail, MapPin, DollarSign, Package } from "lucide-react";
import type { InvoiceOrder } from "@/lib/invoice-generator";

type AdminOrderDetailsModalProps = {
  order: InvoiceOrder | null;
  onClose: () => void;
};

export function AdminOrderDetailsModal({ order, onClose }: AdminOrderDetailsModalProps) {
  if (!order) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (val?: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  const items = order.items || [];
  const billingSame = order.billing_same_as_delivery !== false;

  return (
    <div className="admin-edit-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="order-details-title"
        aria-modal="true"
        className="admin-edit-modal order-details-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{ maxWidth: "850px", width: "95%" }}
      >
        <div className="admin-edit-modal-header">
          <div>
            <h2 id="order-details-title">Order Details</h2>
            <p className="order-details-subtitle">
              ID: <span className="order-id-highlight">{order.transaction_id || order.id}</span>
            </p>
          </div>
          <button className="admin-edit-modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="admin-edit-form" style={{ maxHeight: "calc(100vh - 180px)", overflowY: "auto", padding: "20px" }}>
          <div className="order-details-sections">
            {/* Top Grid: Info cards */}
            <div className="order-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "15px", marginBottom: "20px" }}>
              
              {/* Customer Info Card */}
              <div className="order-info-card" style={{ padding: "15px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#f9fafb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1px solid #e5e7eb", paddingBottom: "5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={15} /> Customer Details
                </h3>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Name:</strong> {order.customer_name || "N/A"}</p>
                <p style={{ margin: "4px 0", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Mail size={13} /> {order.customer_email || "N/A"}
                </p>
                <p style={{ margin: "4px 0", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Phone size={13} /> {order.customer_phone || "N/A"}
                </p>
              </div>

              {/* Order Meta Info Card */}
              <div className="order-info-card" style={{ padding: "15px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#f9fafb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1px solid #e5e7eb", paddingBottom: "5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={15} /> Order Information
                </h3>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Date:</strong> {formatDate(order.created_at)}</p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Gateway Txn:</strong> {order.transaction_id || "N/A"}</p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Store ID:</strong> {order.store_id || "N/A"}</p>
              </div>

              {/* Financial Card */}
              <div className="order-info-card" style={{ padding: "15px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#f9fafb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1px solid #e5e7eb", paddingBottom: "5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <DollarSign size={15} /> Total & Payment
                </h3>
                <p style={{ margin: "4px 0", fontSize: "16px", color: "#111827" }}>
                  <strong>Grand Total:</strong> <span style={{ color: "#b45309", fontWeight: "bold" }}>{formatMoney(order.total)}</span>
                </p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Gateway:</strong> Easebuzz</p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}>
                  <strong>Pay Status:</strong>{" "}
                  <span className={`order-status-badge order-status-badge--${(order.status || "pending").toLowerCase()}`}>
                    {order.status || "pending"}
                  </span>
                </p>
              </div>
            </div>

            {/* Addresses Grid */}
            <div className="order-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "15px", marginBottom: "20px" }}>
              {/* Delivery Address */}
              <div className="order-info-card" style={{ padding: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1px solid #e5e7eb", paddingBottom: "5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={15} /> Delivery Address
                </h3>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Name:</strong> {order.customer_name || "N/A"}</p>
                <p style={{ margin: "4px 0", fontSize: "13px", whiteSpace: "pre-line" }}>
                  <strong>Address:</strong> {order.customer_address || "N/A"}
                </p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}>
                  <strong>City/State:</strong> {order.customer_city || "N/A"}, {order.customer_state || "N/A"}
                </p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>PIN Code:</strong> {order.customer_pincode || "N/A"}</p>
              </div>

              {/* Billing Address */}
              <div className="order-info-card" style={{ padding: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1px solid #e5e7eb", paddingBottom: "5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={15} /> Billing Address
                </h3>
                {billingSame ? (
                  <p style={{ margin: "10px 0", fontSize: "13px", fontStyle: "italic", color: "#6b7280" }}>
                    Same as delivery address.
                  </p>
                ) : (
                  <>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Name:</strong> {order.billing_name || "N/A"}</p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>Address:</strong> {order.billing_address || "N/A"}</p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>City/State:</strong> {order.billing_city || "N/A"}, {order.billing_state || "N/A"}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}><strong>PIN Code:</strong> {order.billing_pincode || "N/A"}</p>
                  </>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="order-items-section" style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Package size={15} /> Ordered Items ({items.length})
              </h3>
              <div className="admin-products-table-wrap" style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                <table className="admin-products-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px" }}>Image</th>
                      <th style={{ padding: "8px 12px" }}>Product Name</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Unit Price</th>
                      <th style={{ padding: "8px 12px", textAlign: "center" }}>Qty</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const name = item.name || item.title || "Product";
                      const qty = item.quantity || 1;
                      const price = item.unitPrice || item.price || 0;
                      return (
                        <tr key={index}>
                          <td style={{ padding: "8px 12px" }}>
                            {item.image ? (
                              <img src={item.image} alt={name} style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                            ) : (
                              <div style={{ width: "40px", height: "40px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", fontSize: "10px", color: "#9ca3af" }}>No Img</div>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: "medium" }}>{name}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatMoney(price)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>{qty}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "bold" }}>{formatMoney(price * qty)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-edit-actions" style={{ borderTop: "1px solid #e5e7eb", padding: "15px 20px" }}>
          <button className="admin-edit-cancel" onClick={onClose} type="button">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
