# Speqtus Medical Ordering Platform — Signed-Off Business Rules & Architectural Decisions

> **Governed by:** PRD Section 0b, Section 10, and [AGENTS.md](./AGENTS.md)  
> **Status:** Ratified & Approved by Speqtus Medical Stakeholders  
> **Date:** September 2026

This document records all fundamental business decisions, boundary constraints, and architectural invariants agreed upon before writing production code.

---

## 1. Catalog & Price Confidentiality Rules (FR-5, F-21)

1. **Quote-Based / Confidential Pricing:**
   - Surgical instruments are sold B2B to qualified healthcare providers. Prices are strictly confidential and must **never** be exposed publicly to guests or pending accounts.
   - **Enforcement:** Enforced at the **database view / API query layer** via `catalog_products` view with conditional column masking based on `approval_status = 'approved'`. UI hiding alone is rejected as insufficient.
   - **Guest / Pending Doctor Experience:** Variant price cells display a tappable button/label: `"Login to see price"` (routing to auth or pending status screen).
2. **Catalog Hierarchy:**
   - Confirmed 2-level structure: Top-level section / banner category (`parent_category`, e.g. "General Surgery Instruments") and sub-category (`name`, e.g. "Needle Holders & Suturing Instruments").
3. **Article Number (Art No) Invariant:**
   - Every instrument size has a distinct Art No (e.g. `03-27-15`) which acts as the unique business key across doctors, paper catalogs, and order items. Uniqueness is enforced via database constraint `UNIQUE(art_no)`.

---

## 2. Order Lifecycle & State Machine Rules (FR-7, FR-13)

1. **Order Request Submission (Zero Upfront Payment):**
   - In MVP (v1), doctors submit an **Order Request** without paying upfront.
   - When submitted, the initial status is always `'requested'`, and `payment_status` is `'not_applicable'`.
2. **Deterministic State Transitions:**
   - Orders can only move along validated paths:
     - `requested` → `confirmed` (Speqtus owner approves order & confirms pricing)
     - `requested` → `cancelled` (Doctor or owner cancels before confirmation)
     - `confirmed` → `dispatched` (Owner ships package and notes courier details)
     - `confirmed` → `cancelled` (Owner cancels due to supply unavailability)
     - `dispatched` → `delivered` (Courier confirms delivery)
     - `dispatched` → `cancelled` (Return / Delivery failure)
   - Any state jump (e.g. `requested` → `delivered` or backwards transitions) is blocked by a database trigger (`validate_order_status_transition()`).
3. **Price Snapshotting Invariant:**
   - When an order item is created, the unit price is locked in `order_items.unit_price_at_order`.
   - Historical orders are **never** updated or recomputed when catalog prices change.
4. **Audit Trail:**
   - Every status modification automatically generates an immutable row in `order_status_history` capturing `order_id`, `status`, `changed_by`, `changed_at`, and an optional `note`.

---

## 3. User Identity & Account Verification Rules (FR-4, FR-4a, FR-9)

1. **Single-User Account Model for v1:**
   - Per PRD Decision #2, each login represents an individual doctor or clinic purchasing coordinator.
   - Hospital purchase managers (e.g. Ramesh persona) register with their hospital address and name. Multi-user organization accounts with departmental billing are deferred beyond v1.
2. **Phone Number Primary Auth:**
   - Phone number is the required, unique identifier (`users.phone`) due to WhatsApp workflow synergy.
   - Authentication is passwordless via Phone OTP (or Google OAuth secondary fallback).
3. **Mandatory Profile Completion:**
   - Upon first phone authentication, users must provide Full Name, Hospital/Clinic Name, Primary Delivery Address, and agree to Terms & Conditions before catalog interactions.
   - Initial account status is always `'pending'`.
4. **Admin Approval Gate:**
   - Only the Speqtus Owner/Admin can transition an account to `'approved'` or `'rejected'`.
   - Doctors in `'pending'` status can browse the catalog and add items to a draft cart, but cannot submit an order request or view prices.

---

## 4. Operational Boundaries & MVP Non-Goals (PRD Section 8)

1. **No Inventory / Stock Tracking:**
   - Speqtus manufactures and distributes instruments in custom batches. Stock levels are not tracked in the app; all active catalog items can be requested.
2. **No Online Payment Gateway in v1:**
   - Razorpay integration is deferred to Phase 6. Settlements are handled offline via bank transfer or pay-on-delivery.
3. **No In-App Realtime Chat:**
   - Urgent order inquiries route to native WhatsApp or phone call via `Linking.openURL('tel:...')` / `Linking.openURL('https://wa.me/...')`.
4. **Cart Storage:**
   - Client-side storage (Zustand + MMKV / localStorage for web). No server-side abandoned cart tables.
5. **Tax Calculations:**
   - Formal GST splits (CGST/SGST/IGST) are handled by Speqtus's external accounting software; invoices are manually uploaded as PDFs to Cloudflare R2 by Admin.

---

## 5. Catalog Asset Management & Image Refinement (Action Item for Next Iteration)

1. **Structured Data Completeness:**
   - All 1,217 surgical instruments, size variants, Article Numbers (Art Nos), and category hierarchies have been successfully extracted and validated into the master offline database fixture (`assets/catalog/master_catalog.json`) and database seed script (`scripts/catalog_data.json`).
2. **Product Photography / Visual Asset Refinement (Post-Ingestion Action Item):**
   - User review identified that the raw automated bounding-box image crops from the scanned paper catalog PDF (`CatPDF/SPEQTUS SURGICAL INSTRUMENTS.pdf`) require tailored visual cleanup, background removal, and precision instrument cropping to meet final commercial ecommerce presentation standards.
   - **Resolution:** Raw extraction images (`output/catalog/`) are kept out of GitHub. Image refinement, individual transparent WebP asset replacement, and CDN upload are scheduled as a dedicated task for the next iteration before store release.

