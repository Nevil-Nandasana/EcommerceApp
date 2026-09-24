# Speqtus Medical Ordering Platform — Feature Registry

**Source:** PRD_Speqtus_Ordering_App.md (v1.1)
**Status:** Triaged MVP (strictly scoped to 16-hr/wk capacity)
**Last updated:** 22 Sep 2026

---

## Legend

| Column | Meaning |
|--------|---------|
| **Feat ID** | Stable identifier (FR-# from PRD, F-# for foundation/additions) |
| **Name** | Short human-readable name |
| **Description** | What the feature does, user-visible outcome |
| **Implementation Approach** | Key technical decisions, stack, patterns |
| **Depends On** | Feat IDs that must be *completed* before this can start |
| **Priority** | `P0` = blocks launch / legal / data integrity • `P1` = core MVP • `P2` = differentiator / retention |

> **Rule:** A feature may only be started when *all* its dependencies are **done** (not just "in progress"). This prevents cascade breakage.

---

## Feature Table: Launch (MVP)

| Feat ID | Name | Description | Implementation Approach | Depends On | Priority |
|---------|------|-------------|-------------------------|------------|----------|
| **FR-0** | **Project Bootstrap** | Repo, linting, type-checking, Expo project init. *(Trimmed: no CI/CD pipeline, no pre-commit hooks).* | Monorepo, TypeScript strict mode | — | P0 |
| **FR-0a** | **Accounts & Paperwork** | GitHub, Supabase, Cloudflare, Expo, Google Cloud, Apple Developer | Manual setup; secrets in env vars | FR-0 | P0 |
| **FR-0b** | **Business Rules Sign-off** | One-page `DECISIONS.md` | Workshop with owner | FR-0a | P0 |
| **F-1** | **Database Schema & RLS** | Core tables (categories, products, product_variants, users, addresses, orders, order_items, order_status_history). *(Trimmed: no cart, tax_rules, payments tables).* | Supabase SQL migrations, `pg_trgm` | FR-0 | P0 |
| **FR-13** | **Order Status State Machine** | Enforced transitions: requested→confirmed→dispatched→delivered; requested→cancelled; confirmed→cancelled. | Postgres migration; DB-level checks | F-1 | P0 |
| **FR-14** | **Catalog Data Sync Pipeline** | Nightly + manual trigger; reads Google Sheet → upserts catalog. | Supabase Edge Function (cron) | FR-0, F-1 | P1 |
| **F-2** | **Image Pipeline & CDN** | Generate thumbnail + full; store in R2; serve via CDN. | R2 bucket + Cloudflare CDN | FR-0, FR-14 | P1 |
| **F-3** | **Nightly Database Backup** | Simple cron `pg_dump` to R2. *(Trimmed: skip quarterly restore test).* | GitHub Action cron | F-1 | P0 |
| **F-21** | **Security Controls** | RLS + server-side auth checks + secrets management. *(Trimmed: no rate-limiting, audit logs).* | Supabase RLS | F-1 | P0 |
| **F-20** | **Privacy & Consent** | Simple T&C/privacy checkbox at signup. *(Trimmed: no formal consents table).* | Checkbox on signup | FR-0a | P0 |
| **FR-4** | **Auth (OTP + Google)** | Phone + OTP, Google OAuth. | Supabase Auth | FR-0 | P1 |
| **FR-4a** | **Profile Completion** | Mandatory: name, hospital, address. Sets `approval_status=pending`. | Form validation | FR-4 | P1 |
| **F-11** | **Address Management** | Add/select an address at checkout. *(Trimmed: polished address-book is Fast-follow).* | Simple form at checkout | FR-4a | P1 |
| **FR-5** | **Price Visibility Gating** | Prices hidden from guests & pending doctors; server-side strip. | RLS policy + API wrapper | FR-4a, FR-14 | P0 |
| **FR-1** | **Catalog Browse** | Top-level categories → sub-categories → product grid. *(Trimmed: no filter chips, no availability badges).* | Expo Router + FlashList | FR-14 | P1 |
| **FR-2** | **Product Detail View** | Image carousel, description, size table. *(Trimmed: standard +/- stepper only, no numeric keypad).* | FlatList for variants | FR-1, FR-5 | P1 |
| **FR-3** | **Search** | Persistent search bar; matches name, Art No, category. | Postgres `pg_trgm` | FR-1 | P1 |
| **FR-6** | **Cart** | Add/remove/qty stepper. *(Trimmed: no "Clear Cart" button, no availability badges). Local MMKV only.* | Zustand + `mmkv` | FR-2 | P1 |
| **F-12** | **Checkout Review** | Final review before submission. *(Trimmed: no tax breakdown, no idempotency key hardening).* | Simple submit | FR-5, FR-6 | P1 |
| **FR-7** | **Order Request Submission** | Approved doctors only; creates `orders` + `order_items` with price snapshot. | DB transaction | F-12 | P1 |
| **FR-8** | **Order History & Status** | List view and Detail view. *(Trimmed: no cancel button, no track-shipment link, no status filter tabs).* | TanStack Query | FR-7 | P1 |
| **F-14** | **Reorder** | Simple: re-add same items at current prices. *(Trimmed: no price diff modal).* | Adds to cart | FR-8 | P1 |
| **FR-9** | **Admin Approval Queue** | Pending doctors list; approve/reject; email notifications. | Admin-only route | FR-4a, FR-7 | P1 |
| **FR-10** | **Admin Order Management** | Filterable order list; edit line prices; guarded status transitions. | Web dashboard | FR-8, FR-9 | P1 |
| **FR-11** | **Admin Product/Price Management** | Search/filter products; inline price edit per variant. | TanStack Table | FR-1 | P1 |
| **FR-12** | **Responsive Website** | Same codebase → web build on Cloudflare Pages. | `expo export --platform web` | FR-1–FR-11 | P1 |
| **F-18** | **Customer Support** | Show phone/WhatsApp number. *(Trimmed: FAQ and deep-links are Fast-follow).* | `Linking.openURL` | FR-8 | P1 |
| **F-19** | **Logout** | Basic session teardown. | Supabase Auth `signOut` | FR-4 | P1 |
| **FR-15** | **Push Notifications** | Approval + order status changes via Expo Push. | Expo Notifications | FR-9, FR-10 | P2 |
| **F-7** | **Accessibility Baseline** | Good defaults (labels, contrast, tap size). *(Trimmed: no CI tooling).* | React Native defaults | FR-1 | P2 |
| **F-9** | **Store Release Prep** | Store listings, demo accounts. | EAS Submit | FR-12 | P1 |
| **F-10** | **Handover Documentation** | Runbooks, vault export, architecture diagram. | Markdown docs | F-9 | P2 |

---

## Phase 2: Fast-follow & Parking Lot

### Fast-follow (Weeks after launch)
| Feat ID | Name | Description |
|---------|------|-------------|
| **F-4** | **Staging Environment** | Separate Supabase project for testing. |
| **F-5** | **Error Tracking** | Sentry logging and crash reporting. |
| **F-27** | **Network Status** | Offline banners and pull-to-refresh health checks. |
| **F-24** | **Catalog Filter & Sort** | Filter by specialty tags and availability. |
| **F-13** | **Order Cancellation** | In-app cancellation flow for doctors. |
| **F-26** | **Admin Doctor Directory** | Searchable directory of all registered users. |
| **F-16** | **Delivery Info** | Structured tracking numbers and courier links. |
| **FR-16** | **Saved Sets** | Save cart as a named set for quick reordering. |
| **FR-20** | **Invoices (Manual)** | Admin PDF upload for invoices. |
| **F-19b** | **Delete Account** | Self-service deletion (required for App Store). |
| **F-11b** | **Address Book** | Full address management screen. |
| **FR-2b** | **Numeric Keypad** | Direct numeric input for cart quantities. |

### Parking Lot (Out of Scope / Later)
| Feat ID | Name | Description |
|---------|------|-------------|
| **F-15** | **Product Availability** | Inventory/stock tracking. |
| **F-23** | **Tax & Pricing Rules** | CGST/SGST/IGST breakdown and rules. |
| **F-25** | **Admin Order Export** | CSV/Excel exports for accounting. |
| **F-22** | **Notification Matrix** | 3-channel formal matrix (Push+WhatsApp+Email). |
| **FR-17** | **Offline Catalog** | Local SQLite caching for offline browsing. |
| **FR-19** | **Online Payments** | Razorpay integration for checkout. |
| **F-17** | **Reconciliation & Refunds** | Payment lifecycle and Razorpay refunds. |
| **F-8** | **Localization** | `i18next` and RTL foundations. |
| **FR-18** | **WhatsApp Integration** | Business API transactional templates. |

---

## Quick Reference: Phase → Feature Mapping (Triaged)

| Phase | Features Completed |
|-------|-------------------|
| 0 Prepare | FR-0, FR-0a, FR-0b |
| 1 Catalog Data | (data prep) |
| 2 Foundation | F-1, FR-13, FR-14, F-2, F-3, F-21, F-20 |
| 3 Core App (MVP) | FR-4, FR-4a, F-11, FR-5, FR-1, FR-2, FR-3, FR-6, F-12, FR-7, FR-8, F-14, F-18, F-19, F-7 |
| 4 Admin + Website | FR-9, FR-10, FR-11, FR-12, FR-15, F-9 |
| 5 Pilot & Fast-follow | (testing) + Saved Sets, Invoices, Delete Account, etc. |
| 6 iOS + Stores | Store compliance |
| 7 Launch | F-10 |