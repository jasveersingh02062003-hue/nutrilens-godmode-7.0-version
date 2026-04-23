// ============================================
// Invoice PDF Generator (India)
// Supports two modes:
//   1) GST-registered (Tax Invoice with HSN/SAC 998365 — Online Advertising)
//   2) GST-exempt (plain Invoice, supplier turnover < ₹20L per Section 22 CGST Act)
// ============================================

import { jsPDF } from 'jspdf';

export interface InvoiceTxn {
  date: string;        // YYYY-MM-DD
  description: string; // e.g. "Campaign top-up — Nov '26"
  amount: number;      // pre-tax INR
  reference?: string;
}

export interface InvoiceParams {
  invoiceNo: string;
  invoiceDate: string;          // YYYY-MM-DD
  periodLabel: string;          // e.g. "November 2026"
  // Seller (NutriLens)
  sellerName: string;
  sellerGstin: string | null;
  sellerAddress: string;
  sellerStateCode: string | null;      // e.g. "29" for Karnataka
  // Buyer (brand)
  buyerName: string;
  buyerGstin?: string | null;
  buyerAddress?: string | null;
  buyerStateCode?: string | null;
  // Lines
  txns: InvoiceTxn[];
  gstRate?: number;             // default 18% for advertising services (ignored when gstExempt)
  /** If true: render plain "INVOICE", skip GST math, GSTIN rows & HSN line. */
  gstExempt?: boolean;
}

const fmtINR = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function generateGstInvoicePdf(p: InvoiceParams): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  const exempt = !!p.gstExempt;
  const rate = p.gstRate ?? 18;
  const sameState = !exempt && !!p.buyerStateCode && p.buyerStateCode === p.sellerStateCode;

  const subtotal = p.txns.reduce((s, t) => s + t.amount, 0);
  const taxTotal = exempt ? 0 : (subtotal * rate) / 100;
  const cgst = sameState ? taxTotal / 2 : 0;
  const sgst = sameState ? taxTotal / 2 : 0;
  const igst = !exempt && !sameState ? taxTotal : 0;
  const grandTotal = subtotal + taxTotal;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(exempt ? 'INVOICE' : 'TAX INVOICE', W / 2, y, { align: 'center' });
  y += 22;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${p.invoiceNo}`, margin, y);
  doc.text(`Date: ${p.invoiceDate}`, W - margin, y, { align: 'right' });
  y += 14;
  doc.text(`Billing Period: ${p.periodLabel}`, margin, y);
  if (!exempt) {
    doc.text(`HSN/SAC: 998365`, W - margin, y, { align: 'right' });
  }
  y += 20;

  // Seller block
  doc.setFont('helvetica', 'bold');
  doc.text('From (Supplier):', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 14;
  doc.text(p.sellerName, margin, y); y += 12;
  if (!exempt && p.sellerGstin) {
    doc.text(`GSTIN: ${p.sellerGstin}`, margin, y); y += 12;
    doc.text(`State Code: ${p.sellerStateCode ?? '—'}`, margin, y); y += 12;
  } else if (exempt) {
    doc.text('GST Status: Not Registered (Section 22, CGST Act)', margin, y); y += 12;
  }
  const sellerAddrLines = doc.splitTextToSize(p.sellerAddress, (W - margin * 2) / 2);
  doc.text(sellerAddrLines, margin, y); y += sellerAddrLines.length * 12 + 8;

  // Buyer block (right column, aligned to seller header)
  const buyerHeaderRows = exempt ? 1 : 2;
  let by = y - sellerAddrLines.length * 12 - 8 - (buyerHeaderRows * 12) - 24;
  const bx = W / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('To (Recipient):', bx, by);
  doc.setFont('helvetica', 'normal');
  by += 14;
  doc.text(p.buyerName, bx, by); by += 12;
  if (!exempt) {
    doc.text(`GSTIN: ${p.buyerGstin || 'Unregistered'}`, bx, by); by += 12;
    doc.text(`State Code: ${p.buyerStateCode || '—'}`, bx, by); by += 12;
  }
  if (p.buyerAddress) {
    const buyerAddrLines = doc.splitTextToSize(p.buyerAddress, (W - margin * 2) / 2);
    doc.text(buyerAddrLines, bx, by);
  }

  y += 10;
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 16;

  // Line items table
  doc.setFont('helvetica', 'bold');
  doc.text('Date', margin, y);
  doc.text('Description', margin + 70, y);
  doc.text('Amount', W - margin, y, { align: 'right' });
  y += 6;
  doc.line(margin, y, W - margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  for (const t of p.txns) {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.text(t.date, margin, y);
    const descLines = doc.splitTextToSize(t.description, W - margin * 2 - 170);
    doc.text(descLines, margin + 70, y);
    doc.text(fmtINR(t.amount), W - margin, y, { align: 'right' });
    y += descLines.length * 12 + 4;
  }

  y += 6;
  doc.line(margin, y, W - margin, y);
  y += 16;

  // Totals
  const labelX = W - margin - 160;
  const valueX = W - margin;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, labelX, y);
    doc.text(value, valueX, y, { align: 'right' });
    y += 14;
  };
  row('Subtotal', fmtINR(subtotal));
  if (!exempt) {
    if (sameState) {
      row(`CGST (${rate / 2}%)`, fmtINR(cgst));
      row(`SGST (${rate / 2}%)`, fmtINR(sgst));
    } else {
      row(`IGST (${rate}%)`, fmtINR(igst));
    }
  }
  y += 4;
  doc.setLineWidth(0.8);
  doc.line(labelX - 10, y, valueX, y);
  y += 14;
  row('Total Payable', fmtINR(grandTotal), true);

  // Footer note
  y += 30;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const footer = exempt
    ? 'GST not applicable. Supplier is not registered under GST (turnover below ₹20 lakh threshold per Section 22 of CGST Act, 2017). This is a computer-generated invoice and does not require a signature.'
    : 'This is a computer-generated invoice. SAC 998365 — Online Advertising Services. Reverse charge: No.';
  doc.text(doc.splitTextToSize(footer, W - margin * 2), margin, y);

  return doc.output('blob');
}

/**
 * Default seller details — currently configured for GST-EXEMPT mode.
 * When you register your business and obtain a GSTIN, update these values
 * and flip `gstExempt` to false. See TODO_BUSINESS_REGISTRATION.md at the project root.
 */
export const DEFAULT_SELLER = {
  sellerName: 'Nutrilens',
  sellerGstin: null as string | null,
  sellerAddress: 'India',
  sellerStateCode: null as string | null,
  gstExempt: true,
};
