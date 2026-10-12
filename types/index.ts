/**
 * Speqtus Medical Ordering Platform — Domain Types & Interfaces
 * Governed strictly by: Planning/VARIABLE_REGISTRY.md and PRD Section 3.
 */

export type UserRole = 'doctor' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'requested' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
export type PaymentStatus = 'not_applicable' | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_paid';
export type PaymentMethod = 'bank_transfer' | 'pay_on_delivery' | 'razorpay' | 'upi';

export interface Category {
  id: string;
  name: string;
  parentCategory: string;
  sortOrder: number;
  slug: string;
  createdAt: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  imageUrl: string;
  variantsCount: number;
  searchTags: string[];
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
  stockQuantity?: number | null; // Inventory tracking (T5.P.1 / F-15)
  isInStock?: boolean;
  lowStockThreshold?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupportedLanguage = 'en' | 'hi' | 'gu';


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
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  organizationId?: string | null;
  departmentName?: string | null;
  onBehalfOfDoctor?: string | null;
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
  updatedAt?: string;
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

export interface PaymentRecord {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  gatewaySignature?: string | null;
  rawPayload?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartSyncItem {
  id?: string;
  userId: string;
  productVariantId: string;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminAnalyticsSummary {
  grossRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  paidOrdersCount: number;
  pendingPaymentCount: number;
  unpricedItemsCount: number;
  pendingDoctorsCount: number;
  statusBreakdown: Record<OrderStatus, number>;
  topInstruments: Array<{
    artNo: string;
    productName: string;
    totalQuantity: number;
    orderCount: number;
  }>;
}

export type OrganizationMemberRole = 'admin' | 'purchaser' | 'surgeon';

export interface Organization {
  id: string;
  name: string;
  gstin?: string | null;
  billingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  memberRole: OrganizationMemberRole;
  department?: string | null;
  createdAt: string;
  organization?: Organization;
}

export type ConsentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'b2b_medical_data_processing'
  | 'order_communications';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  version: string;
  isGranted: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  consentedAt: string;
  withdrawnAt?: string | null;
}
