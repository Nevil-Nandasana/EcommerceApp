# Speqtus Medical Ordering Platform — Operations Runbook & System Handover Guide

> **Confidential — For Internal Speqtus Medical Operations, Warehouse Staff, and System Administrators.**  
> Platform: Mobile (iOS / Android / Web) | Backend: Supabase (PostgreSQL 15) | Edge: Cloudflare Pages & R2 | Mobile Framework: Expo SDK 52

---

## 1. System Architecture & Component Topology

Speqtus is engineered as a **Zero-Server Edge Architecture** designed for high reliability, zero server maintenance costs, and offline resilience in hospital Operation Theatres:

```
[ Doctor Mobile App (Expo SDK 52) ]
        │
        ├── Direct API (JWT Authenticated) ──> [ Supabase (PostgreSQL 15 + PostgREST) ]
        │                                             ├── Row-Level Security (RLS)
        │                                             ├── Price-Gated Catalog Views
        │                                             ├── Atomic Order RPC (submit_order)
        │                                             └── Enforced State Machine Triggers
        │
        ├── Edge Functions (Deno Runtime) ───> [ Resend API (Owner Order Alerts) ]
        │                                      [ Expo Push Notification Service ]
        │
        ├── Static Web & Legal Assets ───────> [ Cloudflare Pages ] (privacy.html, delete-account.html)
        │
        └── High-Res Photos & PDF Invoices ──> [ Cloudflare R2 Storage Bucket ] (Zero Egress Fees)
```

### Core Services & Portals
- **Supabase Dashboard**: Database management, auth users, RLS policies, database backups.
- **Cloudflare Dashboard**: Cloudflare Pages web deployment, Cloudflare R2 storage for catalog instrument photos and PDF invoices.
- **Expo Application Services (EAS)**: Cloud builds for Android (.apk / .aab) and iOS (.ipa / TestFlight).
- **Admin Back Office**: Embedded in the mobile application (accessible to users with `role: 'admin'`) at `/admin`.

---

## 2. Daily Operations: Order Fulfillment Lifecycle

Orders strictly follow a PostgreSQL database state machine enforced at the database level by trigger `trg_validate_order_status_transition`:

$$\text{requested} \longrightarrow \text{confirmed} \longrightarrow \text{dispatched} \longrightarrow \text{delivered}$$
$$\text{requested / confirmed} \longrightarrow \text{cancelled}$$

### Step-by-Step Order Workflow:

#### Step 1: Receiving New Order Requests
1. When a verified doctor places an order request, an automated email notification is dispatched to `OWNER_EMAIL` via Resend with order line items and doctor contact details.
2. Open the Speqtus app and navigate to **Profile → Open Speqtus Back Office → Orders**.
3. Orders with status **`REQUESTED`** appear at the top with item counts and delivery destinations.

#### Step 2: Quoting Line Item Prices (For Custom or Unpriced Instruments)
1. Tap **`View & Price Items ▼`** on the order card.
2. For any item showing `"Set price"`, consult the master Speqtus B2B wholesale price sheet.
3. Enter the unit price in INR and tap **`Save`**.
4. Once all line items have prices assigned, the system recalculates and locks the order subtotal.

#### Step 3: Confirming the Order
1. Contact the clinic or hospital purchase officer if any delivery specifications need clarification.
2. Tap **`Confirm Order`**.
3. The order transitions to **`CONFIRMED`**. The doctor receives a push notification confirming that the surgical instruments are being packed.

#### Step 4: Dispatching & Assigning Courier Tracking (AWB)
1. When the instruments are packaged and handed to the courier partner:
2. In the Admin Dashboard under **`CONFIRMED`** orders, tap **`Dispatch`**.
3. The inline dispatch form will appear:
   - **Courier Partner**: Enter the carrier (*e.g., Blue Dart, DTDC, Delhivery, Speed Post, Tirupati Courier*).
   - **Tracking / AWB Number**: Enter the waybill or tracking code (*e.g., `3489102849`*).
4. Tap **`Confirm Dispatch`**.
5. The order status updates to **`DISPATCHED`**. The doctor's Order Detail screen immediately displays the courier tracking badge and an interactive **"Track Order"** link.

#### Step 5: Attaching Official GST Tax Invoices
1. Generate the formal Tax Invoice in your billing software (Tally / Zoho Books / Busy).
2. Save or export the invoice as a PDF (*e.g., `SPQ-2026-0042.pdf`*).
3. Upload the PDF to the Cloudflare R2 invoices bucket or your public file storage.
4. On the order card in the Admin Back Office, tap **`+ Attach GST Invoice PDF`**.
5. Paste the public invoice URL and tap **`Save Invoice URL`**.
6. The doctor will now see a **"Download Tax Invoice (PDF) 📄"** button on their order screen.

#### Step 6: Marking Delivered
1. Upon delivery confirmation from the courier, tap **`Mark Delivered`** on the order card.
2. The order transitions to terminal state **`DELIVERED`**.

#### Step 7: Exporting Orders to Accounting Software
1. In the Orders tab header, tap **`📥 Export Orders to CSV`**.
2. A compliant CSV spreadsheet is generated containing:
   - Order Number, Date, Doctor Name, Hospital/Clinic, Phone, Status, Item Count, Subtotal, Courier Partner, Tracking Number, Invoice URL, and Order Notes.
3. Import the CSV directly into Tally, Zoho Books, or Excel for GST filing and sales reconciliation.

---

## 3. Practitioner Verification & KYC Protocol

Speqtus strictly gates wholesale pricing behind verified medical credentials to prevent price leakages.

### Approval Procedure:
1. When a new doctor signs up, their account is flagged as `pending` and restricted from viewing prices or placing orders.
2. Open **Admin Back Office → Approvals** (or **Directory**).
3. Review the doctor's submitted credentials:
   - **Full Name**
   - **Hospital / Clinic Name & Address**
   - **Medical Registration Number (State or NMC)**
   - **Specialty** (*e.g. Orthopedic, General Surgery, ENT, Gynecology*)
4. **Verification Check**:
   - Visit the official National Medical Commission (NMC) National Register: [https://www.nmc.org.in/information-desk/indian-medical-register/](https://www.nmc.org.in/information-desk/indian-medical-register/)
   - Verify the registration number matches the doctor's name and medical council.
5. In the Speqtus Back Office, tap **`Approve Doctor`**.
6. The doctor's status updates to `approved`. The database view `catalog_variants` immediately reveals B2B pricing to the practitioner on their next app launch.
7. If the account is fraudulent or invalid, tap **`Reject`**.

---

## 4. Operation Theatre (OT) Offline Orders Handling

Doctors often submit order requests from hospital basement OTs with zero cellular connectivity.

### System Behavior:
1. When offline, orders are captured locally in the persistent Zustand outbox (`useOutboxStore`).
2. The app alerts the doctor: *"Order Captured! It will be submitted automatically when you reconnect to the internet."*
3. The doctor is also presented with a **"Also Send via WhatsApp"** button.
4. **WhatsApp Fallback SOP**:
   - The WhatsApp button pre-fills an order summary directly to the Speqtus owner's phone (`+919876543210`).
   - If the warehouse receives an urgent order over WhatsApp, fulfill the order immediately.
   - When the doctor re-establishes internet connectivity, the app's `networkSync` service automatically flushes the outbox to Supabase without creating duplicates.

---

## 5. Catalog Management & Seeding Pipeline

When Speqtus releases new instruments, sizes, or revised catalogs:

### Workflow:
1. Place the new master catalog PDF into `scripts/Speqtus_Catalog.pdf`.
2. Extract product descriptions, sizes, art numbers, and cropped instrument photos:
   ```bash
   python scripts/extract_catalog.py
   ```
3. Upload new product photos to Cloudflare R2:
   ```bash
   python scripts/upload_to_r2.py
   ```
4. Seed the parsed catalog JSON (`scripts/catalog_data.json`) directly into Supabase:
   ```bash
   python scripts/seed_catalog.py
   ```
   *Note: `seed_catalog.py` uses idempotent upserts on `art_no`. Existing variants will be updated with new prices or descriptions without corrupting past orders or order history.*

---

## 6. Database Backups & Disaster Recovery

Nightly backups ensure complete recovery in the event of database failure or migration rollback.

### Running Automated Backups:
Ensure your environment variables are configured in `.env` (`SUPABASE_DB_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`):

```bash
# Execute local database snapshot
python scripts/backup_database.py
```

- Backups are dumped into `backups/backup_YYYYMMDD_HHMMSS.sql.gz`.
- Backups are automatically uploaded to the private Cloudflare R2 backup bucket.
- Backups older than 30 days are automatically pruned to conserve storage.

### Restoring from Backup:
```bash
# Restore directly to PostgreSQL
gunzip -c backups/backup_YYYYMMDD_HHMMSS.sql.gz | psql "YOUR_SUPABASE_DB_CONNECTION_STRING"
```

---

## 7. EAS Mobile Build & Release Deployment Guide

The application uses **Expo Application Services (EAS)** for continuous cloud builds.

### Prerequisites:
```bash
npm install -g eas-cli
eas login
```

### 1. Generating Direct Test APKs (For internal testing and direct doctor distribution)
This generates an installable `.apk` file that can be distributed via WhatsApp or direct download link without publishing to Google Play:
```bash
eas build --platform android --profile preview
```

### 2. Generating Production Android Google Play Bundles (.aab)
```bash
eas build --platform android --profile production
```
- Download the generated `.aab` file from the EAS dashboard and upload to the Google Play Developer Console under Internal Testing or Production.

### 3. Generating Production iOS App Store / TestFlight Archive
```bash
eas build --platform ios --profile production
```
- Uploads directly to App Store Connect for TestFlight distribution and App Store Review.

### 4. Over-The-Air (OTA) Updates (Zero App Store Review Delay)
For non-native JavaScript or layout fixes, publish instant over-the-air updates without submitting a new binary build:
```bash
eas update --branch production --message "Fix styling and catalog filters"
```

---

## 8. Emergency Contacts & Access Registry

| Role | Contact | Responsibility |
|---|---|---|
| Speqtus Managing Director | `owner@speqtus.com` / `+91 98765 43210` | Daily order approvals, pricing, fulfillment |
| Technical Lead / DevOps | `tech@speqtus.com` | EAS builds, Supabase RLS, Edge functions |
| Cloudflare Admin | Cloudflare Pages & R2 Dashboard | Asset storage & privacy policy web hosting |
| Grievance & Compliance Officer | `privacy@speqtus.com` | Account erasure requests (DPDP Act / GDPR) |

---
*Document Version: 1.0.0 — Speqtus Medical Technologies Private Limited*
