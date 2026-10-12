/**
 * Speqtus Medical Ordering Platform — Native Share Sheet Helper
 * Governed by PRD Section 7 & Mobile Polish Roadmap.
 */

import { Share, Platform } from 'react-native';
import { logger } from '@/lib/logger';

export const DEFAULT_WEB_BASE_URL = 'https://app.speqtusmedical.com';

export interface ShareableProduct {
  id?: string;
  name: string;
  description?: string | null;
  category?: { name: string } | null;
  variants?: Array<{
    artNo: string;
    sizeLabel?: string | null;
    price?: number | null;
  }>;
}

export interface ShareableOrder {
  id?: string;
  orderNumber: string;
  status: string;
  subtotal: number | null;
  items?: Array<{
    productName: string;
    artNo: string;
    quantity: number;
    sizeLabel?: string | null;
  }>;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

/**
 * Formats a clean, readable text message for sharing a surgical instrument.
 */
export function formatProductShareText(
  product: ShareableProduct,
  webBaseUrl: string = DEFAULT_WEB_BASE_URL
): string {
  const parts: string[] = [`*${product.name.trim()}* — Speqtus Surgical Instruments`];

  if (product.category?.name) {
    parts.push(`Category: ${product.category.name.trim()}`);
  }

  if (product.description && product.description.trim()) {
    parts.push(`\n${product.description.trim()}`);
  }

  if (product.variants && product.variants.length > 0) {
    parts.push('\nAvailable Sizes & Art Nos:');
    product.variants.forEach((v) => {
      const sizeStr = v.sizeLabel ? ` (${v.sizeLabel})` : '';
      parts.push(`• Art No: ${v.artNo}${sizeStr}`);
    });
  }

  const cleanUrl = `${webBaseUrl.replace(/\/+$/, '')}/product/${product.id || ''}`;
  parts.push(`\nExplore & Order: ${cleanUrl}`);

  return parts.join('\n');
}

/**
 * Formats a clean, readable text message for sharing an order summary.
 */
export function formatOrderShareText(
  order: ShareableOrder,
  webBaseUrl: string = DEFAULT_WEB_BASE_URL
): string {
  const count = order.items ? order.items.length : 0;
  const subtotalStr =
    order.subtotal !== null && order.subtotal !== undefined
      ? `₹${order.subtotal.toLocaleString('en-IN')}`
      : 'Quote Pending';

  const parts: string[] = [
    `*Speqtus Medical Order #${order.orderNumber}*`,
    `Status: ${order.status.toUpperCase()}`,
    `Total Items: ${count}`,
    `Subtotal: ${subtotalStr}`,
  ];

  if (order.items && order.items.length > 0) {
    parts.push('\nOrdered Instruments:');
    order.items.slice(0, 5).forEach((item) => {
      const sizePart = item.sizeLabel ? ` (${item.sizeLabel})` : '';
      parts.push(`• ${item.quantity}x ${item.productName} [Art: ${item.artNo}${sizePart}]`);
    });
    if (order.items.length > 5) {
      parts.push(`• +${order.items.length - 5} more items`);
    }
  }

  if (order.trackingUrl) {
    parts.push(`\nTracking Link: ${order.trackingUrl}`);
  } else if (order.courierName && order.trackingNumber) {
    parts.push(`\nCourier: ${order.courierName} (AWB: ${order.trackingNumber})`);
  }

  const cleanUrl = `${webBaseUrl.replace(/\/+$/, '')}/order/${order.id || ''}`;
  parts.push(`Order Details: ${cleanUrl}`);

  return parts.join('\n');
}

/**
 * Triggers the native platform share dialog for a product.
 */
export async function shareProduct(
  product: ShareableProduct,
  webBaseUrl: string = DEFAULT_WEB_BASE_URL
): Promise<boolean> {
  try {
    const message = formatProductShareText(product, webBaseUrl);
    const url = `${webBaseUrl.replace(/\/+$/, '')}/product/${product.id || ''}`;
    const result = await Share.share({
      title: product.name,
      message,
      url: Platform.OS === 'ios' ? url : undefined,
    });
    return result.action === Share.sharedAction;
  } catch (err) {
    logger.error('Share', 'Failed to share product', err);
    return false;
  }
}

/**
 * Triggers the native platform share dialog for an order.
 */
export async function shareOrder(
  order: ShareableOrder,
  webBaseUrl: string = DEFAULT_WEB_BASE_URL
): Promise<boolean> {
  try {
    const message = formatOrderShareText(order, webBaseUrl);
    const url = `${webBaseUrl.replace(/\/+$/, '')}/order/${order.id || ''}`;
    const result = await Share.share({
      title: `Speqtus Order #${order.orderNumber}`,
      message,
      url: Platform.OS === 'ios' ? url : undefined,
    });
    return result.action === Share.sharedAction;
  } catch (err) {
    logger.error('Share', 'Failed to share order', err);
    return false;
  }
}
