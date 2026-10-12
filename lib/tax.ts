/**
 * Speqtus Medical Ordering Platform — Tax & GST Breakdown Utility
 * Governed by PRD Section 3 & HSN Code 9018 (Medical & Surgical Instruments - 12% GST).
 */

export const HSN_SURGICAL_INSTRUMENTS = '9018';
export const GST_RATE_SURGICAL_INSTRUMENTS = 0.12; // 12% Total (6% CGST + 6% SGST, or 12% IGST)

export interface GstBreakdown {
  taxableSubtotal: number;
  gstRate: number; // 0.12
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  estimatedTotal: number;
  hsnCode: string;
}

/**
 * Computes estimated GST breakdown for taxable subtotal.
 * If subtotal is null, undefined, or unpriced (quote pending), returns null.
 */
export function calculateGstBreakdown(
  taxableSubtotal: number | null | undefined
): GstBreakdown | null {
  if (
    taxableSubtotal === null ||
    taxableSubtotal === undefined ||
    typeof taxableSubtotal !== 'number' ||
    !Number.isFinite(taxableSubtotal) ||
    taxableSubtotal < 0
  ) {
    return null;
  }

  const cleanSubtotal = Object.is(taxableSubtotal, -0) ? 0 : taxableSubtotal;

  const gstAmount = Math.round(cleanSubtotal * GST_RATE_SURGICAL_INSTRUMENTS);
  const cgstAmount = Math.round(cleanSubtotal * 0.06);
  const sgstAmount = gstAmount - cgstAmount; // Ensures cgst + sgst always equals gstAmount
  const estimatedTotal = cleanSubtotal + gstAmount;

  return {
    taxableSubtotal: cleanSubtotal,
    gstRate: GST_RATE_SURGICAL_INSTRUMENTS,
    gstAmount,
    cgstAmount,
    sgstAmount,
    estimatedTotal,
    hsnCode: HSN_SURGICAL_INSTRUMENTS,
  };
}
