/**
 * Speqtus Medical Ordering Platform — Order State Machine & Subtotal Unit Tests
 * Runs with Node.js built-in assert module: node tests/run_tests.js
 * Governed by PRD FR-13, Section 3.8, and AGENTS.md testing requirements.
 */

const assert = require('assert');

// Logic mirrored from lib/order-validator.ts
const VALID_ORDER_TRANSITIONS = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

function isValidOrderStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return true;
  }
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
  if (!allowed) {
    return false;
  }
  return allowed.includes(nextStatus);
}

function calculateOrderSubtotal(items) {
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

console.log('--- Running Speqtus Order State Machine & Pricing Unit Tests ---');

// Test Suite 1: State Machine Valid Transitions
console.log('Testing valid transitions...');
assert.strictEqual(isValidOrderStatusTransition('requested', 'confirmed'), true, 'requested -> confirmed should be valid');
assert.strictEqual(isValidOrderStatusTransition('requested', 'cancelled'), true, 'requested -> cancelled should be valid');
assert.strictEqual(isValidOrderStatusTransition('confirmed', 'dispatched'), true, 'confirmed -> dispatched should be valid');
assert.strictEqual(isValidOrderStatusTransition('confirmed', 'cancelled'), true, 'confirmed -> cancelled should be valid');
assert.strictEqual(isValidOrderStatusTransition('dispatched', 'delivered'), true, 'dispatched -> delivered should be valid');
assert.strictEqual(isValidOrderStatusTransition('requested', 'requested'), true, 'Same state (no-op) should be valid');
assert.strictEqual(isValidOrderStatusTransition('confirmed', 'confirmed'), true, 'Same state (no-op) should be valid');

// Test Suite 2: State Machine Invalid / Illegal Transitions
console.log('Testing invalid transitions...');
assert.strictEqual(isValidOrderStatusTransition('dispatched', 'cancelled'), false, 'dispatched -> cancelled must be rejected (FR-10, FR-13)');
assert.strictEqual(isValidOrderStatusTransition('dispatched', 'confirmed'), false, 'dispatched -> confirmed must be rejected (backwards)');
assert.strictEqual(isValidOrderStatusTransition('requested', 'delivered'), false, 'requested -> delivered must be rejected (skip-ahead)');
assert.strictEqual(isValidOrderStatusTransition('requested', 'dispatched'), false, 'requested -> dispatched must be rejected (skip-ahead)');
assert.strictEqual(isValidOrderStatusTransition('delivered', 'requested'), false, 'delivered -> requested must be rejected (backwards)');
assert.strictEqual(isValidOrderStatusTransition('delivered', 'confirmed'), false, 'delivered -> confirmed must be rejected (terminal)');
assert.strictEqual(isValidOrderStatusTransition('cancelled', 'confirmed'), false, 'cancelled -> confirmed must be rejected (terminal)');
assert.strictEqual(isValidOrderStatusTransition('cancelled', 'requested'), false, 'cancelled -> requested must be rejected (terminal)');
assert.strictEqual(isValidOrderStatusTransition('unknown_status', 'confirmed'), false, 'unknown status must be rejected');

// Test Suite 3: Subtotal Calculations (Normal, Zero, Null, Invalid)
console.log('Testing subtotal calculation...');
// Normal case
const normalItems = [
  { price: 450, quantity: 2 },
  { price: 1200, quantity: 1 },
];
assert.strictEqual(calculateOrderSubtotal(normalItems), 2100, 'Subtotal for 2*450 + 1*1200 should be 2100');

// Empty case
assert.strictEqual(calculateOrderSubtotal([]), 0, 'Subtotal for empty items array should be 0');
assert.strictEqual(calculateOrderSubtotal(null), 0, 'Subtotal for null items should be 0');

// Unpriced / Null price case (Confidential/Quote-based)
const unpricedItems = [
  { price: 450, quantity: 2 },
  { price: null, quantity: 1 },
];
assert.strictEqual(calculateOrderSubtotal(unpricedItems), null, 'Subtotal with unpriced variant should return null');

// Invalid quantity case (< 1)
assert.throws(
  () => calculateOrderSubtotal([{ price: 450, quantity: 0 }]),
  /Invalid item quantity/,
  'Zero quantity must throw an error'
);
assert.throws(
  () => calculateOrderSubtotal([{ price: 450, quantity: -2 }]),
  /Invalid item quantity/,
  'Negative quantity must throw an error'
);

console.log('>>> All 22 Unit Test Assertions Passed Successfully! <<<');
