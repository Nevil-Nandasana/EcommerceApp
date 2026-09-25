# Speqtus Medical Ordering Platform — Accounts & Services Tracker

> **Governed by:** PRD Section 6.6, FR-0a, and [AGENTS.md](./AGENTS.md)  
> **Security Protocol:** **NEVER** write plaintext production passwords, service role keys, or private API tokens into this file. Store actual secret values in your local `.env` (gitignored) or an encrypted team vault (e.g. 1Password / Bitwarden). This tracker logs account status, project references, IDs, and owners.

---

## 1. Core Services Summary

| Service | Purpose | Plan / Tier | Account Owner / Email | Status |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub** | Source Code & Version Control | Free | Speqtus Dev (`nevil@...`) | **Active** |
| **Supabase** | PostgreSQL DB, Auth & Edge Functions | Free ($0/mo) | Speqtus Dev (`nevil@...`) | **Configured** |
| **Cloudflare** | R2 Image Storage & Pages Web Hosting | Free tier | Speqtus Dev (`nevil@...`) | **Configured** |
| **Google Play** | Android App Distribution | One-time $25 | Speqtus Medical Org | **In Progress** |
| **Apple Developer** | iOS App Distribution | $99/year | Speqtus Medical Org | **In Progress** |
| **Google Workspace** | Master Catalog Sheet & Drive | Existing | Speqtus Operations | **Active** |

---

## 2. Infrastructure & Provider Details

### 2.1 Supabase
- **Project Name:** `speqtus-medical-prod` (and `speqtus-medical-staging`)
- **Region:** `ap-south-1` (Mumbai, India) — optimal latency for tier-1/tier-2 clinics
- **Dashboard URL:** `https://supabase.com/dashboard/project/<PROJECT_REF>`
- **Project Ref:** Tracked in private deployment config
- **Public API URL:** `EXPO_PUBLIC_SUPABASE_URL` (in `.env`)
- **Public Anon Key:** `EXPO_PUBLIC_SUPABASE_ANON_KEY` (in `.env`)
- **Service Role Key:** `SUPABASE_SERVICE_ROLE_KEY` (Backend/Edge functions only; strictly non-client)
- **Database Extensions Required:**
  - `uuid-ossp` (UUID primary key generation)
  - `pg_trgm` (Trigram similarity search on Art No and product names)
  - `unaccent` (Accent-insensitive text search)

### 2.2 Cloudflare R2 & Pages
- **Account Name:** Speqtus Medical
- **Account ID:** `R2_ACCOUNT_ID` (in `.env`)
- **Bucket Name:** `speqtus-product-images`
- **Location:** Asia / Pacific (APAC)
- **Public CDN Custom Domain:** `https://images.speqtusmedical.com` (`R2_PUBLIC_URL_PREFIX`)
- **Web App Hosting:** Cloudflare Pages (deploying `expo export --platform web`)
- **Access Keys:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (stored in `.env`)

### 2.3 Apple Developer Program
- **Entity Type:** Organization (Speqtus Medical)
- **D-U-N-S Number:** Submitted & under verification with Dun & Bradstreet
- **Annual Fee:** $99/year
- **Team ID:** Pending approval
- **Bundle Identifier:** `com.speqtusmedical.ordering`
- **Associated Capabilities:** Push Notifications (APNs)

### 2.4 Google Play Console
- **Account Type:** Organization
- **Registration Fee:** $25 (one-time)
- **Package Name:** `com.speqtusmedical.ordering`
- **Closed Testing Requirement:** 12+ tester pilot cohort planned for Phase 5 (14-day test policy)
- **FCM Configuration:** Firebase Cloud Messaging linked for Expo Push

### 2.5 Catalog Google Sheet
- **Master Sheet Title:** `Speqtus Medical — Master Catalog (Production)`
- **Permissions:** Restricted (Speqtus owner + automated sync service account with Viewer/Editor role)
- **Sync Method:** Supabase Edge Function (`sync-catalog`) triggered nightly or manually via Admin UI

---

## 3. Future & Phase 6+ Integrations (Parked)

| Service | Purpose | Target Phase | Status |
| :--- | :--- | :--- | :--- |
| **Razorpay Standard** | Online Payment Gateway (UPI, Cards, NetBanking) | Phase 6 | Business KYC pending |
| **WhatsApp Cloud API** | Order Status & Reorder WhatsApp Bot | Phase 6 | Meta Business Manager verification pending |
| **Sentry** | Production Error & Crash Reporting | Phase 5 | Account registered |
