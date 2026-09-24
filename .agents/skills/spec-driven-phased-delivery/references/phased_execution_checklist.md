# Phased Execution Checklist & Verification Runbook

## Phase 0: Project Setup & Baseline Hardening
- [ ] Initialize git repository with strict `.gitignore` (ignoring `.env`, `node_modules`, `.expo`).
- [ ] Initialize Expo template with TypeScript strict mode enabled.
- [ ] Create `.env.example` defining all variables with descriptions (Supabase URL/Anon Key, Cloudflare R2 bucket credentials, Razorpay key IDs).
- [ ] Verify `npm run lint` and `npx tsc --noEmit` pass with zero warnings.

---

## Phase 1: Catalog Data Extraction & Preparation
- [ ] Extract images and structured data from catalog PDFs (`CatPDF/`).
- [ ] Normalize category names, product titles, Art Nos, and size variations in a master staging sheet/JSON.
- [ ] Verify image aspect ratios and upload processed assets to Cloudflare R2 (`speqtus-product-images`).
- [ ] Confirm no Art No collisions exist across product sizes.

---

## Phase 2: Database Schema & Row-Level Security (RLS)
- [ ] Run Supabase migrations for tables: `categories`, `products`, `product_variants`, `users`, `addresses`, `orders`, `order_items`, `order_status_history`.
- [ ] Implement database-level price confidentiality (FR-5): ensure unapproved accounts receive `NULL` for variant prices.
- [ ] Create `validate_order_status_transition()` PostgreSQL trigger to enforce legal order state transitions (FR-13).
- [ ] Test RLS policies for:
  - Guest access (public catalog read without prices).
  - Doctor pending access (cart creation allowed, order submission blocked, prices hidden).
  - Doctor approved access (prices visible, order placement active).
  - Admin access (pricing management, doctor account approval).

---

## Phase 3: Mobile App MVP (Expo / React Native)
- [ ] Wire Supabase authentication (OTP / phone or email).
- [ ] Implement responsive catalog browsing, category filtering, and debounced search.
- [ ] Implement cart state management with instant price snapshot verification.
- [ ] Implement checkout sheet with address selector.
- [ ] Verify layout responsiveness across simulated mobile screens and desktop browser widths.

---

## Phase 4: Admin Back Office Web
- [ ] Implement doctor verification dashboard with approve/reject action buttons.
- [ ] Implement order management board with valid state transitions only.
- [ ] Implement catalog price editor per size variant.

---

## Phase 5: Pilot Cohort & Audit
- [ ] Run automated audit of order history and state transition logs.
- [ ] Conduct end-to-end order placement, packaging, dispatch, and delivery walkthrough.
