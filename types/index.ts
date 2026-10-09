/**
 * Speqtus Medical Ordering Platform — Domain Types & Interfaces
 * Governed strictly by: Planning/VARIABLE_REGISTRY.md and PRD Section 3.
 */

export type UserRole = 'doctor' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'requested' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
export type PaymentStatus = 'not_applicable' | 'pending' | 'paid' | 'failed';
export type PaymentMethod = 'bank_transfer' | 'pay_on_delivery';

export interface Category {
  id: string;
  name: string;
  parentCategory: string;
  sortOrder: number;
  slug: string;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  additionalImages: string[] | null;
  searchTags: string[];
  isActive: boolean;
  sourceRowRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  artNo: string;
  sizeLabel: string;
  sizeCm: number | null;
  price: number | null; // Confidential per FR-5 (null for unapproved/guests)
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithVariants extends Product {
  category?: Category;
  variants: ProductVariant[];
}

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string;
  phone: string;
  email: string | null;
  hospitalOrClinicName: string;
  medicalRegistrationNumber: string | null;
  specialty: string | null;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  pushToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  phoneOverride: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productVariantId: string;
  quantity: number;
  unitPriceAtOrder: number | null; // Snapshot locked at order creation time
  variant?: ProductVariant;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "SPQ-2026-0001"
  userId: string;
  status: OrderStatus;
  addressId: string;
  notes: string | null;
  subtotal: number | null;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  invoiceUrl: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  address?: Address;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedBy: string;
  changedAt: string;
  note: string | null;
}

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  categoryName: string;
  artNo: string;
  sizeLabel: string;
  price: number | null;
  imageUrl: string;
  quantity: number;
}

export interface SavedSet {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items?: SavedSetItem[];
}

export interface SavedSetItem {
  id: string;
  setId: string;
  productVariantId: string;
  quantity: number;
  variant?: ProductVariant;
  product?: Product & { category?: { name: string } };
}
