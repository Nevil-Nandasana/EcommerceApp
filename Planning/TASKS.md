# Speqtus Medical Ordering Platform — Execution Backlog (TASKS.md)

**Source:** PRD_Speqtus_Ordering_App.md (v1.1)
**Status:** Living Task Board — Update checkboxes as tasks complete
**Format:** Flat, checkbox-style (`- [ ]`), broken into atomic agent-sized chunks

---

## Phase 0: Project Setup, Tooling & Business Sign-off (Week 1)

### 0.1 Repository & Monorepo Tooling (FR-0)
- [x] **T0.1.1** Initialize Git repository with `.gitignore`.
- [x] **T0.1.2** Initialize Expo project using TypeScript template (`expo-router`, strict TypeScript).
- [x] **T0.1.3** Create `.env.example` defining all required environment variables.
- [x] **T0.1.4** Set up basic ESLint and Prettier (local only, no pre-commit hooks).

### 0.2 Accounts & Paperwork (FR-0a)
- [x] **T0.2.1** Create `Planning/ACCOUNTS.md` tracker to track account credentials.
- [x] **T0.2.2** Register and configure Supabase project.
- [x] **T0.2.3** Set up Cloudflare R2 bucket (`speqtus-product-images`).
- [x] **T0.2.4** Submit Apple Developer & Google Play Console enrollment.

### 0.3 Business Rules & Decisions Sign-off (FR-0b)
- [x] **T0.3.1** Create `Planning/DECISIONS.md` documenting signed-off business rules.

---

## Phase 1: Catalog Data Extraction & Preparation (Weeks 2–3)

### 1.1 Catalog Reader Pipeline
- [x] **T1.1.1** Set up Python script to extract images and text from catalog PDF.
- [ ] **T1.2.1** Populate master Google Sheet from parsed data and verify manually.
- [x] **T1.3.1** Crop and upload product photos into Cloudflare R2 bucket.

---

## Phase 2: Database Foundation & Security (Week 4)

### 2.1 Database Schema & Extensions (F-1)
- [x] **T2.1.1** Create Supabase migration enabling extensions: `uuid-ossp`, `pg_trgm`, `unaccent`.
- [x] **T2.1.2** Create migration for `categories` table.
- [x] **T2.1.3** Create migration for `products` table.
- [x] **T2.1.4** Create migration for `product_variants` table.
- [x] **T2.1.5** Create migration for `users` table linked to Supabase `auth.users`.
- [x] **T2.1.6** Create migration for `addresses` table.
- [x] **T2.1.7** Create migration for `orders` and `order_items` tables with snapshot columns.
- [x] **T2.1.8** Create migration for `order_status_history` table.

### 2.2 Row-Level Security (RLS) (F-1, F-21)
- [x] **T2.2.1** Write RLS policies for `categories`, `products`, `product_variants`.
- [x] **T2.2.2** Write database function/view or RLS rule to strictly **strip price columns** from `product_variants` when queried by guests or pending doctors (FR-5).
- [x] **T2.2.3** Write RLS policies for `orders`, `order_items`, and `addresses`.
- [x] **T2.2.4** Write RLS policies for admin role.

### 2.3 Order Status State Machine (FR-13)
- [x] **T2.3.1** Create Postgres trigger function `validate_order_status_transition()` enforcing valid transitions.
- [x] **T2.3.2** Create trigger to auto-append to `order_status_history`.

### 2.4 Catalog Sync Pipeline & Backups (FR-14, F-3)
- [x] **T2.4.1** Implement Supabase Edge Function `sync-catalog` to fetch master Google Sheet data.
- [x] **T2.4.2** Set up Cloudflare R2 upload helper for thumbnail + full-size images.
- [x] **T2.4.3** Set up simple nightly `pg_dump` backup script.

---

## Phase 3: Core Mobile App (Doctor-Facing MVP) (Weeks 5–7)

### 3.1 App Skeleton & Auth (FR-4)
- [x] **T3.1.1** Set up Expo Router directory structure and theme constants.
- [x] **T3.1.2** Configure Supabase client with `Expo SecureStore`.
- [x] **T3.1.3** Build Phone Login screen and OTP Verification screen.
- [x] **T3.1.4** Implement Google OAuth fallback sign-in button.
- [x] **T3.1.5** Build Doctor Profile Completion screen (Name, Hospital, primary address) & T&C checkbox.
- [x] **T3.1.6** Build persistent "Account Pending Approval" banner on the home screen.

### 3.2 Catalog & Product Detail (FR-1, FR-2, FR-5)
- [x] **T3.2.1** Build Category Grid screen (`app/(tabs)/index.tsx`).
- [x] **T3.2.2** Build Subcategory / Product List screen using `@shopify/flash-list`.
- [x] **T3.2.3** Build Product Detail screen with image carousel and description.
- [x] **T3.2.4** Build Variants Table with `+/-` steppers.
- [x] **T3.2.5** Price Visibility Rule: Gate prices behind auth/approval state.

### 3.3 Search & Cart (FR-3, FR-6)
- [x] **T3.3.1** Build persistent Search screen with `pg_trgm` RPC call.
- [x] **T3.3.2** Set up local Zustand cart store with `react-native-mmkv` persistence.
- [x] **T3.3.3** Build Cart screen displaying selected items grouped by category.

### 3.4 Checkout & Orders (FR-7, FR-8)
- [x] **T3.4.1** Build Checkout Review screen (simple address entry/selection, order notes).
- [x] **T3.4.2** Implement "Submit Order Request" atomic transaction.
- [x] **T3.4.3** Build "My Orders" list screen (no complex filters yet).
- [x] **T3.4.4** Build Order Detail screen with snapshot list and status timeline.
- [x] **T3.4.5** Implement simple "Reorder" action (adds current items to cart).
- [x] **T3.4.6** Profile & Settings screen with basic Log Out functionality.

---

## Phase 4: Owner/Admin Tools & Web (Weeks 8–9)

### 4.1 Admin Dashboard & Approvals (FR-9, FR-12)
- [x] **T4.1.1** Implement role-based route guard for `/admin/*`.
- [x] **T4.1.2** Build "Pending Approvals" screen to approve/reject doctors.
- [x] **T4.1.3** Configure Expo Web build and deployment on Cloudflare Pages.

### 4.2 Admin Order & Price Management (FR-10, FR-11)
- [x] **T4.2.1** Build Admin Orders table and Order Detail view.
- [x] **T4.2.2** Implement Inline Price Editor for unpriced line items.
- [x] **T4.2.3** Implement Status Transition Action Bar (Confirm, Dispatch, Mark Delivered, Cancel).
- [x] **T4.2.4** Build Admin Products list with inline price editing.

### 4.3 Push Notifications & Support (FR-15, F-18)
- [x] **T4.3.1** Install and configure `expo-notifications` with FCM/APNs.
- [x] **T4.3.2** Implement Supabase Edge Function to send push alerts on approval/order status changes.
- [x] **T4.3.3** Add "Need Help?" button launching basic phone/WhatsApp `Linking.openURL`.

---

## Phase 5: Fast-follow & Parking Lot

*(Moved from MVP scope to keep the project under 16-hr/wk budget)*

### Fast-Follow Tasks
- [ ] **T5.F.1** Staging Environment & Sentry error tracking setup.
- [x] **T5.F.2** Offline Network Banner & health checks.
- [x] **T5.F.3** Advanced Address Book (My Addresses CRUD screen).
- [x] **T5.F.4** Advanced Catalog Filter & Sort (Specialty chips, In Stock toggle).
- [x] **T5.F.5** Numeric Keypad entry for cart bulk additions.
- [x] **T5.F.6** Order cancellation flow for doctors (in-app cancellation reason picker).
- [x] **T5.F.7** Admin Doctor Directory (searchable table).
- [x] **T5.F.8** Structured Delivery Info (Courier links, tracking numbers).
- [x] **T5.F.9** Saved Sets feature (Save cart as named OT set).
- [x] **T5.F.10** Manual PDF Invoices (Admin upload to R2).
- [x] **T5.F.11** Self-serve Account Deletion flow (App Store requirement).
- [x] **T5.F.12** Status Filter Tabs & Search in Doctor Orders screen.
- [x] **T5.F.13** Reorder Price Transparency & Updated Quote Warning Modal.
- [x] **T5.F.14** Self-serve Doctor Profile & Hospital Details Editor.
- [x] **T5.F.15** Local Catalog Delta Caching & Fingerprint Check.

### Parking Lot (Out of Scope for now)
- [ ] **T5.P.1** Inventory tracking & Out-of-stock logic.
- [ ] **T5.P.2** Tax & Pricing rules (CGST/SGST/IGST).
- [x] **T5.P.3** Admin Order Export (CSV/Excel).
- [ ] **T5.P.4** Advanced 3-channel Notification Matrix (WhatsApp APIs).
- [ ] **T5.P.5** Offline Catalog Browsing via SQLite.
- [ ] **T5.P.6** Online Payments (Razorpay) & Payment Reconciliation/Refunds.
- [ ] **T5.P.7** Localization & i18next string externalization.
- [ ] **T5.P.8** CI/CD pipelines & pre-commit hooks.
- [ ] **T5.P.9** Formal Privacy Consents table management.
- [ ] **T5.P.10** Server-side cart persistence.

---

## Phase 6 & 7: QA, Stores & Launch
- [ ] **T6.1** Basic Accessibility review (tap targets, labels).
- [x] **T6.2** Generate store assets and TestFlight builds.
- [x] **T7.1** Operations runbooks, handover docs, and onboarding.
