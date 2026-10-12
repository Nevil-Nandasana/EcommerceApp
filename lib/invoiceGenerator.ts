/**
 * Speqtus Medical Ordering Platform — Automated GST B2B Invoice Generator (FR-20)
 * Governed by Indian Medical Device GST Rules (HSN 9018, 12% GST) and Planning/VARIABLE_REGISTRY.md.
 */

import { Platform, Share } from 'react-native';
import { calculateGstBreakdown, HSN_SURGICAL_INSTRUMENTS } from '@/lib/tax';
import { logger } from '@/lib/logger';

export interface InvoiceDoctorDetails {
  fullName: string;
  hospitalName: string;
  phone: string;
  medicalRegNo?: string | null;
  address?: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
}

export interface InvoiceItemDetails {
  artNo: string;
  productName: string;
  sizeLabel: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceOrderDetails {
  id: string;
  orderNumber: string;
  createdAt: string;
  subtotal: number;
  paymentStatus: string;
  paymentMethod?: string | null;
}

/**
 * Converts a numeric amount to Indian English words (up to Lakhs)
 */
export function numberToWordsInr(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit ? ' ' + units[unit] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) str += `${units[hundred]} Hundred`;
    if (rest > 0) str += `${str ? ' and ' : ''}${convertTwoDigits(rest)}`;
    return str;
  }

  let remaining = rounded;
  let result = '';

  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crores > 0) result += `${convertThreeDigits(crores)} Crore `;

  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakhs > 0) result += `${convertTwoDigits(lakhs)} Lakh `;

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousands > 0) result += `${convertTwoDigits(thousands)} Thousand `;

  if (remaining > 0) result += `${convertThreeDigits(remaining)}`;

  return `Rupees ${result.trim()} Only`;
}

/**
 * Generates official printable HTML for the GST Tax Invoice
 */
export function generateGstInvoiceHtml(
  order: InvoiceOrderDetails,
  doctor: InvoiceDoctorDetails,
  items: InvoiceItemDetails[]
): string {
  const tax = calculateGstBreakdown(order.subtotal) || {
    taxableSubtotal: order.subtotal || 0,
    gstRate: 0.12,
    gstAmount: Math.round((order.subtotal || 0) * 0.12),
    cgstAmount: Math.round((order.subtotal || 0) * 0.06),
    sgstAmount: Math.round((order.subtotal || 0) * 0.06),
    estimatedTotal: Math.round((order.subtotal || 0) * 1.12),
    hsnCode: HSN_SURGICAL_INSTRUMENTS,
  };
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const invoiceNumber = `INV-${order.orderNumber}`;
  const amountInWords = numberToWordsInr(tax.estimatedTotal);

  const isIntraState = !doctor.address?.state || doctor.address.state.toLowerCase().includes('gujarat');

  const rowsHtml = items
    .map((item, idx) => {
      const lineTotal = item.quantity * item.unitPrice;
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${item.productName}</strong><br><span style="font-size: 11px; color: #555;">Size: ${item.sizeLabel}</span></td>
          <td style="text-align: center; font-family: monospace;">${item.artNo}</td>
          <td style="text-align: center;">${HSN_SURGICAL_INSTRUMENTS}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GST Tax Invoice - ${invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 30px;
      font-size: 13px;
      line-height: 1.4;
      background: #fff;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 30px;
      border-radius: 6px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 22px;
      font-weight: 700;
      color: #0d9488;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      background: #f1f5f9;
      color: #334155;
    }
    .paid-badge {
      background: #dcfce7;
      color: #166534;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 5px;
    }
    .details-table {
      width: 100%;
      margin-bottom: 25px;
    }
    .details-table td {
      vertical-align: top;
      width: 50%;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #475569;
    }
    .items-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
    }
    .totals-table {
      width: 340px;
      margin-left: auto;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .totals-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .grand-total {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      border-top: 2px solid #0d9488;
      border-bottom: 2px solid #0d9488 !important;
      background: #f0fdfa;
    }
    .footer-notes {
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      margin-top: 30px;
    }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td>
          <h1 class="company-name">SPEQTUS SURGICAL INSTRUMENTS</h1>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            Plot No. 42, GIDC Industrial Area, Rajkot, Gujarat — 360002<br>
            <strong>GSTIN:</strong> 24AAACS1234F1Z8 | <strong>Email:</strong> orders@speqtusmedical.com
          </div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <h2 style="margin: 0; font-size: 18px; color: #0f172a;">TAX INVOICE</h2>
          <div style="margin-top: 4px;"><strong>Invoice No:</strong> ${invoiceNumber}</div>
          <div><strong>Date:</strong> ${formattedDate}</div>
          <div style="margin-top: 6px;">
            <span class="badge ${order.paymentStatus === 'paid' ? 'paid-badge' : ''}">
              Payment: ${order.paymentStatus.toUpperCase()}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <table class="details-table">
      <tr>
        <td>
          <div class="section-title">Billed & Shipped To:</div>
          <strong>${doctor.fullName}</strong><br>
          ${doctor.hospitalName}<br>
          ${doctor.address ? `${doctor.address.line1}, ${doctor.address.city}, ${doctor.address.state} - ${doctor.address.pincode}` : 'Registered Clinic Address'}<br>
          Phone: ${doctor.phone}<br>
          ${doctor.medicalRegNo ? `Reg No: ${doctor.medicalRegNo}` : ''}
        </td>
        <td style="padding-left: 20px;">
          <div class="section-title">Order References:</div>
          <strong>Order Number:</strong> ${order.orderNumber}<br>
          <strong>Place of Supply:</strong> ${doctor.address?.state || 'Gujarat (24)'}<br>
          <strong>Reverse Charge:</strong> No<br>
          <strong>Payment Mode:</strong> ${order.paymentMethod || 'Bank Transfer / Razorpay'}
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Description of Surgical Goods</th>
          <th style="width: 80px;">Art No</th>
          <th style="width: 60px;">HSN</th>
          <th style="width: 40px;">Qty</th>
          <th style="width: 90px; text-align: right;">Rate (₹)</th>
          <th style="width: 100px; text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td>Taxable Amount:</td>
        <td style="text-align: right; font-weight: 600;">₹${tax.taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ${
        isIntraState
          ? `
        <tr>
          <td>CGST (6%):</td>
          <td style="text-align: right;">₹${tax.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>SGST (6%):</td>
          <td style="text-align: right;">₹${tax.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `
          : `
        <tr>
          <td>IGST (12%):</td>
          <td style="text-align: right;">₹${tax.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `
      }
      <tr class="grand-total">
        <td>Total (Incl. GST):</td>
        <td style="text-align: right;">₹${tax.estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>

    <div style="margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
      <strong>Amount in Words:</strong> ${amountInWords}
    </div>

    <div class="footer-notes">
      <div style="display: flex; justify-content: space-between;">
        <div style="max-width: 60%;">
          <strong>Terms & Conditions:</strong><br>
          1. Goods once supplied are specifically calibrated for surgical application.<br>
          2. Certified ISO 13485 surgical grade stainless steel instruments.<br>
          3. Subject to Rajkot jurisdiction.
        </div>
        <div style="text-align: right; width: 35%;">
          For <strong>Speqtus Surgical Instruments</strong><br><br><br>
          <span style="border-top: 1px solid #94a3b8; display: inline-block; padding-top: 4px;">Authorized Signatory</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens or prints the generated GST Tax invoice for doctors/admins
 */
export async function viewOrDownloadInvoice(
  order: InvoiceOrderDetails,
  doctor: InvoiceDoctorDetails,
  items: InvoiceItemDetails[]
): Promise<void> {
  const html = generateGstInvoiceHtml(order, doctor, items);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      return;
    }
  }

  // Native share fallback: shares invoice summary & link
  try {
    const summaryText = `SPEQTUS SURGICAL INSTRUMENTS\nTax Invoice: INV-${order.orderNumber}\nOrder Total: ₹${order.subtotal.toLocaleString('en-IN')} + 12% GST\nDoctor: ${doctor.fullName} (${doctor.hospitalName})\n\nView details at https://app.speqtusmedical.com/order/${order.id}`;
    await Share.share({
      title: `Invoice INV-${order.orderNumber}`,
      message: summaryText,
    });
  } catch (err) {
    logger.error('InvoiceGenerator', 'Failed to share invoice on native device', err);
  }
}
