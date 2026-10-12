# Speqtus Ordering App — Variable & Identifier Registry

> **Single Source of Truth** for database columns, shared TypeScript types, status enums, environment variables, and client state identifiers.
> 
> **Governed by:** [.agents/skills/variable-registry/SKILL.md](../.agents/skills/variable-registry/SKILL.md)  
> **Rule:** Never invent, guess, or arbitrarily alter casing for any variable listed here. Check this file before writing queries, types, components, or migrations.

---

## 1. Database & Schema Fields (PostgreSQL / Supabase)

Authoritative reference: [PRD Section 3 (Data Model)](./PRD_Speqtus_Ordering_App.md#3-information-architecture--data-model).

### 1.1 `categories`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `name` | `text` | No | — | Category display name (e.g. "Needle Holders & Suturing Instruments") |
| `parent_category` | `text` | No | — | One of the 24 top-level sections (e.g. "General Surgery Instruments") |
| `sort_order` | `integer` | No | `0` | Order index for category listing |
| `slug` | `text` | No | — | URL-friendly unique identifier |

### 1.2 `products`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `category_id` | `uuid` | No | — | Foreign key → `categories.id` |
| `name` | `text` | No | — | Instrument title (e.g. "Bozemann Knot Tier") |
| `description` | `text` | Yes | `null` | Optional description text |
| `image_url` | `text` | No | — | Primary catalog image stored in Cloudflare R2 |
| `additional_images` | `text[]`| Yes | `null` | Array of additional Cloudflare R2 image URLs |
| `search_tags` | `text[]`| No | `'{}'` | Specialty tags: Ortho, ENT, Gynae, Cardiac, Neuro, General, etc. |
| `is_active` | `boolean` | No | `true` | Soft-hide flag without deleting rows |
| `source_row_ref` | `text` | Yes | `null` | Reference back to master Google Sheet row for sync audit |

### 1.3 `product_variants`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `product_id` | `uuid` | No | — | Foreign key → `products.id` |
| `art_no` | `text` | No | — | **Unique article number** (e.g. "03-27-15"). Primary business identifier |
| `size_label` | `text` | No | — | Formatted size string (e.g. "15.5 CM – 6\"") |
| `size_cm` | `numeric` | Yes | `null` | Numeric parsed length for sorting/filtering |
| `price` | `numeric` | Yes | `null` | Price in INR; `null` until admin sets it (confidential, FR-5) |
| `currency` | `text` | No | `'INR'` | Currency code |
| `stock_quantity` | `integer` | No | `50` | Inventory count available in warehouse (T5.P.1 / F-15) |
| `is_in_stock` | `boolean` | No | `true` | Computed/manual stock availability flag |
| `low_stock_threshold` | `integer` | No | `5` | Threshold under which amber warning is shown |
| `is_active` | `boolean` | No | `true` | Soft-hide variant flag |

### 1.4 `users`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | — | Primary key (= `auth.users.id` from Supabase Auth) |
| `role` | `user_role` | No | `'doctor'` | Enum: `'doctor'`, `'admin'` |
| `full_name` | `text` | No | — | Doctor or clinic contact name |
| `phone` | `text` | No | — | Unique phone number; primary login & WhatsApp channel |
| `email` | `text` | Yes | `null` | Optional email address |
| `hospital_or_clinic_name` | `text` | No | — | Practice or clinic name |
| `medical_registration_number` | `text` | Yes | `null` | State medical council registration number |
| `specialty` | `text` | Yes | `null` | Medical specialty (e.g. "Orthopedic", "Gynecology") |
| `approval_status` | `approval_status` | No | `'pending'` | Enum: `'pending'`, `'approved'`, `'rejected'` |
| `approved_by` | `uuid` | Yes | `null` | Foreign key → `users.id` (Admin who approved) |
| `approved_at` | `timestamptz` | Yes | `null` | Timestamp when approved by admin |
| `push_token` | `text` | Yes | `null` | Expo push notification device token (`ExponentPushToken[...]`) |
| `created_at` | `timestamptz` | No | `now()` | Account creation timestamp |

### 1.5 `addresses`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | No | — | Foreign key → `users.id` |
| `label` | `text` | No | — | Label (e.g. "Clinic", "Hospital OT", "Home") |
| `line1` | `text` | No | — | Address line 1 |
| `line2` | `text` | Yes | `null` | Address line 2 |
| `city` | `text` | No | — | City name |
| `state` | `text` | No | — | State name (e.g. "Gujarat") |
| `pincode` | `text` | No | — | 6-digit postal code |
| `phone_override` | `text` | Yes | `null` | Alternate phone number for delivery |
| `is_default` | `boolean` | No | `false` | Default address flag |

### 1.6 `saved_sets` & `saved_set_items`
| Column Name | Table | Postgres Type | Nullable | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `saved_sets` | `uuid` | No | Primary key |
| `user_id` | `saved_sets` | `uuid` | No | Foreign key → `users.id` |
| `name` | `saved_sets` | `text` | No | Set name (e.g. "My Minor OT Set") |
| `id` | `saved_set_items` | `uuid` | No | Primary key |
| `saved_set_id` | `saved_set_items` | `uuid` | No | Foreign key → `saved_sets.id` |
| `product_variant_id` | `saved_set_items`| `uuid` | No | Foreign key → `product_variants.id` |
| `quantity` | `saved_set_items`| `integer` | No | Quantity in set (default `1`) |

### 1.7 `orders`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `order_number` | `text` | No | — | Human-readable sequential ID (e.g. `SPQ-2026-0001`) |
| `user_id` | `uuid` | No | — | Foreign key → `users.id` |
| `status` | `order_status` | No | `'requested'` | Order state: requested, confirmed, dispatched, delivered, cancelled |
| `address_id` | `uuid` | No | — | Foreign key → `addresses.id` |
| `notes` | `text` | Yes | `null` | Doctor's order notes / special instructions |
| `subtotal` | `numeric` | Yes | `null` | Calculated order total once priced |
| `payment_status` | `payment_status` | No | `'not_applicable'` | Enum: not_applicable, pending, paid, failed |
| `payment_method` | `payment_method` | Yes | `null` | Enum: bank_transfer, pay_on_delivery |
| `invoice_url` | `text` | Yes | `null` | Cloudflare R2 URL to generated PDF invoice |
| `organization_id` | `uuid` | Yes | `null` | Foreign key → `organizations.id` (Hospital account ordering) |
| `department_name` | `text` | Yes | `null` | Hospital department attribution (e.g. 'Orthopedic OT') |
| `on_behalf_of_doctor` | `text` | Yes | `null` | Name of doctor on whose behalf the purchasing manager is ordering |
| `created_at` | `timestamptz` | No | `now()` | Order placement timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Last status update timestamp |

### 1.8 `order_items`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `order_id` | `uuid` | No | — | Foreign key → `orders.id` |
| `product_variant_id`| `uuid` | No | — | Foreign key → `product_variants.id` |
| `quantity` | `integer` | No | `1` | Quantity ordered (min 1) |
| `unit_price_at_order`| `numeric`| Yes | `null` | **Price snapshot** at order time. Never recomputed from catalog! |

### 1.9 `order_status_history`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `order_id` | `uuid` | No | — | Foreign key → `orders.id` |
| `status` | `order_status` | No | — | Status transitioned to |
| `changed_by` | `uuid` | No | — | Foreign key → `users.id` |
| `changed_at` | `timestamptz` | No | `now()` | Audit timestamp |
| `note` | `text` | Yes | `null` | Transition rationale or courier tracking reference |

### 1.10 `payments`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `order_id` | `uuid` | No | — | Foreign key → `orders.id` |
| `user_id` | `uuid` | No | — | Foreign key → `users.id` |
| `amount` | `numeric` | No | — | Payment transaction amount in INR |
| `currency` | `text` | No | `'INR'` | Currency code |
| `status` | `payment_status` | No | `'pending'` | Enum: pending, paid, failed, refunded, partially_paid |
| `payment_method` | `text` | No | — | Gateway or method used: razorpay, upi, bank_transfer, etc. |
| `gateway_order_id` | `text` | Yes | `null` | Razorpay order ID (e.g. `order_K1234567890`) |
| `gateway_payment_id`| `text` | Yes | `null` | Razorpay payment ID (e.g. `pay_K1234567890`) |
| `gateway_signature` | `text` | Yes | `null` | HMAC-SHA256 signature for verification |
| `raw_payload` | `jsonb` | Yes | `null` | Full webhook / checkout response dump |
| `created_at` | `timestamptz` | No | `now()` | Transaction creation timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Transaction update timestamp |

### 1.11 `cart_items`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | No | — | Foreign key → `users.id` |
| `product_variant_id`| `uuid` | No | — | Foreign key → `product_variants.id` |
| `quantity` | `integer` | No | `1` | Cart quantity (strictly > 0) |
| `created_at` | `timestamptz` | No | `now()` | Item added timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Last modification timestamp |

### 1.12 `organizations` (PRD Section 10 Decision #2)
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `name` | `text` | No | — | Hospital or healthcare institution name |
| `gstin` | `text` | Yes | `null` | 15-character GSTIN for B2B billing |
| `billing_address` | `text` | Yes | `null` | Hospital central billing address |
| `city` | `text` | Yes | `null` | City |
| `state` | `text` | Yes | `null` | State |
| `pincode` | `text` | Yes | `null` | 6-digit postal code |
| `created_at` | `timestamptz` | No | `now()` | Registration timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Modification timestamp |

### 1.13 `organization_members`
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `organization_id` | `uuid` | No | — | Foreign key → `organizations.id` |
| `user_id` | `uuid` | No | — | Foreign key → `users.id` |
| `member_role` | `text` | No | `'purchaser'` | Role within hospital: 'admin', 'purchaser', 'surgeon' |
| `department` | `text` | Yes | `null` | Department (e.g. 'Orthopedics', 'Cardio OT', 'General Surgery') |
| `created_at` | `timestamptz` | No | `now()` | Membership timestamp |

### 1.14 `consent_records` (DPDP Act 2023 Compliance, T5.P.9)
| Column Name | Postgres Type | Nullable | Default | Description & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | No | — | Foreign key → `users.id` |
| `consent_type` | `text` | No | — | Scope: 'terms_of_service', 'privacy_policy', 'b2b_medical_data_processing', 'order_communications' |
| `version` | `text` | No | `'v1.0'` | Version string of the consented legal notice or policy |
| `is_granted` | `boolean` | No | `true` | Explicit affirmative consent grant flag |
| `ip_address` | `text` | Yes | `null` | IP address recorded at the time of affirmative consent |
| `user_agent` | `text` | Yes | `null` | Client platform / OS user agent string |
| `consented_at` | `timestamptz` | No | `now()` | Immutable audit timestamp of consent event |
| `withdrawn_at` | `timestamptz` | Yes | `null` | Optional revocation timestamp if user revokes consent |

---

## 2. Status Enums & State Machines

Strictly use these exact string literals. Do NOT invent alternative status names.

### 2.1 `order_status`
```sql
CREATE TYPE order_status AS ENUM (
  'requested',
  'confirmed',
  'dispatched',
  'delivered',
  'cancelled'
);
```
- **Allowed Transitions:**
  - `requested` → `confirmed` (Admin confirms order and pricing)
  - `requested` → `cancelled` (Doctor or Admin cancels)
  - `confirmed` → `dispatched` (Admin ships package with courier details)
  - `confirmed` → `cancelled` (Admin cancels)
  - `dispatched` → `delivered` (Admin/courier marks fulfilled)
  - `dispatched` → `cancelled` (Return / Delivery failure)

### 2.2 `approval_status`
```sql
CREATE TYPE approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);
```

### 2.3 `user_role`
```sql
CREATE TYPE user_role AS ENUM (
  'doctor',
  'admin'
);
```
*(Note: `guest` is an unauthenticated client role, never stored in database)*

### 2.4 `payment_status`
```sql
CREATE TYPE payment_status AS ENUM (
  'not_applicable',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_paid'
);
```

### 2.5 `payment_method`
```sql
CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'pay_on_delivery',
  'razorpay',
  'upi'
);
```

---

## 3. TypeScript Shared Identifiers & DTO Mappings

| TypeScript Field | Type | Corresponding DB Column | Scope / Interface |
| :--- | :--- | :--- | :--- |
| `artNo` | `string` | `art_no` | `ProductVariantDTO`, `CartItem` |
| `sizeLabel` | `string` | `size_label` | `ProductVariantDTO` |
| `sizeCm` | `number \| null` | `size_cm` | `ProductVariantDTO` |
| `unitPriceAtOrder` | `number \| null` | `unit_price_at_order` | `OrderItemDTO` |
| `orderNumber` | `string` | `order_number` | `OrderDTO` |
| `approvalStatus` | `'pending' \| 'approved' \| 'rejected'` | `approval_status` | `UserProfile` |
| `pushToken` | `string \| null` | `push_token` | `UserProfile` |
| `orderStatus` | `'requested' \| 'confirmed' \| 'dispatched' \| 'delivered' \| 'cancelled'` | `status` | `OrderDTO` |
| `paymentStatus` | `'not_applicable' \| 'pending' \| 'paid' \| 'failed'` | `payment_status` | `OrderDTO` |

---

## 4. Environment Variables & Secret Keys

| Key Name | Layer / Environment | Required | Description |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Client (Expo / Web) | Yes | Supabase project API gateway URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client (Expo / Web) | Yes | Supabase public anonymous API key for RLS queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend / Edge Functions | Yes | Secret service role key (bypasses RLS; NEVER expose to client) |
| `R2_ACCOUNT_ID` | Storage / Edge Functions | Yes | Cloudflare account identifier for image uploads |
| `R2_ACCESS_KEY_ID` | Storage / Edge Functions | Yes | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Storage / Edge Functions | Yes | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | Storage / Edge Functions | Yes | Speqtus product image bucket |
| `R2_PUBLIC_URL_PREFIX` | Client / Web | Yes | Public CDN URL prefix for catalog image delivery |
| `EXPO_PUBLIC_WHATSAPP_PHONE` | Client (Expo / Web) | No | WhatsApp business ordering phone number for offline checkout |
| `EXPO_PUBLIC_SUPPORT_PHONE` | Client (Expo / Web) | No | Direct telephone support contact phone number for doctors |
| `EXPO_PUBLIC_SENTRY_DSN` | Client (Expo / Web) | No | Sentry DSN endpoint for production crash monitoring & error reporting |
| `EXPO_PUBLIC_WEB_URL` | Client (Expo / Web) | No | Base web application URL for native deep-linking & share sheets |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID`| Client (Expo / Web) | No | Razorpay publishable Key ID for online checkout |
| `RAZORPAY_KEY_SECRET` | Backend / Edge Functions | Yes | Razorpay API Secret key for order creation & signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | Backend / Edge Functions | Yes | Razorpay Webhook HMAC secret for payment status callbacks |
| `WHATSAPP_API_TOKEN` | Backend / Edge Functions | Yes | Meta WhatsApp Cloud API access token for automated notifications |
| `WHATSAPP_PHONE_NUMBER_ID` | Backend / Edge Functions | Yes | Meta WhatsApp Cloud API sender phone ID |
| `WHATSAPP_TEMPLATE_ORDER_CONFIRMED` | Backend / Edge Functions | No | Meta approved template name for order confirmation alert |
| `WHATSAPP_TEMPLATE_ORDER_DISPATCHED` | Backend / Edge Functions | No | Meta approved template name for order dispatch alert |
| `RESEND_API_KEY` | Backend / Edge Functions | Yes | Resend API key for transactional email alerts |
| `OWNER_EMAIL` | Backend / Edge Functions | Yes | Destination email address for new order notification alerts |
| `ALLOWED_ORIGIN` | Backend / Edge Functions | No | Restricts CORS Access-Control-Allow-Origin header (defaults to admin domain) |

---

## 5. Client State Identifiers (React Native / Expo)

| State / Prop Variable | Store / Context / File | Type | Description |
| :--- | :--- | :--- | :--- |
| `cartItems` | `CartStore` | `CartItem[]` | Array of items currently in cart |
| `activeCategoryId` | `CatalogContext` | `string \| null` | Currently selected surgical category ID |
| `searchQuery` | `CatalogContext` / `OrdersScreen` | `string` | Search query for Art No, order number, or instrument name |
| `selectedStatus` | `OrdersScreen` | `string` | Filter tab id ('all', 'requested', 'confirmed', 'dispatched', 'delivered', 'cancelled') |
| `currentUser` | `AuthContext` | `UserProfile \| null` | Logged-in doctor or admin profile |
| `CATEGORIES_CACHE_KEY` | `lib/catalogCache.ts` | `string` (`speqtus_cache_categories`) | Local storage key for cached categories JSON |
| `CATEGORIES_META_KEY` | `lib/catalogCache.ts` | `string` (`speqtus_cache_categories_meta`) | Storage key for categories fingerprint and timestamp |
| `PRODUCTS_CACHE_PREFIX`| `lib/catalogCache.ts` | `string` (`speqtus_cache_products_`) | Key prefix for category product listing cache |
| `PRODUCTS_META_PREFIX` | `lib/catalogCache.ts` | `string` (`speqtus_cache_products_meta_`) | Key prefix for category product fingerprint metadata |
| `HSN_SURGICAL_INSTRUMENTS` | `lib/tax.ts` | `string` (`'9018'`) | Indian GST HSN code for medical & surgical instruments |
| `GST_RATE_SURGICAL_INSTRUMENTS` | `lib/tax.ts` | `number` (`0.12`) | 12% GST rate for surgical instruments |
| `OFFLINE_CATALOG_STORAGE_KEY` | `lib/offlineCatalog.ts` | `string` (`speqtus_offline_catalog_v1`) | Storage key for local embedded offline catalog database |
| `USER_LANGUAGE_KEY` | `lib/i18n.ts` | `string` (`speqtus_user_language`) | Persistent storage key for active UI localization language ('en', 'hi', 'gu') |

---

## 6. Changelog & Identifier Evolution

| Date | Identifier | Action | Replacement | Reason / Notes |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-24 | Initial Registry | Created | — | Initialized from PRD Section 3 and AGENTS.md rules |
| 2026-10-05 | `APP_CONFIG` | Added | — | Centralized client constants config referencing registered env keys |
| 2026-10-05 | Security Policies | Hardened | — | Migration `20261005000009_security_fixes.sql` enforcing explicit DELETE policies and search_catalog SECURITY INVOKER |
| 2026-10-06 | Security Hardening | Hardened | — | Migration `20261006000009_security_hardening.sql` enforcing explicit DELETE policies, search_catalog SECURITY INVOKER with price masking, and Edge Function access control |
| 2026-10-09 | 5 Boost Features | Added | — | Added `lib/catalogCache.ts` storage keys, `lib/reorderCheck.ts` diff models, and order filter tabs & search |
| 2026-10-09 | Boost Review Fixes | Fixed | — | Corrected category cache fingerprint max timestamp reduction, reorder warning modal dismiss action on all-discontinued items, and international WhatsApp phone normalization |
| 2026-10-09 | 5 Next Polish Features | Added | — | Registered `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_WEB_URL`, HSN 9018 constants, OT Set rename validation, and native share formatters |
| 2026-10-12 | High-Impact Commercial Features | Added | — | Registered Razorpay payments (`payments` table, `razorpay_order_id`), WhatsApp Cloud API credentials, Cloud cart sync (`cart_items` table), and automated GST invoice generator |
| 2026-10-12 | Part-A Advanced Engineering | Added | — | Registered Hospital Organizations (`organizations`, `organization_members`), offline catalog DB store, inventory tracking (`stock_quantity`, `is_in_stock`, `low_stock_threshold`), and multi-language keys (`USER_LANGUAGE_KEY`) |
| 2026-10-12 | DPDP Privacy Consents (T5.P.9) | Added | — | Registered `consent_records` schema with consent types, affirmative grant flag, client IP/agent audit, and withdrawal tracking |
