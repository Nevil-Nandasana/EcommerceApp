/**
 * Speqtus Medical Ordering Platform — Order State Machine & Financial Logic
 * Governed by PRD FR-13 and Planning/VARIABLE_REGISTRY.md
 */

import { OrderStatus } from '@/types';

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Validates whether an order status transition is permissible under FR-13.
 */
export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true; // No-op is valid
  }

  const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
  if (!allowed) {
    return false;
  }

  return allowed.includes(nextStatus);
}

/**
 * Calculates order subtotal from cart or order items.
 * If any line item has a null price, returns null (quote-based pricing pending).
 */
export function calculateOrderSubtotal(
  items: Array<{ price: number | null; quantity: number }>
): number | null {
  if (!items || items.length === 0) {
    return 0;
  }

  let total = 0;
  for (const item of items) {
    if (item.quantity <= 0) {
      throw new Error(`Invalid item quantity: ${item.quantity}. Minimum quantity is 1.`);
    }
    if (item.price === null || item.price === undefined) {
      return null;
    }
    total += item.price * item.quantity;
  }

  return total;
}
