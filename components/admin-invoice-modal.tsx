"use client";

import { X, Printer, Download } from "lucide-react";
import { generateInvoicePDF, type InvoiceOrder } from "@/lib/invoice-generator";

type AdminInvoiceModalProps = {
  order: InvoiceOrder | null;
  onClose: () => void;
};

export function AdminInvoiceModal({ order, onClose }: AdminInvoiceModalProps) {
  if (!order) return null;

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

  const handleDownloadPDF = () => {
    const doc = generateInvoicePDF(order);
    const invoiceNo = `INVC-${(order.transaction_id || order.id).slice(0, 8).toUpperCase()}`;
    doc.save(`${invoiceNo}.pdf`);
  };

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-area")?.innerHTML;
    if (!printContent) return;

    // Create dynamic iframe for print operation
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (iframeDoc) {
      iframeDoc.write(`
        <html>
          <head>
            <title>Invoice - ${order.transaction_id || order.id}</title>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #1f2937; line-height: 1.5; }
              .invoice-header { display: flex; justify-content: space-between; margin-bottom: 25px; }
              .logo { font-size: 22px; font-weight: bold; color: #111827; }
              .logo small { display: block; font-size: 10px; color: #4b5563; font-weight: normal; margin-top: 2px; }
              .company-info { text-align: right; font-size: 12px; color: #4b5563; }
              .divider { border-top: 1px solid #e5e7eb; margin: 15px 0; }
              .invoice-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #111827; }
              .invoice-meta-grid { display: flex; justify-content: space-between; font-size: 12px; color: #4b5563; margin-bottom: 20px; }
              .addresses-grid { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 25px; }
              .address-col { flex: 1; font-size: 12px; }
              .address-col h3 { font-size: 13px; font-weight: bold; margin: 0 0 5px 0; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
              .address-col p { margin: 2px 0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { padding: 8px 12px; text-align: left; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
              th { background-color: #1f2937; color: white; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .totals-wrap { display: flex; justify-content: flex-end; margin-top: 15px; }
              .totals-table { width: 300px; border: none; }
              .totals-table td { padding: 4px 10px; border: none; font-size: 12px; }
              .totals-table tr.grand-total td { font-weight: bold; font-size: 14px; color: #111827; border-top: 1px solid #e5e7eb; padding-top: 8px; }
              .gst-note { font-size: 10px; font-style: italic; color: #9ca3af; text-align: right; margin-top: 5px; }
              .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 11px; text-align: center; color: #9ca3af; }
              .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
              .badge--success { background: #edfdf5; color: #065f46; }
              .badge--pending { background: #fffbeb; color: #92400e; }
              .badge--failed { background: #fef2f2; color: #991b1b; }
              @media print {
                body { padding: 0; }
                iframe { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      iframeDoc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  };

  const items = order.items || [];
  const billingSame = order.billing_same_as_delivery !== false;
  
  // Financial calculation helpers
  let itemsSubtotal = 0;
  items.forEach(item => {
    itemsSubtotal += (item.unitPrice || item.price || 0) * (item.quantity || 1);
  });
  const orderTotal = Number(order.total || itemsSubtotal);
  const discount = Math.max(0, itemsSubtotal - orderTotal);

  return (
    <div className="admin-edit-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="invoice-modal-title"
        aria-modal="true"
        className="admin-edit-modal invoice-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{ maxWidth: "750px", width: "95%" }}
      >
        {/* Header with Control Buttons */}
        <div className="admin-edit-modal-header" style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "15px" }}>
          <div>
            <h2 id="invoice-modal-title" style={{ fontSize: "16px", fontWeight: "bold" }}>Invoice Preview</h2>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>MG-{(order.transaction_id || order.id).toUpperCase()}</p>
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={handlePrint}
              type="button"
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "#f3f4f6", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "4px", fontSize: "13px", cursor: "pointer", color: "#374151" }}
            >
              <Printer size={15} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              type="button"
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "#1f2937", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", fontSize: "13px", cursor: "pointer" }}
            >
              <Download size={15} /> PDF Download
            </button>
            <button
              className="admin-edit-modal-close"
              onClick={onClose}
              type="button"
              style={{ padding: "5px", marginLeft: "10px" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice View Area */}
        <div style={{ padding: "20px", maxHeight: "calc(100vh - 200px)", overflowY: "auto", background: "#f9fafb" }}>
          
          {/* Print container with structured styles */}
          <div
            id="invoice-print-area"
            style={{ background: "white", padding: "30px", border: "1px solid #e5e7eb", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            {/* Invoice Header */}
            <div className="invoice-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px" }}>
              <div className="logo" style={{ textAlign: "left" }}>
                <span style={{ fontSize: "22px", fontWeight: "bold", color: "#111827", letterSpacing: "1px" }}>Madhu</span>
                <span style={{ display: "block", fontSize: "9px", color: "#6b7280", letterSpacing: "1.5px", fontWeight: "bold", marginTop: "2px" }}>GARMENTS</span>
              </div>
              <div className="company-info" style={{ textAlign: "right", fontSize: "11px", color: "#4b5563" }}>
                <strong style={{ color: "#111827" }}>Madhu Garments</strong><br />
                12, Karol Bagh Main Market,<br />
                New Delhi - 110005, India<br />
                store@madhugarments.com | +91 98765 43210
              </div>
            </div>

            <div className="divider" style={{ borderTop: "1px solid #e5e7eb", margin: "15px 0" }} />

            {/* Title & Metadata */}
            <div className="invoice-title" style={{ fontSize: "16px", fontWeight: "bold", color: "#111827", marginBottom: "5px" }}>TAX INVOICE</div>
            <div className="invoice-meta-grid" style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#4b5563", marginBottom: "20px" }}>
              <div>
                <strong>Invoice No:</strong> MG-{(order.transaction_id || order.id).slice(0, 10).toUpperCase()}<br />
                <strong>Date:</strong> {formatDate(order.created_at)}
              </div>
              <div style={{ textAlign: "right" }}>
                <strong>Payment Method:</strong> Online Payment ({order.pg_type?.toUpperCase() || "Easebuzz"})<br />
                <strong>Payment Status:</strong>{" "}
                <span className={`badge badge--${(order.status || "pending").toLowerCase()}`} style={{ display: "inline-block", padding: "1px 6px", borderRadius: "3px", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase" }}>
                  {order.status || "pending"}
                </span>
              </div>
            </div>

            {/* Addresses Grid */}
            <div className="addresses-grid" style={{ display: "flex", justifyContent: "space-between", gap: "30px", marginBottom: "25px" }}>
              <div className="address-col" style={{ flex: 1, fontSize: "11px", color: "#4b5563" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 5px 0", color: "#111827", borderBottom: "1px solid #e5e7eb", paddingBottom: "3px", textTransform: "uppercase" }}>Bill To</h3>
                <p style={{ fontWeight: "bold", color: "#111827", margin: "2px 0" }}>{order.billing_name || order.customer_name || "Customer"}</p>
                <p style={{ margin: "2px 0" }}>{order.billing_address || order.customer_address || "N/A"}</p>
                <p style={{ margin: "2px 0" }}>
                  {order.billing_city || order.customer_city || ""}, {order.billing_state || order.customer_state || ""} - {order.billing_pincode || order.customer_pincode || ""}
                </p>
                {!order.is_bosspay_txn && order.customer_phone && (
                  <p style={{ margin: "2px 0" }}>Phone: {order.customer_phone}</p>
                )}
                <p style={{ margin: "2px 0" }}>Email: {order.customer_email || "N/A"}</p>
              </div>

              <div className="address-col" style={{ flex: 1, fontSize: "11px", color: "#4b5563" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 5px 0", color: "#111827", borderBottom: "1px solid #e5e7eb", paddingBottom: "3px", textTransform: "uppercase" }}>Ship To</h3>
                <p style={{ fontWeight: "bold", color: "#111827", margin: "2px 0" }}>{order.customer_name || "Customer"}</p>
                <p style={{ margin: "2px 0" }}>{order.customer_address || "N/A"}</p>
                <p style={{ margin: "2px 0" }}>
                  {order.customer_city || ""}, {order.customer_state || ""} - {order.customer_pincode || ""}
                </p>
                {!order.is_bosspay_txn && order.customer_phone && (
                  <p style={{ margin: "2px 0" }}>Phone: {order.customer_phone}</p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
              <thead>
                <tr style={{ background: "#1f2937", color: "white" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left", fontSize: "11px", borderBottom: "1px solid #e5e7eb" }}>S.No.</th>
                  <th style={{ padding: "6px 10px", textAlign: "left", fontSize: "11px", borderBottom: "1px solid #e5e7eb" }}>Description</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontSize: "11px", borderBottom: "1px solid #e5e7eb" }}>Price</th>
                  <th style={{ padding: "6px 10px", textAlign: "center", fontSize: "11px", borderBottom: "1px solid #e5e7eb" }}>Qty</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontSize: "11px", borderBottom: "1px solid #e5e7eb" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const name = item.name || item.title || "Product";
                  const qty = item.quantity || 1;
                  const price = item.unitPrice || item.price || 0;
                  return (
                    <tr key={index}>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #e5e7eb" }}>{index + 1}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #e5e7eb" }}>{name}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>{formatMoney(price)}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>{qty}</td>
                      <td style={{ padding: "6px 10px", fontSize: "11px", textAlign: "right", fontWeight: "bold", borderBottom: "1px solid #e5e7eb" }}>{formatMoney(price * qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Calculations Row */}
            <div className="totals-wrap" style={{ display: "flex", justifyContent: "flex-end" }}>
              <table className="totals-table" style={{ width: "250px", border: "none" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "3px 5px", fontSize: "11px", textAlign: "right", color: "#4b5563" }}>Subtotal:</td>
                    <td style={{ padding: "3px 5px", fontSize: "11px", textAlign: "right", fontWeight: "medium" }}>{formatMoney(itemsSubtotal)}</td>
                  </tr>
                  {discount > 0 ? (
                    <tr>
                      <td style={{ padding: "3px 5px", fontSize: "11px", textAlign: "right", color: "#4b5563" }}>Discount:</td>
                      <td style={{ padding: "3px 5px", fontSize: "11px", textAlign: "right", color: "#dc2626", fontWeight: "medium" }}>-{formatMoney(discount)}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td style={{ padding: "3px 5px", fontSize: "11px", textAlign: "right", color: "#4b5563" }}>Shipping:</td>
                    <td style={{ padding: "3px 5px", fontSize: "11px", textAlign: "right", fontWeight: "medium" }}>Free</td>
                  </tr>
                  <tr className="grand-total">
                    <td style={{ padding: "8px 5px 3px 5px", fontSize: "13px", fontWeight: "bold", textAlign: "right", borderTop: "1px solid #e5e7eb", color: "#111827" }}>Total:</td>
                    <td style={{ padding: "8px 5px 3px 5px", fontSize: "13px", fontWeight: "bold", textAlign: "right", borderTop: "1px solid #e5e7eb", color: "#b45309" }}>{formatMoney(orderTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="gst-note" style={{ fontSize: "9px", fontStyle: "italic", color: "#9ca3af", textAlign: "right", marginTop: "5px" }}>
              All prices are inclusive of GST.
            </div>

            {/* Footer */}
            <div className="footer" style={{ marginTop: "40px", borderTop: "1px solid #e5e7eb", paddingTop: "15px", fontSize: "10px", textAlign: "center", color: "#9ca3af" }}>
              <strong>Thank you for shopping at Madhu Garments!</strong><br />
              For support, reach out to contact@madhugarments.com or call +91 98765 43210.
            </div>
          </div>

        </div>

        <div className="admin-edit-actions" style={{ borderTop: "1px solid #e5e7eb", padding: "12px 20px" }}>
          <button className="admin-edit-cancel" onClick={onClose} type="button">
            Close Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
