# Product Requirements Document — Speqtus Medical Ordering Platform

**Document status:** v1.1 — Triaged MVP (strictly scoped to 16-hr/wk capacity)
**Owner:** Nevil
**Client:** Speqtus Medical (surgical instrument manufacturer/distributor)
**Last updated:** 22 Sep 2026

---

## 0. How to use this document (read this first, agent)

This PRD is written to be consumed by an autonomous coding agent working in phases. Each functional requirement (FR) has an explicit **acceptance criteria** list — treat those as the test cases that define "done." Do not implement features marked **Out of scope** or **Phase 2+** in an MVP build unless explicitly instructed. Where a decision is left open, a `DECISION NEEDED` tag marks it — stop and surface it rather than guessing silently. Where the spec is intentionally strict (data types, validation rules, status enums), do not deviate even if a simpler implementation seems obvious — the strictness is deliberate (data integrity for medical procurement).

Suggested execution order matches Section 9 (Build Phases). Within a phase, satisfy data-layer requirements before UI requirements that depend on them.

---

## 1. Overview

### 1.1 Problem statement
Speqtus Medical sells surgical instruments (scalpel handles through ENT instruments — 24 catalog categories, ~24-104 pages of product listings) to doctors, clinics, and hospitals across India, currently via phone/WhatsApp/in-person orders against a printed PDF catalog. Doctors and OT (operating theatre) staff are extremely time-constrained and will not tolerate friction; today's process depends entirely on a human picking up the phone. There is no self-service ordering, no order history, no reorder shortcut, and no structured product data.

### 1.2 Product vision
A mobile-first ordering platform (Android app, iOS app, responsive website — one shared codebase) that lets verified medical professionals browse Speqtus's catalog, reorder in a few taps, and track order status, while giving the Speqtus owner a simple back office to approve accounts, set prices, and manage order fulfillment. The product must be sticky enough that a busy doctor prefers it to calling their usual supplier.

### 1.3 Primary goal metric
Reorder rate: % of orders placed via "reorder" or "saved set" vs. built from scratch. This is the leading indicator of habit formation and should be tracked from Phase 5 (pilot) onward.

### 1.4 Target scale
- Launch: ~40 registered users (doctors / clinic purchasing staff), pilot cohort of 12+.
- Near-term target: ~100 daily active users.
- Architecture must not need re-platforming below 1,000 total users / 10,000 orders. It does not need to be designed for scale beyond that in this version.

### 1.5 Non-goals for v1
- Not a public consumer marketplace — no anonymous browsing-to-checkout for the general public (prices are hidden until account approval; see FR-5).
- Not a multi-vendor marketplace — single seller (Speqtus) only.
- Not an inventory/warehouse management system — stock levels are not tracked in v1 (see Section 8, Out of Scope).

---

## 2. Users and roles

### 2.1 Roles
| Role | Description | Access |
|---|---|---|
| **Guest** | Unauthenticated visitor | Can view catalog (names, images, categories, Art Nos, sizes) but **never** prices. Cannot add to cart or checkout. |
| **Doctor (pending)** | Signed up, awaiting owner approval | Can browse and search like a guest, can build a cart, but cannot submit an order request. Sees a clear "pending approval" banner. |
| **Doctor (approved)** | Verified account | Full access: sees prices, can submit order requests, view order history, reorder, save sets, manage own profile/addresses. |
| **Owner/Admin** | Speqtus staff | All doctor permissions plus: approve/reject doctor accounts, set/edit prices per product-size, manage order statuses, view all orders across all doctors, upload invoices, edit catalog data (or trigger a re-sync from the source spreadsheet). |

A single admin role is sufficient for v1. Multiple admin sub-roles (e.g., "packer" vs. "approver") are out of scope.

### 2.2 Primary persona
**Dr. Patel, general surgeon, tier-2 city clinic.** Orders instruments every 4-8 weeks, usually the same 15-20 items ("my minor OT set"). Has 30 seconds between patients, not 5 minutes. Uses WhatsApp constantly, uses apps rarely beyond WhatsApp/Google Maps/banking. Will abandon any flow that takes more than ~3 taps to reorder.

### 2.3 Secondary persona
**Ramesh, purchase coordinator at a mid-size hospital.** Orders on behalf of multiple department heads. Needs to reference doctor/department names on an order, and needs downloadable invoices for hospital accounts. May place larger, less frequent orders across many categories.

---

## 3. Information architecture / data model

Implement as a relational schema (Postgres via Supabase). This section is authoritative — the agent should generate migrations matching these entities and fields exactly, adding only technical columns (created_at, updated_at, id, soft-delete flags) as needed.

### 3.1 `categories`
- `id` (uuid, pk)
- `name` (text, e.g. "Needle Holders & Suturing Instruments")
- `parent_category` (text, one of the 24 top-level catalog sections, e.g. "General Surgery Instruments" — note the catalog has a two-level structure: top banner category + sub-category, confirm against source data)
- `sort_order` (int)
- `slug` (text, unique)

### 3.2 `products`
A "product" is a named instrument (e.g. "Bozemann Knot Tier"); it has one or more `product_variants` for size/Art No combinations.
- `id` (uuid, pk)
- `category_id` (fk → categories)
- `name` (text) — e.g. "Bozemann Knot Tier"
- `description` (text, nullable) — most catalog entries have no free-text description; leave nullable
- `image_url` (text) — primary image, Cloudflare R2 URL
- `additional_images` (text[], nullable)
- `search_tags` (text[]) — specialty tags: Ortho, ENT, Gynae, Cardiac, Neuro, General, Urology, Rectal, Vascular, ElectroSurgery, Diagnostic, Sterilizing (derive from category at minimum; allow manual override)
- `is_active` (bool, default true) — soft-hide without deleting
- `source_row_ref` (text, nullable) — traceability back to the master Google Sheet row, for debugging sync issues

### 3.3 `product_variants`
Represents one orderable SKU: a specific size of a specific product.
- `id` (uuid, pk)
- `product_id` (fk → products)
- `art_no` (text, e.g. "03-27-15") — **unique**, this is the business key doctors and staff will reference verbally/on paper; validate uniqueness on sync
- `size_label` (text, e.g. "15.5 CM – 6\"")
- `size_cm` (numeric, nullable) — parsed numeric value where possible, for sorting/filtering
- `price` (numeric, nullable) — **null until admin sets it**; drives price-visibility logic (FR-5)
- `currency` (text, default "INR")
- `is_active` (bool, default true)

### 3.4 `users`
- `id` (uuid, pk, = Supabase auth user id)
- `role` (enum: `guest` is implicit/unauthenticated, not stored; stored values are `doctor`, `admin`)
- `full_name` (text)
- `phone` (text, unique, required — primary contact channel given WhatsApp strategy)
- `email` (text, nullable)
- `hospital_or_clinic_name` (text)
- `medical_registration_number` (text, nullable) — for credibility/verification, not hard-validated against a registry in v1
- `specialty` (text, nullable) — used to pre-filter/recommend catalog sections
- `approval_status` (enum: `pending`, `approved`, `rejected`)
- `approved_by` (fk → users, nullable)
- `approved_at` (timestamptz, nullable)
- `created_at`

### 3.5 `addresses`
- `id` (uuid, pk)
- `user_id` (fk → users)
- `label` (text, e.g. "Clinic", "Home")
- `line1`, `line2`, `city`, `state`, `pincode`, `phone_override` (text fields)
- `is_default` (bool)

### 3.6 `saved_sets` (Phase 6 feature, schema included now so Phase 3 order logic doesn't need rework later)
- `id` (uuid, pk)
- `user_id` (fk → users)
- `name` (text, e.g. "My Minor OT Set")
- `created_at`

### 3.7 `saved_set_items`
- `id` (uuid, pk)
- `saved_set_id` (fk → saved_sets)
- `product_variant_id` (fk → product_variants)
- `quantity` (int, default 1)

### 3.8 `orders`
- `id` (uuid, pk)
- `order_number` (text, human-readable, e.g. `SPQ-2026-0001`, sequential per year)
- `user_id` (fk → users)
- `status` (enum: `requested`, `confirmed`, `dispatched`, `delivered`, `cancelled` — see FR-13 for transition rules)
- `address_id` (fk → addresses)
- `notes` (text, nullable) — free text from doctor, e.g. "need by Friday"
- `subtotal` (numeric, nullable — populated once admin prices the order if not all variants were pre-priced)
- `payment_status` (enum: `not_applicable`, `pending`, `paid`, `failed` — `not_applicable` for v1 orders before payments ship in Phase 6)
- `payment_method` (enum: `bank_transfer`, `pay_on_delivery`, nullable until chosen)
- `invoice_url` (text, nullable)
- `created_at`, `updated_at`

### 3.9 `order_items`
- `id` (uuid, pk)
- `order_id` (fk → orders)
- `product_variant_id` (fk → product_variants)
- `quantity` (int, min 1)
- `unit_price_at_order` (numeric, nullable) — snapshot the price at order time; **never** recompute historical orders if catalog prices change later

### 3.10 `order_status_history` (audit trail)
- `id` (uuid, pk)
- `order_id` (fk → orders)
- `status` (enum, same as orders.status)
- `changed_by` (fk → users)
- `changed_at` (timestamptz)
- `note` (text, nullable)

### 3.11 Row-level security (critical — implement before any client code touches the DB)
- A `doctor` may `SELECT`/`INSERT` only rows in `orders`, `order_items`, `addresses`, `saved_sets`, `saved_set_items` where `user_id = auth.uid()`.
- A `doctor` may never `UPDATE` `orders.status` or `order_items.unit_price_at_order`.
- A `doctor` may `SELECT` `products`/`product_variants`/`categories` freely, but the client must not expose `price` fields to non-approved accounts (see FR-5 — enforce this at the query/API layer, not just the UI layer, since a technical user could otherwise read prices directly).
- Only `admin` may `UPDATE` `users.approval_status`, `product_variants.price`, `orders.status`.

---

## 4. Functional requirements

Each FR below includes: description, acceptance criteria, dependencies, and phase.

### FR-1: Catalog browse by category
**Description:** Users can view the 24 top-level categories, drill into sub-categories, and see a scrollable grid/list of products with thumbnail, name, and available sizes.
**Acceptance criteria:**
- Home screen lists all active top-level categories with an icon/image.
- Tapping a category shows its sub-categories or products (if no sub-category level).
- Product list shows image, name, and a size-count badge (e.g. "3 sizes").
- List is paginated or virtualized (do not render all products in one unbounded list — target >60fps scroll on a mid-range Android device).
**Dependencies:** Catalog data synced into `products`/`product_variants`/`categories` (Phase 2).
**Phase:** 3 (MVP)

### FR-2: Product detail view
**Description:** Tapping a product shows full detail: all images, name, description (if any), and a table of size/Art No/price rows, each with an add-to-cart quantity stepper.
**Acceptance criteria:**
- Art No is always visible and copyable (long-press to copy) — doctors/staff frequently reference Art Nos verbally or in writing.
- Price cell shows the actual price for approved doctors, and shows "Login to see price" (tappable, routes to auth) for guests/pending doctors.
- Each size row has an independent quantity stepper and its own add-to-cart action.
**Dependencies:** FR-1, FR-5.
**Phase:** 3 (MVP)

### FR-3: Search
**Description:** A persistent search bar (accessible from every screen via bottom nav) that matches product name, Art No, and category, tolerant of typos and partial Art No entry.
**Acceptance criteria:**
- Typing "03-27" returns all variants whose Art No contains that substring.
- Typing "suture" returns all products whose name or category matches, including partial/fuzzy matches (e.g. "sutur" or a one-character typo still returns "suture" results).
- Results appear within 300ms for a catalog of up to ~2,000 variants (implement via Postgres trigram/full-text index — see Section 6.3).
- Empty state shows a friendly message, not a blank screen.
**Dependencies:** FR-1.
**Phase:** 3 (MVP)

### FR-4: Auth — sign up and login
**Description:** Users authenticate via phone number + OTP (primary) or Google sign-in (secondary). No password-based auth in v1.
**Acceptance criteria:**
- New user enters phone number, receives OTP, verifies, then is prompted to complete profile (FR-4a) before any other action.
- Returning user with a verified session skips straight to home.
- Session persists across app restarts (secure token storage — Expo SecureStore, not AsyncStorage, for tokens).
- Logout is available from a profile/settings screen and clears local session and any offline-cached data with prices.
**Dependencies:** None (foundational).
**Phase:** 3 (MVP)

### FR-4a: Profile completion
**Description:** After first login, collect: full name, hospital/clinic name, medical registration number (optional), specialty (optional, dropdown), and at least one delivery address.
**Acceptance criteria:**
- Form cannot be skipped — user cannot reach the catalog with an incomplete profile (name, hospital name, and one address are mandatory; registration number and specialty are optional).
- On submit, `users.approval_status` is set to `pending` and the admin is notified (FR-9).
- User sees a persistent "Your account is pending approval — you can browse now, ordering unlocks once approved" banner until `approval_status = approved`.
**Dependencies:** FR-4.
**Phase:** 3 (MVP)

### FR-5: Price visibility gating
**Description:** Prices are never shown to guests or pending doctors. This is a trust/business-model requirement (quote-based B2B), not cosmetic.
**Acceptance criteria:**
- Server-side: any API/query response to a non-approved user must have `price` stripped from `product_variants`, not merely hidden by the client.
- Client-side: price fields render as "—" or a lock icon with "Login to see price" / "Approval pending" copy depending on state.
- Once `approval_status` flips to `approved` (by admin), prices become visible without requiring app reinstall — a background refresh or next app-open is sufficient; a push notification (FR-9) should also fire.
**Dependencies:** FR-4a, database RLS (Section 3.11).
**Phase:** 3 (MVP)

### FR-6: Cart
**Description:** A persistent cart (survives app close) holding selected variants and quantities across categories.
**Acceptance criteria:**
- Cart icon in nav shows item count badge.
- Cart screen lists items grouped by category, each with quantity edit and remove.
- Cart total is shown only if every item in the cart has a non-null price (otherwise show "Price to be confirmed").
- Cart persists locally (so a network drop doesn't lose it) and syncs to the server once the user is authenticated.
**Dependencies:** FR-2.
**Phase:** 3 (MVP)

### FR-7: Order request submission
**Description:** Approved doctors submit their cart as an order request. **v1 does not process payment at submission** — the order is a request that the admin confirms and prices/finalizes (payments arrive in Phase 6, FR-16).
**Acceptance criteria:**
- Checkout screen requires: delivery address (select existing or add new), optional notes field.
- On submit: creates one `orders` row with `status = requested`, one `order_items` row per cart line, snapshots `unit_price_at_order` from the current `product_variants.price` at the moment of submission.
- Cart is cleared on successful submission.
- User sees an order confirmation screen with the human-readable `order_number`.
- Only `approved` doctors can reach checkout; pending doctors attempting checkout are redirected to the pending-approval screen.
**Dependencies:** FR-5, FR-6.
**Phase:** 3 (MVP)

### FR-8: Order history and status tracking
**Description:** Doctors can view all their past and current orders with status.
**Acceptance criteria:**
- List view: order number, date, item count, status badge, total (if priced).
- Detail view: full item list, address used, status history timeline (from `order_status_history`), and a downloadable invoice link once one exists (Phase 6).
- Statuses render with distinct colors/icons: Requested (gray), Confirmed (blue), Dispatched (orange), Delivered (green), Cancelled (red).
**Dependencies:** FR-7.
**Phase:** 3 (MVP)

### FR-9: Admin — approval queue and notifications
**Description:** Admin sees a list of pending doctor accounts and can approve/reject with one tap; gets notified of new signups and new orders.
**Acceptance criteria:**
- Admin dashboard has a "Pending approvals" list showing name, hospital, phone, registration number, submitted date.
- Approve action sets `approval_status = approved`, `approved_by`, `approved_at`, and triggers a push notification + (Phase 6) WhatsApp message to the doctor.
- Reject action requires no reason in v1 (optional free-text note) and sets `approval_status = rejected`; rejected users see a message and a "contact us" link (phone number) rather than a dead end.
- New order and new signup each trigger an email to the admin's registered address (simplest reliable channel for an owner who may not always have the app open) in addition to any in-app badge.
**Dependencies:** FR-4a, FR-7.
**Phase:** 4

### FR-10: Admin — order management
**Description:** Admin views all orders across all doctors, updates status, and (if not already priced) sets prices per line item before confirming.
**Acceptance criteria:**
- Order list is filterable by status and searchable by doctor name/order number.
- Order detail lets admin edit `unit_price_at_order` per line (only while status is `requested`, i.e., before confirmation — once `confirmed`, prices lock to preserve an audit trail; changes after that require a `cancelled` + new order, not silent editing).
- Status transition buttons enforce a valid forward path: `requested → confirmed → dispatched → delivered`, with `cancelled` reachable from `requested` or `confirmed` only (see FR-13 for the full state machine).
- Every status change writes an `order_status_history` row and fires a push notification to the doctor.
**Dependencies:** FR-8, FR-9.
**Phase:** 4

### FR-11: Admin — product/price management
**Description:** Admin sets and edits per-variant prices; catalog content itself is edited via the source Google Sheet + sync job (FR-14), not a full in-app CMS, to keep the agent's build scope realistic.
**Acceptance criteria:**
- Admin can search/filter products and edit `price` per variant inline.
- Admin can toggle `is_active` on a product or variant (hides it from doctor-facing catalog without deleting data/history).
- Changes take effect for new cart additions immediately; already-submitted orders are unaffected (per the price-snapshot rule in FR-7).
**Dependencies:** FR-1, catalog sync (Phase 2).
**Phase:** 4

### FR-12: Website (responsive web build)
**Description:** The same catalog/order/admin experience, accessible via browser, built from the same Expo codebase (Expo for web) rather than a separate implementation.
**Acceptance criteria:**
- All doctor-facing FRs (1-8) work in a modern desktop and mobile browser.
- Admin FRs (9-11) work on desktop browser (admin is expected to use web primarily).
- No feature is web-exclusive or app-exclusive in v1 except push notifications (web push is out of scope — email is the web fallback channel for admin, and doctors on web rely on in-app status changes visible on next visit).
**Dependencies:** FR-1 through FR-11 built with cross-platform components.
**Phase:** 4

### FR-13: Order status state machine
**Description:** Formal definition, since ambiguity here causes real-world fulfillment errors.
```
requested → confirmed → dispatched → delivered
requested → cancelled
confirmed → cancelled
```
No other transitions are valid (e.g. `dispatched` cannot go back to `confirmed`; `delivered` and `cancelled` are terminal). The agent must implement this as a guarded transition function, not just a free-text status field, and reject/ignore invalid transition attempts server-side.
**Phase:** 4 (enforced from FR-10 onward)

### FR-14: Catalog data sync pipeline
**Description:** A scheduled job that reads the master Google Sheet (maintained by Speqtus staff) and syncs it one-way into `categories`/`products`/`product_variants`. See Section 6.2 for the extraction approach for the initial data load from the PDF.
**Acceptance criteria:**
- Sync runs on a schedule (e.g. nightly) and can also be triggered manually by admin.
- Sync is idempotent: re-running with unchanged sheet data produces no duplicate rows (match on `art_no` as the natural key for variants).
- Sync never touches `price` (prices are admin-set in-app per FR-11 and must survive catalog content updates) or `is_active` flags set manually by admin — those are app-owned fields, not sheet-owned.
- Sync logs errors (e.g. duplicate Art No, missing required field) to a visible admin log rather than failing silently.
**Dependencies:** Master Sheet structure finalized (Phase 1).
**Phase:** 2

### FR-15: Push notifications (order status + approval)
**Description:** Doctors get a push notification when: their account is approved, and when any of their orders changes status.
**Acceptance criteria:**
- Uses Expo push notifications (backed by FCM for Android, APNs for iOS).
- Tapping a notification deep-links to the relevant order detail or the home screen (for approval).
- Notification permission is requested contextually (after profile completion, with an explanation), not immediately on app open.
**Dependencies:** FR-9, FR-10.
**Phase:** 4

---

## 5. Phase 2+ requirements (post-MVP, specified now to avoid rework)

These should NOT be built during the MVP phases but the schema/architecture above already accounts for them — flag any MVP decision that would block these later.

### FR-16: Saved sets ("my minor OT set") (Fast-follow)
Doctor can save the current cart as a named set (`saved_sets`/`saved_set_items`), and later add an entire saved set to the cart in one tap from a "My Sets" screen. Editing a saved set (add/remove/change quantity) must not affect past orders (no shared references to order data).

### FR-20: Invoices (Fast-follow)
Admin uploads a PDF invoice per order (manual for v1 — auto-generation needs Speqtus's GST/accounting format and is explicitly deferred). Doctor can view/download from order detail (FR-8).

---

## 6. Technical architecture

### 6.1 Stack (all free-tier at launch scale; each layer is swappable if a tier is outgrown)
| Layer | Choice | Why |
|---|---|---|
| Client (Android, iOS, Web) | Expo (React Native + TypeScript), Expo Router | One codebase, three targets |
| Backend/DB | Supabase (Postgres, Auth, Row-Level Security, Realtime) | Free tier covers launch scale; plain Postgres avoids lock-in |
| Image/file storage | Cloudflare R2 | Zero egress fees, avoids Supabase's free egress cap being consumed by product images |
| Web hosting | Cloudflare Pages | Unlimited bandwidth on free tier, commercial use allowed |
| Search | Postgres full-text + `pg_trgm` (trigram) extension | No separate search service needed at this scale |
| Push notifications | Expo Notifications (FCM/APNs) | Free |
| Push notifications | Expo Notifications (FCM/APNs) | Free |
| Backend automation (sync, backups) | Supabase Edge Functions or a scheduled GitHub Action | Free tier sufficient |

### 6.2 Initial catalog data extraction (one-time, Phase 1)
Source is a 105-page PDF where each product page is a single flattened image (not vector/text layer for individual products). Process:
1. Rasterize each page to an image.
2. Detect product "blocks" delimited by the blue/red title banners visible in the layout (computer vision, e.g. OpenCV contour/color-band detection).
3. Crop each block's product photo.
4. OCR (Tesseract, or a vision-capable LLM call) the block's name, size(s), and Art No(s).
5. Write extracted rows into the master Google Sheet for human review (do not auto-publish uncorrected OCR output to the live catalog).
6. Human review pass corrects OCR errors before the Sheet is marked ready for first sync (FR-14).

**Strong preference:** if Speqtus can supply the original source file (CorelDRAW, per PDF metadata) or a raw product-photo folder plus a price/spec spreadsheet, skip steps 1-4 entirely and go straight to structuring that data into the master Sheet. The agent should not assume the OCR path is necessary without first confirming source files aren't available.

### 6.3 Search implementation notes
- Enable Postgres `pg_trgm` extension; add a GIN trigram index on `products.name` and `product_variants.art_no`.
- Query pattern: `ILIKE '%term%'` combined with `similarity()` ranking for typo tolerance, or Postgres full-text (`tsvector`/`tsquery`) for name search combined with trigram for Art No partial-match (Art Nos are structured codes, not prose, so full-text tokenization is less useful there than substring/trigram matching).

### 6.4 Image handling
- On upload/sync, generate at minimum two sizes per image: thumbnail (~200px, for list views) and full (~800px, for detail view). Store both in R2, reference both URLs (or a base URL + suffix convention) in `products`.
- Serve via Cloudflare's CDN in front of R2, not directly from R2 origin, for caching.

### 6.5 Environments
Maintain at minimum two environments: `staging` (a separate Supabase project + separate R2 bucket) and `production`. Never point a staging app build at the production database. Seed staging with a small synthetic subset of catalog data for development so the full 105-page extraction isn't a blocker for early UI work.

### 6.6 Secrets and configuration
All API keys (Supabase, Cloudflare, Razorpay, WhatsApp, Expo push) must be loaded from environment variables / Expo's secure config, never hardcoded or committed to the repository. The agent should scaffold a `.env.example` file listing required variables without values.

---

## 7. Non-functional requirements

| Category | Requirement |
|---|---|
| **Performance** | Product list scroll ≥60fps on a mid-range Android device (e.g. 4GB RAM). Search results return within 300ms server-side for up to ~2,000 variants. App cold start under 3 seconds on a mid-range device. |
| **Reliability** | Nightly automated database backup (to Cloudflare R2 or Google Drive). Order submission must be atomic — a network failure mid-submit must not create a partial order (items without a parent order row, or vice versa); wrap in a database transaction. |
| **Security** | Row-Level Security enforced at the database layer for all user-scoped tables (Section 3.11) — never rely on client-side filtering alone. Auth tokens stored in secure device storage, not plain AsyncStorage. Admin routes/screens must verify `role = admin` server-side on every request, not just hide the UI. |
| **Privacy** | Doctor phone numbers, registration numbers, and order history are visible only to that doctor and admins — never exposed in any public/guest-facing query. |
| **Accessibility** | Minimum tappable target size 44x44pt. Sufficient color contrast on status badges (do not rely on color alone — pair with text/icon, relevant for colorblind users). |
| **Localization** | English only for v1. Architect text as externalized strings (not hardcoded inline) so Hindi/regional language support is a future addition, not a rewrite. |
| **Offline resilience (MVP)** | The MVP does not require full offline mode (that's FR-17, Phase 2+), but the app must fail gracefully (clear error message, retry option) on any network call rather than crashing or showing a blank screen. |
| **Data integrity** | `product_variants.art_no` is unique and immutable once set (do not allow the sync job to silently reassign an Art No to a different product). |

---

## 8. Out of scope for this entire project (v1 through Phase 8)

Explicitly excluded — do not build, and flag to the human if a task seems to require one of these:
- **Inventory/stock-level tracking or "out of stock" logic** (F-15).
- **Tax engines and complex pricing rules** (e.g. CGST/SGST/IGST breakdown) (F-23).
- **Online payments (Razorpay), payment reconciliation, and refunds** (F-17).
- **Multi-channel notification matrices** (Push + admin email is sufficient; WhatsApp Business API is out).
- **CSV/Excel order exports for admin** (F-25).
- **Offline catalog browsing and caching** (FR-17).
- **Localization/multi-language infrastructure** (English only, no `i18next`).
- **CI/CD pipelines and pre-commit hook ceremonies** (local lint/type-check only).
- **Formal privacy/consents tables** (a simple checkbox at signup suffices).
- **Server-side cart storage** (use local MMKV/Zustand only for v1).
- Multi-currency support (INR only).
- Multi-vendor/marketplace features.
- In-app chat/messaging between doctor and admin (phone call and WhatsApp share link cover this).
- Automated GST-compliant invoice generation (manual PDF upload only, per FR-20).
- A native in-app CMS for catalog editing (Google Sheet + sync job, per FR-14, is the intended workflow).
- Multi-admin roles/permissions tiers.
- Analytics dashboards beyond basic order/approval counts.
- Any AI-recommendation or "customers also bought" feature.
- Web push notifications.

---

## 9. Build phases (maps to the project timeline; each phase is a candidate agent task boundary)

1. **Phase 0 — Prepare:** No code. Business rules, accounts, source files.
2. **Phase 1 — Catalog data:** Section 6.2 extraction pipeline + human review → master Google Sheet finalized.
3. **Phase 2 — Foundation:** Database schema (Section 3) + RLS (3.11) + sync pipeline (FR-14) + image pipeline (6.4) + backups.
4. **Phase 3 — Core app (MVP doctor-facing):** FR-1, FR-2, FR-3, FR-4, FR-4a, FR-5, FR-6, FR-7, FR-8 (trimmed versions).
5. **Phase 4 — Admin + website:** FR-9, FR-10, FR-11, FR-12, FR-13, FR-15 (trimmed versions).
6. **Phase 5 — Pilot & Fast-follows:** Bug fixes against Phase 3/4 scope, real-user feedback. Add Fast-follow features (Saved Sets, Invoices, Account Deletion).
7. **Phase 6 — iOS + store release:** Platform-specific QA and store compliance.
8. **Phase 7 — Launch:** Onboarding, monitoring.

An agent picking up this PRD mid-project should identify which phase's FRs are already satisfied (check the database schema and existing screens) before starting new work, rather than assuming a clean slate.

---

## 10. Open questions / DECISION NEEDED

1. **DECISION NEEDED:** Confirm the catalog's two-level category structure (top banner category, e.g. "General Surgery Instruments," vs. sub-category, e.g. "Needle Holders & Suturing Instruments") against the actual source data — the 24 categories in the index may not map 1:1 to top-level banners; verify before finalizing `categories.parent_category`.
2. **DECISION NEEDED:** Should purchase-coordinator accounts (Section 2.3, Ramesh persona) be able to order on behalf of multiple named doctors within one hospital account, or is one login per individual sufficient for v1? Current schema (Section 3.4) assumes one login per individual. If multi-user hospital accounts are needed, this requires an `organizations` table and is a schema change — surface this to the human before building Phase 3 auth if it's likely to be needed soon.
3. **DECISION NEEDED (FR-19):** Confirm whether payment should be collectable at order-request time or only after admin confirms/prices the order (current default: after confirmation).
4. **Open:** Exact wording/design of push notification and WhatsApp template copy — draft with the human before Phase 4/6 implementation, since WhatsApp template approval by Meta takes time and rework costs days, not hours.

---

## 11. Glossary

- **Art No:** Article number — Speqtus's unique code per product size (e.g. `03-27-15`), used as the business key for ordering.
- **Variant:** A specific size of a product; the actual orderable unit.
- **RLS (Row-Level Security):** A Postgres feature enforcing per-row access rules at the database layer, independent of client code.
- **OTP:** One-time password sent via SMS for phone-based login.
- **Saved set:** A doctor-named, reusable list of product variants + quantities (e.g. "minor OT set") for fast reordering.
