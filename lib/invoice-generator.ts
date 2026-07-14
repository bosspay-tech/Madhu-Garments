import { jsPDF } from "jspdf";

export interface InvoiceItem {
  id?: string;
  name?: string;
  title?: string; // fallback
  quantity?: number;
  unitPrice?: number;
  price?: number; // fallback
  image?: string;
}

export interface InvoiceOrder {
  id: string;
  transaction_id?: string;
  created_at?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_pincode?: string;
  billing_same_as_delivery?: boolean;
  billing_name?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  items?: InvoiceItem[];
  total?: number | string;
  status?: string;
  order_status?: string;
  invoice_status?: string;
  store_id?: string;
  is_bosspay_txn?: boolean;
  pg_type?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch (e) {
    return dateStr.slice(0, 10);
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function generateInvoicePDF(order: InvoiceOrder): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Color Palette
  const primaryColor = [31, 41, 55]; // Charcoal/Slate
  const secondaryColor = [107, 114, 128]; // Muted Gray
  const lightGray = [243, 244, 246]; // Table Alt Rows
  const dividerColor = [229, 231, 235]; // Border line gray

  const marginX = 15;
  let currentY = 15;

  // 1. Header (Company Info)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("MADHU GARMENTS", marginX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  currentY += 5;
  doc.text("Premium Apparel & Ethnic Wear", marginX, currentY);

  // Business Address (Right side of header)
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const rightAlignX = 195;
  doc.text("Madhu Garments", rightAlignX, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("12, Karol Bagh Main Market,", rightAlignX, 19, { align: "right" });
  doc.text("New Delhi - 110005, India", rightAlignX, 23, { align: "right" });
  doc.text("Email: store@madhugarments.com", rightAlignX, 27, { align: "right" });
  doc.text("Phone: +91 98765 43210", rightAlignX, 31, { align: "right" });

  currentY = 38;
  doc.setDrawColor(dividerColor[0], dividerColor[1], dividerColor[2]);
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY, rightAlignX, currentY);

  // 2. Invoice Meta Info
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TAX INVOICE", marginX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  currentY += 6;

  const invoiceNo = `MG-${(order.transaction_id || order.id).slice(0, 10).toUpperCase()}`;
  doc.text(`Invoice No: ${invoiceNo}`, marginX, currentY);
  doc.text(`Invoice Date: ${formatDate(order.created_at)}`, rightAlignX, currentY, { align: "right" });

  currentY += 5;
  const paymentStatusStr = (order.status || "pending").toUpperCase();
  doc.text(`Payment Method: Online Payment (Easebuzz)`, marginX, currentY);
  doc.text(`Payment Status: ${paymentStatusStr}`, rightAlignX, currentY, { align: "right" });

  currentY += 5;
  const orderStatusStr = (order.order_status || order.status || "Pending").toUpperCase();
  doc.text(`Order Status: ${orderStatusStr}`, marginX, currentY);
  const invStatusStr = (order.invoice_status || (order.status === "success" ? "issued" : "draft")).toUpperCase();
  doc.text(`Invoice Status: ${invStatusStr}`, rightAlignX, currentY, { align: "right" });

  currentY += 8;
  doc.line(marginX, currentY, rightAlignX, currentY);

  // 3. Customer Info (Billing & Shipping)
  currentY += 8;
  const billingSame = order.billing_same_as_delivery !== false;
  const colWidth = 80;

  // Bill To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BILL TO:", marginX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  currentY += 5;
  
  const bName = order.billing_name || order.customer_name || "Customer";
  const bAddress = order.billing_address || order.customer_address || "N/A";
  const bCity = order.billing_city || order.customer_city || "";
  const bState = order.billing_state || order.customer_state || "";
  const bPincode = order.billing_pincode || order.customer_pincode || "";

  doc.text(bName, marginX, currentY);
  currentY += 4;
  
  // Format address text to prevent overflow
  const bAddressLines = doc.splitTextToSize(bAddress, colWidth);
  bAddressLines.forEach((line: string) => {
    doc.text(line, marginX, currentY);
    currentY += 4;
  });
  doc.text(`${bCity}, ${bState} - ${bPincode}`, marginX, currentY);
  currentY += 4;
  if (!order.is_bosspay_txn && order.customer_phone) {
    doc.text(`Phone: ${order.customer_phone}`, marginX, currentY);
    currentY += 4;
  }
  doc.text(`Email: ${order.customer_email || "N/A"}`, marginX, currentY);

  // Ship To (Reset Y to BILL TO start position and shift X)
  let shipY = currentY - (4 * (bAddressLines.length + 3));
  if (!order.is_bosspay_txn && order.customer_phone) shipY -= 4;
  const shipX = 110;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("SHIP TO:", shipX, 79); // Align exactly with BILL TO heading

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  let sY = 84;
  const sName = order.customer_name || "Customer";
  const sAddress = order.customer_address || "N/A";
  const sCity = order.customer_city || "";
  const sState = order.customer_state || "";
  const sPincode = order.customer_pincode || "";

  doc.text(sName, shipX, sY);
  sY += 4;
  const sAddressLines = doc.splitTextToSize(sAddress, colWidth);
  sAddressLines.forEach((line: string) => {
    doc.text(line, shipX, sY);
    sY += 4;
  });
  doc.text(`${sCity}, ${sState} - ${sPincode}`, shipX, sY);
  sY += 4;
  if (!order.is_bosspay_txn && order.customer_phone) {
    doc.text(`Phone: ${order.customer_phone}`, shipX, sY);
    sY += 4;
  }

  // Adjust currentY to be the maximum of billing or shipping info block
  currentY = Math.max(currentY, sY) + 8;
  doc.line(marginX, currentY, rightAlignX, currentY);

  // 4. Items Table
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("ORDERED ITEMS", marginX, currentY);

  currentY += 5;
  // Table Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(marginX, currentY, 180, 7, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("S.No.", marginX + 3, currentY + 4.5);
  doc.text("Description", marginX + 15, currentY + 4.5);
  doc.text("Price", marginX + 105, currentY + 4.5, { align: "right" });
  doc.text("Qty", marginX + 128, currentY + 4.5, { align: "right" });
  doc.text("Total", marginX + 175, currentY + 4.5, { align: "right" });

  currentY += 7;
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "normal");

  const items = order.items || [];
  let index = 1;
  let itemsSubtotal = 0;

  items.forEach((item) => {
    // Zebra rows
    if (index % 2 === 0) {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(marginX, currentY, 180, 7, "F");
    }

    const name = item.name || item.title || "Product";
    const qty = item.quantity || 1;
    const price = item.unitPrice || item.price || 0;
    const itemTotal = price * qty;
    itemsSubtotal += itemTotal;

    doc.text(String(index), marginX + 3, currentY + 4.5);
    
    // Fit name into the description cell width (approx 80mm width)
    const nameLines = doc.splitTextToSize(name, 80);
    doc.text(nameLines[0] || "", marginX + 15, currentY + 4.5);

    doc.text(formatCurrency(price), marginX + 105, currentY + 4.5, { align: "right" });
    doc.text(String(qty), marginX + 128, currentY + 4.5, { align: "right" });
    doc.text(formatCurrency(itemTotal), marginX + 175, currentY + 4.5, { align: "right" });

    currentY += 7;
    index += 1;
  });

  doc.line(marginX, currentY, rightAlignX, currentY);

  // 5. Total Calculations
  currentY += 6;
  const orderTotal = Number(order.total || itemsSubtotal);
  const discount = Math.max(0, itemsSubtotal - orderTotal);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  // Align calculations on the right
  const calcLabelX = 145;
  const calcValX = 195;

  doc.text("Subtotal:", calcLabelX, currentY, { align: "right" });
  doc.text(formatCurrency(itemsSubtotal), calcValX, currentY, { align: "right" });

  if (discount > 0) {
    currentY += 5;
    doc.text("Discount:", calcLabelX, currentY, { align: "right" });
    doc.text(`-${formatCurrency(discount)}`, calcValX, currentY, { align: "right" });
  }

  currentY += 5;
  doc.text("Shipping:", calcLabelX, currentY, { align: "right" });
  doc.text("Free", calcValX, currentY, { align: "right" });

  currentY += 5;
  doc.setDrawColor(dividerColor[0], dividerColor[1], dividerColor[2]);
  doc.line(110, currentY, calcValX, currentY);

  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Total Payable Amount:", calcLabelX, currentY, { align: "right" });
  doc.text(formatCurrency(orderTotal), calcValX, currentY, { align: "right" });

  // GST Note (inclusive)
  currentY += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("All prices are inclusive of GST (where applicable).", calcValX, currentY, { align: "right" });

  // 6. Notes & Return Policy Footer
  currentY = 255;
  doc.setDrawColor(dividerColor[0], dividerColor[1], dividerColor[2]);
  doc.line(marginX, currentY, rightAlignX, currentY);

  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Thank you for your business!", marginX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  currentY += 4;
  doc.text("Standard Terms & Conditions apply. In case of any return or exchange queries, please raise request within 7 days.", marginX, currentY);
  currentY += 4;
  doc.text("For support, reach out to contact@madhugarments.com or call our store helpline +91 98765 43210.", marginX, currentY);

  return doc;
}
