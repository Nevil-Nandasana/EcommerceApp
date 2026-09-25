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
  'failed'
);
```

### 2.5 `payment_method`
```sql
CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'pay_on_delivery'
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

---

## 5. Client State Identifiers (React Native / Expo)

| State / Prop Variable | Store / Context | Type | Description |
| :--- | :--- | :--- | :--- |
| `cartItems` | `CartStore` | `CartItem[]` | Array of items currently in cart |
| `activeCategoryId` | `CatalogContext` | `string \| null` | Currently selected surgical category ID |
| `searchQuery` | `CatalogContext` | `string` | Search query for Art No or instrument name |
| `currentUser` | `AuthContext` | `UserProfile \| null` | Logged-in doctor or admin profile |

---

## 6. Changelog & Identifier Evolution

| Date | Identifier | Action | Replacement | Reason / Notes |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-24 | Initial Registry | Created | — | Initialized from PRD Section 3 and AGENTS.md rules |
