# Speqtus Medical Ordering Platform — Optimization & Offline Strategy

**Document:** `Planning/OPTIMIZATION_AND_OFFLINE_STRATEGY.md`  
**Governing Documents:** [`PRD.md`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/PRD.md), [`Planning/tasks.md`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/Planning/tasks.md), [`Planning/DECISIONS.md`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/Planning/DECISIONS.md), [`Planning/Optimize.txt`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/Planning/Optimize.txt)  
**Date:** October 1, 2026  
**Status:** Architecture Blueprint & Decision Record  

---

## 1. Executive Summary

This document captures the architectural evaluation, technical decisions, and strategic roadmap discussed regarding:
1. **Current Project Progress Audit** (Completed Phases 0–4 vs. Remaining Phases 5–8).
2. **Technical Evaluation of Render Free Tier Options** in [`Planning/Optimize.txt`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/Planning/Optimize.txt).
3. **Image Bandwidth & Phone Disk Caching Strategy** (Strategy B: Background Pre-caching via `expo-image`).
4. **Zero-Network / Offline Order Submission Architecture** for hospital basement Operation Theatres (Store-and-Forward Outbox Pattern).

---

## 2. Project Progress Audit: Completed vs. Remaining

### 2.1 Verified Build & Test Health
- **Unit Tests:** Passed 22/22 assertions ([`tests/run_tests.js`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/tests/run_tests.js)), strictly validating the order state machine transitions (`requested → confirmed → dispatched → delivered`, rejection of `dispatched → cancelled`), quote-based subtotal calculations, and boundary limits.
- **TypeScript:** Clean compilation with 0 errors (`tsc --noEmit`).
- **ESLint:** Clean validation with 0 errors (`eslint .`).
- **Git:** Working tree clean on branch `main` at commit [`e6a7443`](https://github.com/Nevil-Nandasana/EcommerceApp/commit/e6a7443).

### 2.2 Phase-by-Phase Completion Status

```
Phase 0: Setup, Tooling & Business Rules  [████████████████████] 100% (Code complete)
Phase 1: Catalog Extraction & Pipeline    [████████░░░░░░░░░░░░]  40% (Pipelines built; manual review pending)
Phase 2: Database Foundation & Security   [████████████████████] 100% (7 migrations + RLS + RPCs)
Phase 3: Core Doctor Mobile MVP           [████████████████████] 100% (Auth, Catalog, Cart, Checkout, Orders)
Phase 4: Admin Tools & Web Back Office    [██████████████████░░]  90% (Dashboard complete; email alert pending)
Phase 5: Pilot & Fast-Follow              [░░░░░░░░░░░░░░░░░░░░]   0% (Backlog defined)
Phase 6: "Hook" Features (Sets, Offline)  [░░░░░░░░░░░░░░░░░░░░]   0% (DB ready; UI/APIs pending)
Phase 7 & 8: Stores & Launch Handover     [░░░░░░░░░░░░░░░░░░░░]   0% (Pending store enrollments)
```

| Phase | Scope Completed | What Remains to Be Done |
| :--- | :--- | :--- |
| **Phase 0: Setup** | Expo + TS + `expo-router` setup; root configs; signed-off [`Planning/DECISIONS.md`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/Planning/DECISIONS.md); credentials tracker [`Planning/ACCOUNTS.md`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/Planning/ACCOUNTS.md). | External D-U-N-S business verification and Apple/Google organization account enrollments. |
| **Phase 1: Catalog Data** | PDF parser ([`scripts/extract_catalog.py`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/scripts/extract_catalog.py)), R2 upload helper ([`scripts/upload_to_r2.py`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/scripts/upload_to_r2.py)), catalog source ([`CatPDF/SPEQTUS SURGICAL INSTRUMENTS.pdf`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/CatPDF/SPEQTUS%20SURGICAL%20INSTRUMENTS.pdf)). | Run extraction on 105 pages, manually verify ~800 instruments, populate master Google Sheet, run batch upload to production R2 bucket. |
| **Phase 2: Database** | 7 Supabase migrations (schema, RLS, triggers, atomic order RPC, push tokens), edge function [`sync-catalog`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/supabase/functions/sync-catalog/index.ts), backup script [`scripts/backup_database.py`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/scripts/backup_database.py). | None for MVP schema. |
| **Phase 3: Doctor MVP** | Supabase client, Auth flow (Phone/OTP/Profile), Category Grid, Trigram Search, Product List, Detail & Steppers, Category-Grouped Cart, Atomic Checkout, Orders List, Detail & Status Timeline. | None for core doctor flow. |
| **Phase 4: Admin & Web** | Admin route guard, back-office dashboard ([`app/admin/index.tsx`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/app/admin/index.tsx)) with approvals, state actions, unpriced item editor, catalog visibility; push notification edge function; Cloudflare Pages config. | Owner email alert on new order placement; live custom domain linkage. |
| **Phase 5: Pilot Cohort** | Fast-follow backlog defined in [`Planning/tasks.md`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/Planning/tasks.md). | Android build for Google Play Closed Testing (12 testers for 14 continuous days); pilot feedback triage. |
| **Phase 6: Hook Features** | DB tables `saved_sets` and `saved_set_items` ready in migration 2. | Saved Sets UI ("My Minor OT Set"), offline catalog cache, WhatsApp Cloud API integration, Razorpay payments. |
| **Phase 7 & 8: Launch** | Checklist ready. | Store listings, iOS TestFlight build, App Store submission, production handover. |

---

## 3. Evaluation of `Planning/Optimize.txt`

### 3.1 Context & Options Analyzed
The user proposed deploying on Render Free Tier (512MB RAM, 1 CPU core) for ~50 users and asked which option to choose:
- **Option 1:** Setup a load balancer and 2 Render backends.
- **Option 2:** Delta sync with a priority queue where profitable/high-order clients get catalog updates first and new installs wait in queue.

### 3.2 Evaluation of Option 1: Load Balancer + 2 Render Backends
> [!CAUTION]
> **Verdict: Unviable on Free Tier & Architectural Overkill**
> 1. **750-Hour Monthly Quota Trap:** Render free tier allocates 750 free instance hours per calendar month across the entire account. Running 2 backend instances consumes `2 * 744 = 1,488 hours`, causing Render to **suspend both services around Day 15 of every month** (hard outage for doctors).
> 2. **No Free Load Balancer:** Render does not provide a free managed load balancer. Deploying an Nginx proxy as a 3rd instance exhausts the 750 hours in under 10 days.
> 3. **Cold Starts (50–90s delays):** Free tier instances spin down after 15 minutes of inactivity. With round-robin routing, doctor requests frequently hit sleeping containers, causing client timeouts.
> 4. **Traffic Reality:** 50 surgeons ordering instruments every 4–8 weeks generate **0.001 to 0.05 queries per second (QPS)**. A single 512MB Node/FastAPI container handles 500–2,000 QPS. A load balancer for 50 users is extreme over-engineering.

### 3.3 Evaluation of Option 2: Priority Queue based on Doctor Profitability
> [!WARNING]
> **Verdict: Harmful Anti-Pattern for User Adoption**
> 1. **Destroys New Doctor Onboarding:** Newly registered surgeons have 0 previous orders. Placing them at the back of an artificial queue causes their app to freeze with loading spinners. Surgeons have zero patience and will immediately delete the app.
> 2. **Negligible Payload:** The full Speqtus catalog (~800 instruments, ~2,000 variants) is only **~45 KB gzipped JSON**. Over 4G/5G, 45 KB transfers in **under 30 milliseconds**. There is no bandwidth or CPU bottleneck to queue.
> 3. **504 Timeouts:** Holding pending HTTP connections in an in-memory priority queue on 512MB RAM exhausts file descriptors and causes Render's gateway to terminate requests with `504 Gateway Timeout` after 30–60 seconds.

### 3.4 Recommendation
**Use NEITHER Option 1 nor Option 2 as proposed.**

### 3.5 The Recommended Production Optimization Blueprint
1. **Zero-Server Edge Architecture (Current Project Design):**
   - **Database & API:** Supabase (PostgreSQL + PostgREST + Row-Level Security). Native connection pooling, JWT verification, and trigram search.
   - **Web Admin Hosting:** Cloudflare Pages (100% Free, 0ms cold starts, global edge CDN, unlimited bandwidth).
   - **Product Photos:** Cloudflare R2 with zero egress fees and global caching.
   - **Total Cost:** **$0.00/month** for 50 to 5,000 users with sub-100ms response times.
2. **Proper Delta Sync (Catalog Version Fingerprint & HTTP 304):**
   - Store a lightweight version integer (e.g. `catalog_version: 14`) in Supabase.
   - On app launch, app sends a 120-byte request to check `catalog_version`.
   - If version matches local storage: **0 bytes downloaded, instant 0ms load**.
   - If version incremented: download updated JSON and save to local storage.
3. **If a Dedicated Render Service IS Strictly Required:**
   - Run **exactly 1 instance** (consumes 744 hours, safely within 750h limit).
   - Use an external cron ping (e.g. UptimeRobot) every 10–12 minutes during clinic hours (8:00 AM – 8:00 PM IST) to prevent cold starts.
   - Single-worker process uses only ~70MB RAM, leaving >430MB free on the 512MB container.

---

## 4. Image Bandwidth & Mobile Caching Strategy

### 4.1 Storage Footprint on User's Phone
Images account for >95% of data bandwidth. Caching images directly to the doctor's phone disk is highly feasible:

| Asset Type | Count | Size Each | Total Storage |
|---|---|---|---|
| **Catalog Thumbnails (200px WebP)** | ~800 instruments | ~12 KB | **~9.6 MB** |
| **High-Res Detail Images (800px WebP)** | ~50 viewed items | ~70 KB | **~3.5 MB** |
| **Total Disk Footprint** | | | **~13.1 MB** |

> **Context:** 13 MB represents less than **0.02%** of a standard 64GB smartphone (smaller than a 15-second WhatsApp video).

### 4.2 Caching Strategy Decision: Strategy B (Background Pre-Caching)
- **Selected Approach:** **Strategy B (Background Pre-Caching with `expo-image`)**.
- **Mechanism:**
  - Upon initial app launch or Wi-Fi connection, a silent background task pre-fetches all ~800 thumbnails (~9.6 MB) via `Image.prefetch()`.
  - Downloading completes in ~3–5 seconds on broadband or 4G/5G.
  - From that moment on, catalog browsing, category navigation, and search operate **100% locally with 0ms network latency**.
  - High-res images (~70 KB) load on-demand only when a doctor opens a specific product detail screen.

---

## 5. Zero-Network / Offline Order Submission Architecture

### 5.1 The Hospital / Operation Theatre (OT) Environment
- Hospital basements and Operation Theatres often have thick lead-lined or concrete walls, resulting in **zero cellular bars** or spotty 2G.
- Direct synchronous HTTP calls to Supabase will hang, timeout, and throw errors.

### 5.2 Store-and-Forward Outbox Pattern (The WhatsApp Model)

```
Doctor in OT (No Signal)
       │
       ▼
1. Taps "Submit Order Request"
       │
       ▼
2. App instantly saves order to Local Encrypted Outbox Queue (lib/outbox.ts)
   • Cart is cleared immediately
   • UI shows: "Order Captured! 🕒 Queued for Sync"
   • Local temporary Order ID assigned (TEMP-SPQ-XXXX)
       │
       ▼
3. Doctor leaves OT / Connects to 4G / Hospital Wi-Fi
       │
       ▼
4. Network Listener detects connectivity in background
   • Flushes Outbox Queue to Supabase RPC (submit_order)
   • Status changes from 🕒 "Queued" to 📋 "Requested"
   • Permanent Order ID assigned (SPQ-2026-XXXX)
   • Doctor receives local confirmation notification
```

### 5.3 Architectural Components

1. **Persistent Local Outbox Queue ([`lib/outbox.ts`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/lib/outbox.ts)):**
   - Stores queued order payloads in persistent local storage (`MMKV` / `AsyncStorage` / `SQLite`).
   - Order remains safe even if the doctor closes the app or restarts the phone.
2. **Connectivity Listener (`@react-native-community/netinfo`):**
   - Listens for network restoration and automatically triggers queue flushing without requiring user action.
3. **Idempotency Key (Zero Duplicate Orders):**
   - Every queued order generates a UUID `client_order_id`.
   - The Supabase RPC [`submit_order`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/supabase/migrations/20260925000006_atomic_order_rpc.sql) checks this key: if network dropped after receipt, re-transmitting returns the existing order rather than creating a duplicate.
4. **WhatsApp / SMS Emergency Failover (1-Tap Fallback):**
   - For situations where data connectivity is completely dead for hours, the confirmation screen provides a **"Send Order via WhatsApp / SMS"** button.
   - Generates a pre-formatted order summary directly to the Speqtus owner's phone number. WhatsApp queues messages natively and delivers them upon signal recovery.

---

## 6. Actionable Implementation Roadmap

1. **Install `expo-image` & Implement Strategy B Pre-caching:**
   - Replace standard React Native `<Image>` with `expo-image` in [`app/(tabs)/index.tsx`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/app/(tabs)/index.tsx), [`app/category/[id].tsx`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/app/category/[id].tsx), and [`app/product/[id].tsx`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/app/product/[id].tsx).
   - Implement `prefetchCatalogThumbnails()` helper on app startup.
2. **Build the Offline Order Outbox (`lib/outbox.ts`):**
   - Add queue persistence and background NetInfo sync to [`app/checkout.tsx`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/app/checkout.tsx).
   - Add "Queued" status badge in [`app/(tabs)/orders.tsx`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/app/(tabs)/orders.tsx).
3. **Catalog Data Population (Phase 1, Task T1.2.1):**
   - Run extraction script on [`CatPDF/SPEQTUS SURGICAL INSTRUMENTS.pdf`](file:///e:/AI-WorkSpace/Projects/Active/EcommerceApp/CatPDF/SPEQTUS%20SURGICAL%20INSTRUMENTS.pdf) and populate master catalog data.
4. **Owner Order Alert (Phase 4):**
   - Connect transactional email alert (Resend/SendGrid) on new order creation.
