# Speqtus Medical — UI Wireframe Specification

**Source:** FEATURES.md (50 features) + PRD + AGENTS.md  
**Status:** Design Reference — update alongside feature changes  
**Last updated:** 22 Sep 2026

---

## Design Principles

### 1. One-Hand Thumb-Zone Ergonomics (Mobile)

```
┌─────────────────────────┐
│   ❌ HARD TO REACH      │  ← Status bar, top-left back buttons
│                         │     (keep non-critical here)
│                         │
│   ⚠️  STRETCH ZONE      │  ← Filter chips, search bar
│                         │     (reachable but not primary)
│                         │
│   ✅ NATURAL ZONE       │  ← Product cards, order cards,
│                         │     scrollable content
│                         │
│   ✅ EASY / THUMB ARC   │  ← Cart badge, primary action
│                         │     buttons, bottom nav
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│  🏠   🔍   🛒   📋   👤 │  ← Bottom Tab Bar (always visible)
└─────────────────────────┘
```

**Rules:**
- Primary actions (Add to Cart, Submit Order, Log Out, Cancel Order) always in the **bottom 40%** of the screen.
- Destructive actions (Clear Cart, Cancel Order, Delete Account) require **confirmation modals** centered in the thumb zone.
- Bottom Tab Bar is the persistent navigation anchor on all doctor screens.
- Floating Action Buttons (FABs), if used, sit in the bottom-right thumb arc.

### 2. Desktop Web — Complete Experience, Not a Stretched Phone

The website (`shop.speqtusmedical.com`) must feel like a **purpose-built web app**, not a mobile app rendered in a wide browser:

- **Sidebar navigation** replaces bottom tabs on desktop (≥1024px).
- **Multi-column product grids** (3–4 columns) instead of single-column mobile lists.
- **Side-by-side layouts** for checkout (cart summary on right, form on left).
- **Data tables with inline editing** for admin screens (not mobile card stacks).
- **Persistent header** with search bar, cart icon with badge, and user dropdown.
- **Hover states** on all interactive elements (cards, buttons, rows).

### 3. Visual Language

| Token | Value | Usage |
|-------|-------|-------|
| **Primary** | Navy `#0F2B46` | Headers, primary buttons, bottom nav active |
| **Accent** | Teal `#0EA5A0` | CTAs, links, active states, progress indicators |
| **Success** | Green `#16A34A` | Delivered badge, Available status, Approved |
| **Warning** | Amber `#F59E0B` | Dispatched badge, Temporarily Unavailable |
| **Danger** | Red `#DC2626` | Cancel button, Cancelled badge, Out of Stock, Log Out |
| **Neutral** | Gray `#6B7280` | Requested badge, secondary text, borders |
| **Surface** | White `#FFFFFF` | Cards, modals, inputs |
| **Background** | Off-white `#F9FAFB` | Screen backgrounds |
| **Font** | Inter / System | All text; 14px body, 16px inputs, 20px headings |

---

## Screen Inventory

### Doctor-Facing Screens (Launch MVP)
| # | Screen | Route | Features |
|---|--------|-------|----------|
| 1 | Login (Phone) | `/(auth)/login` | FR-4 |
| 2 | OTP Verification | `/(auth)/verify-otp` | FR-4 |
| 3 | Google OAuth Redirect | `/(auth)/google` | FR-4 |
| 4 | Profile Completion | `/(auth)/complete-profile` | FR-4a, F-20 |
| 5 | Home — Category Grid | `/(tabs)/` | FR-1 |
| 6 | Product List (Category) | `/category/[slug]` | FR-1 |
| 7 | Product Detail | `/product/[id]` | FR-2, FR-5, F-18 |
| 8 | Search | `/(tabs)/search` | FR-3 |
| 9 | Cart | `/(tabs)/cart` | FR-6 |
| 10 | Checkout Review | `/checkout` | F-12, FR-7 |
| 11 | Order Success | `/checkout/success` | FR-7 |
| 12 | My Orders (List) | `/(tabs)/orders` | FR-8 |
| 13 | Order Detail | `/orders/[id]` | FR-8 |
| 14 | Profile & Settings | `/(tabs)/profile` | F-19 |
| 15 | Edit Profile | `/profile/edit` | F-19 |

### Admin Screens (Launch MVP)
| # | Screen | Route | Features |
|---|--------|-------|----------|
| 21 | Admin — Pending Approvals | `/admin/approvals` | FR-9 |
| 24 | Admin — Orders | `/admin/orders` | FR-10 |
| 25 | Admin — Order Detail | `/admin/orders/[id]` | FR-10 |
| 26 | Admin — Products & Pricing | `/admin/products` | FR-11 |
| 27 | Admin — Sync & Logs | `/admin/sync` | FR-14 |
| 28 | Admin — Dashboard | `/admin` | FR-9, FR-10 |

### Phase 2 / Fast-Follow Screens
| # | Screen | Route | Features |
|---|--------|-------|----------|
| 16 | My Addresses | `/profile/addresses` | F-11 |
| 17 | Add/Edit Address | `/profile/addresses/[id]` | F-11 |
| 18 | My Saved Sets | `/sets` | FR-16 |
| 19 | Edit Saved Set | `/sets/[id]` | FR-16 |
| 20 | Contact & FAQ | `/support` | F-18 |
| 22 | Admin — Doctor Directory | `/admin/doctors` | F-26 |
| 23 | Admin — Doctor Profile | `/admin/doctors/[id]` | F-26 |

### Shared Overlays & Modals
| Modal | Trigger | Features (Status) |
|-------|---------|-------------------|
| Cancel Order Modal | Order Detail → "Cancel Order" | F-13 (Phase 2) |
| Clear Cart Confirm | Cart → "Clear Cart" | FR-6 (Trimmed/Phase 2) |
| Log Out Confirm | Profile → "Log Out" | F-19 (MVP) |
| Delete Account Confirm | Profile → "Delete Account" | F-19 (Phase 2) |
| Add to Saved Set | Cart → "Save as Set" | FR-16 (Phase 2) |
| Dispatch Fulfillment | Admin Order → "Mark Dispatched" | F-16 (Phase 2) |
| Reorder Availability | Order Detail → "Reorder" | F-14 (Trimmed) |
| Filter & Sort Sheet | Product List → Filter icon | F-24 (Phase 2) |
| Address Picker | Checkout → Address selector | F-11 (MVP) |
| Offline Banner | Global overlay | F-27 (Phase 2) |

---

## SECTION A: AUTHENTICATION FLOW

---

### Screen 1: Login (Phone OTP) — `/(auth)/login`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│           (status bar)          │
│                                 │
│                                 │
│         ┌──────────┐            │
│         │ SPEQTUS  │            │
│         │  LOGO    │            │
│         └──────────┘            │
│     Speqtus Medical             │
│    Surgical Instruments         │
│                                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🇮🇳 +91 │ Phone number  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │      Send OTP →         │    │  ← Primary CTA in thumb zone
│  └─────────────────────────┘    │
│                                 │
│        ──── or ────             │
│                                 │
│  ┌─────────────────────────┐    │
│  │  G  Continue with Google│    │
│  └─────────────────────────┘    │
│                                 │
│  By continuing you agree to     │
│  Terms of Service &             │
│  Privacy Policy                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Desktop Layout (≥1024px):**
```
┌───────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  ┌────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │                            │  │                                  │ │
│  │                            │  │        ┌──────────┐              │ │
│  │   Hero Image / Branding    │  │        │ SPEQTUS  │              │ │
│  │   (Surgical instruments    │  │        │  LOGO    │              │ │
│  │    or medical gradient)    │  │        └──────────┘              │ │
│  │                            │  │     Speqtus Medical              │ │
│  │                            │  │    Order surgical instruments    │ │
│  │                            │  │                                  │ │
│  │                            │  │  ┌──────────────────────────┐    │ │
│  │                            │  │  │ 🇮🇳 +91 │ Phone number   │    │ │
│  │                            │  │  └──────────────────────────┘    │ │
│  │                            │  │                                  │ │
│  │                            │  │  ┌──────────────────────────┐    │ │
│  │                            │  │  │      Send OTP →          │    │ │
│  │                            │  │  └──────────────────────────┘    │ │
│  │                            │  │                                  │ │
│  │                            │  │         ──── or ────             │ │
│  │                            │  │                                  │ │
│  │                            │  │  ┌──────────────────────────┐    │ │
│  │                            │  │  │ G  Continue with Google  │    │ │
│  │                            │  │  └──────────────────────────┘    │ │
│  │                            │  │                                  │ │
│  └────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

**Key interactions:**
- Phone field auto-focuses on mount, numeric keypad opens.
- "Send OTP" is disabled until 10 valid digits entered.
- Terms/Privacy are tappable links opening in-app browser.

---

### Screen 2: OTP Verification — `/(auth)/verify-otp`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Verify Phone                │
│                                 │
│                                 │
│  Enter the 6-digit code sent    │
│  to +91 98765 43210             │
│                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│  │ 4 │ │ 8 │ │ 2 │ │ _ │ │ _ │ │ _ │  ← Auto-advance focus
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
│                                 │
│  Didn't receive it?             │
│  Resend OTP (42s)               │  ← Countdown timer
│                                 │
│                                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Verify & Continue →  │    │  ← Auto-submits on 6th digit
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 3: Google OAuth Callback — `/(auth)/google`

**Mobile Layout (loading state):**
```
┌─────────────────────────────────┐
│           (status bar)          │
│                                 │
│                                 │
│                                 │
│         ┌──────────┐            │
│         │ SPEQTUS  │            │
│         │  LOGO    │            │
│         └──────────┘            │
│                                 │
│         ⟳ Signing in...        │  ← Spinner while OAuth
│                                 │     callback is processing
│    Verifying your Google        │
│    account with Speqtus...      │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Error state (OAuth failed):**
```
┌─────────────────────────────────┐
│           (status bar)          │
│                                 │
│                                 │
│         ┌──────────┐            │
│         │ SPEQTUS  │            │
│         │  LOGO    │            │
│         └──────────┘            │
│                                 │
│         ⚠ Sign-In Failed       │
│                                 │
│    We couldn't verify your      │
│    Google account. This may     │
│    be a temporary issue.        │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Try Again →          │    │  ← Retries OAuth flow
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │    Use Phone OTP Instead│    │  ← Falls back to phone login
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Interaction notes:**
- On success: auto-redirects to Profile Completion (Screen 4) if new user, or Category Grid (Screen 5) if returning user.
- On failure: shows error state with retry and fallback options in thumb zone.
- Desktop: same layout centered in the right panel of the split-screen login (matches Screen 1 desktop).

---

### Screen 4: Profile Completion — `/(auth)/complete-profile`

**Mobile Layout (scrollable form):**
```
┌─────────────────────────────────┐
│  Complete Your Profile          │
│  We need a few details before   │
│  you can start ordering.        │
│─────────────────────────────────│
│                                 │
│  Full Name *                    │
│  ┌─────────────────────────┐    │
│  │ Dr. Mehul Patel         │    │
│  └─────────────────────────┘    │
│                                 │
│  Hospital / Clinic Name *       │
│  ┌─────────────────────────┐    │
│  │ City Care Hospital      │    │
│  └─────────────────────────┘    │
│                                 │
│  Specialty (optional)           │
│  ┌─────────────────────────┐    │
│  │ General Surgery     ▾   │    │  ← Dropdown: 12 tags
│  └─────────────────────────┘    │
│                                 │
│  Medical Reg. No. (optional)    │
│  ┌─────────────────────────┐    │
│  │ GJ-12345               │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Primary Delivery Address ── │
│                                 │
│  Label                          │
│  ┌─────────────────────────┐    │
│  │ Clinic                  │    │
│  └─────────────────────────┘    │
│  Address Line 1 *               │
│  ┌─────────────────────────┐    │
│  │ 201, Trade Center       │    │
│  └─────────────────────────┘    │
│  City *         State *         │
│  ┌───────────┐ ┌───────────┐    │
│  │ Ahmedabad │ │ Gujarat ▾ │    │
│  └───────────┘ └───────────┘    │
│  PIN Code *     Contact Phone   │
│  ┌───────────┐ ┌───────────┐    │
│  │ 380015    │ │ 9876543210│    │
│  └───────────┘ └───────────┘    │
│                                 │
│  ☑ I agree to the Privacy       │
│    Policy & Terms of Service    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Submit & Start Browsing│    │  ← Disabled until mandatory
│  └─────────────────────────┘    │     fields + checkbox filled
│                                 │
└─────────────────────────────────┘
```

---

## SECTION B: CORE DOCTOR EXPERIENCE (Bottom Tab Screens)

---

### Screen 5: Home — Category Grid — `/(tabs)/`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ⚠ No Internet Connection      │  ← F-27: Floating offline banner
│─────────────────────────────────│
│  SPEQTUS    🔔 notifications    │
│  Medical                        │
│─────────────────────────────────│
│  ⚠ Account pending approval —  │  ← FR-5: Persistent banner
│    prices & ordering unlock     │     (only for pending doctors)
│    once verified.               │
│─────────────────────────────────│
│                                 │
│  Browse Instruments             │
│  24 categories                  │
│                                 │
│  ┌───────────┐ ┌───────────┐    │
│  │  📷       │ │  📷       │    │  ← 2-column grid
│  │  Needle   │ │  Scissors │    │     Each card: image, name,
│  │  Holders  │ │  & Shears │    │     product count badge
│  │  (12)     │ │  (8)      │    │
│  └───────────┘ └───────────┘    │
│  ┌───────────┐ ┌───────────┐    │
│  │  📷       │ │  📷       │    │
│  │  Retrac-  │ │  Forceps  │    │
│  │  tors     │ │           │    │
│  │  (15)     │ │  (22)     │    │
│  └───────────┘ └───────────┘    │
│  ┌───────────┐ ┌───────────┐    │
│  │  📷       │ │  📷       │    │
│  │  Bone     │ │  ENT      │    │
│  │  Instru.  │ │  Instru.  │    │
│  │  (18)     │ │  (9)      │    │
│  └───────────┘ └───────────┘    │
│       ↕ pull-to-refresh         │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart(3) 📋Orders 👤Profile │
└─────────────────────────────────┘
```

**Desktop Layout (≥1024px):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Medical          🔍 Search instruments or Art No...     🛒(3)  👤▾ │
│──────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  ┌──────────┐                                                                │
│  │ 🏠 Home  │   Browse Instruments — 24 Categories                          │
│  │ 🔍 Search│                                                                │
│  │ 📋 Orders│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 💊 Sets  │   │  📷      │ │  📷      │ │  📷      │ │  📷      │        │
│  │ 👤 Profile│  │ Needle   │ │ Scissors │ │ Retract- │ │ Forceps  │        │
│  │          │   │ Holders  │ │ & Shears │ │ ors      │ │          │        │
│  │          │   │ (12)     │ │ (8)      │ │ (15)     │ │ (22)     │        │
│  │          │   └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  │          │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │          │   │  📷      │ │  📷      │ │  📷      │ │  📷      │        │
│  │          │   │ Bone     │ │ ENT      │ │ Gynae    │ │ Cardiac  │        │
│  │          │   │ Instru.  │ │ Instru.  │ │ Instru.  │ │ Instru.  │        │
│  │          │   │ (18)     │ │ (9)      │ │ (14)     │ │ (7)      │        │
│  │          │   └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  └──────────┘                                                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key differences — Desktop vs Mobile:**
- Sidebar replaces bottom tabs.
- 4-column category grid instead of 2.
- Persistent search in the top header bar.
- Cart badge and user menu in top-right.

---

### Screen 6: Product List (Category) — `/category/[slug]`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Needle Holders & Suturing   │
│      12 products                │
│─────────────────────────────────│
│  Filter & Sort:                 │
│  ┌──────┐ ┌──────┐ ┌────────┐  │
│  │Ortho │ │ ENT  │ │General │  │  ← F-24: Scrollable filter chips
│  └──────┘ └──────┘ └────────┘  │
│  ┌──────────┐ ┌──────────────┐  │
│  │In Stock ☑│ │Sort: A–Z  ▾ │  │  ← Availability toggle + sort
│  └──────────┘ └──────────────┘  │
│─────────────────────────────────│
│  ┌─────────────────────────┐    │
│  │ 📷  Bozemann Knot Tier  │    │  ← Product card
│  │      3 sizes · Art 03-27│    │     image, name, size count,
│  │      ✅ Available        │    │     availability badge
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📷  Mayo Needle Holder  │    │
│  │      5 sizes · Art 03-28│    │
│  │      ✅ Available        │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📷  Mathieu Needle Hold.│    │
│  │      2 sizes · Art 03-31│    │
│  │      ⚠ Temp. Unavailable│    │
│  └─────────────────────────┘    │
│       ↕ pull-to-refresh         │
│                                 │
│  ── No more products ──        │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart(3) 📋Orders 👤Profile │
└─────────────────────────────────┘
```

**Filter & Sort Bottom Sheet (F-24) — opens on ⚙ icon tap:**
```
┌─────────────────────────────────┐
│  Filter & Sort                ✕ │
│─────────────────────────────────│
│                                 │
│  Specialty                      │
│  ┌──────┐ ┌──────┐ ┌────────┐  │
│  │Ortho │ │ ENT  │ │Gynae   │  │
│  └──────┘ └──────┘ └────────┘  │
│  ┌──────┐ ┌────────┐ ┌──────┐  │
│  │Neuro │ │Cardiac │ │General│  │
│  └──────┘ └────────┘ └──────┘  │
│  ┌──────────┐ ┌──────────────┐  │
│  │Urology   │ │ElectroSurg.  │  │
│  └──────────┘ └──────────────┘  │
│                                 │
│  Availability                   │
│  ○ All items                    │
│  ● In stock only                │
│                                 │
│  Sort by                        │
│  ○ Alphabetical (A–Z)          │
│  ○ Art No                       │
│  ○ Price (Low → High)           │
│                                 │
│  ┌──────────┐ ┌──────────────┐  │
│  │  Reset   │ │ Apply Filters│  │  ← Both in thumb zone
│  └──────────┘ └──────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 7: Product Detail — `/product/[id]`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Bozemann Knot Tier    📤   │  ← 📤 = Share on WhatsApp (FR-18)
│─────────────────────────────────│
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │     📷 Product Image    │    │  ← Image carousel (swipe)
│  │     (full 800px)        │    │
│  │                         │    │
│  │       ● ○ ○             │    │  ← Pagination dots
│  └─────────────────────────┘    │
│                                 │
│  Bozemann Knot Tier             │
│  Needle Holders & Suturing      │  ← Category breadcrumb
│                                 │
│  Description text if available  │
│  (many catalog items have       │
│  no description — nullable)     │
│                                 │
│  ── Available Sizes ──          │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Size    Art No    Price  │    │
│  │─────────────────────────│    │
│  │ 15cm    03-27-15  🔒    │    │  ← 🔒 = "Approval pending"
│  │ 6"      ⓘ copy   login │    │     (guest/pending doctor)
│  │                         │    │
│  │         [-] [2] [+]     │    │  ← Stepper + tappable number
│  │     ┌──────────────┐    │    │     for direct keypad entry
│  │     │  Add to Cart │    │    │
│  │     └──────────────┘    │    │
│  │─────────────────────────│    │
│  │ 18cm    03-27-18  ₹450  │    │  ← Approved doctor sees price
│  │ 7"      ⓘ copy         │    │
│  │    ✅ Available          │    │
│  │         [-] [1] [+]     │    │
│  │     ┌──────────────┐    │    │
│  │     │  Add to Cart │    │    │
│  │     └──────────────┘    │    │
│  │─────────────────────────│    │
│  │ 20cm    03-27-20  ₹520  │    │
│  │ 8"      ⓘ copy         │    │
│  │    ⚠ Temporarily Unavail│    │  ← Unavailable: stepper and
│  │    (greyed out stepper) │    │     Add to Cart disabled
│  └─────────────────────────┘    │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart(3) 📋Orders 👤Profile │
└─────────────────────────────────┘
```

**Interaction notes:**
- **Long-press Art No** → copies to clipboard with toast "Art No 03-27-15 copied".
- **Tap quantity number `[2]`** → opens numeric keypad for direct bulk entry.
- **Share icon (📤)** → generates `wa.me` deep-link: *"Check out Bozemann Knot Tier (Art No 03-27-15) from Speqtus Medical"*.
- **Price lock icon (🔒)** for guests shows "Login to see price" (tappable → login screen). For pending doctors shows "Approval pending".

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Medical          🔍 Search instruments...              🛒(3)  👤▾  │
│  Home > Needle Holders > Bozemann Knot Tier                                  │
│──────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  ┌──────────────────┐  ┌────────────────────────────────────────────────┐    │
│  │                  │  │  Bozemann Knot Tier                            │    │
│  │   📷 Product     │  │  Category: Needle Holders & Suturing          │    │
│  │   Image          │  │                                                │    │
│  │   (large)        │  │  Description text here...                      │    │
│  │                  │  │                                                │    │
│  │  ○ ● ○  thumbs   │  │  ┌────────────────────────────────────────┐    │    │
│  │                  │  │  │ Size   │ Art No   │ Price  │ Avail │Qty│    │    │
│  └──────────────────┘  │  │────────│──────────│────────│───────│───│    │    │
│                        │  │ 15cm   │ 03-27-15 │ ₹380   │  ✅   │[1]│    │    │
│                        │  │ 18cm   │ 03-27-18 │ ₹450   │  ✅   │[1]│    │    │
│                        │  │ 20cm   │ 03-27-20 │ ₹520   │  ⚠️   │ — │    │    │
│                        │  └────────────────────────────────────────┘    │    │
│                        │                                                │    │
│                        │  ┌──────────────────────────────────────┐      │    │
│                        │  │     Add Selected to Cart (2 items)   │      │    │
│                        │  └──────────────────────────────────────┘      │    │
│                        │                                                │    │
│                        │  📤 Share on WhatsApp                          │    │
│                        └────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 8: Search — `/(tabs)/search`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ┌──────────────────────── ✕ ┐  │
│  │ 🔍 sutur                  │  │  ← Auto-focus on tab switch
│  └───────────────────────────┘  │     Debounced 300ms
│                                 │
│  Recent Searches          Clear │  ← Shown when input empty
│  • needle holder                │
│  • 03-27                        │
│  • retractor                    │
│─────────────────────────────────│
│                                 │
│  Products (4 results)           │
│  ┌─────────────────────────┐    │
│  │ 📷  Suture Needle Holder│    │
│  │      3 sizes             │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📷  Suturing Forceps    │    │
│  │      2 sizes             │    │
│  └─────────────────────────┘    │
│                                 │
│  Art No Matches (1)             │  ← Separate section for
│  ┌─────────────────────────┐    │     Art No substring matches
│  │ 📷  Size 15cm            │    │
│  │      Art No: 03-27-15   │    │
│  │      Bozemann Knot Tier │    │
│  └─────────────────────────┘    │
│                                 │
│  ── or ──                       │
│                                 │
│  ┌─────────────────────────┐    │  ← Empty state (no results)
│  │  😔 No instruments found│    │
│  │  Try a different name   │    │
│  │  or Art No              │    │
│  │                         │    │
│  │  [Browse All Categories]│    │
│  └─────────────────────────┘    │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart(3) 📋Orders 👤Profile │
└─────────────────────────────────┘
```

---

### Screen 9: Cart — `/(tabs)/cart`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  Cart (5 items)      Clear Cart │  ← "Clear Cart" in header
│─────────────────────────────────│
│                                 │
│  ⚠ 1 item is out of stock      │  ← Out-of-stock warning banner
│  [Remove Unavailable Items]     │     with one-tap action
│                                 │
│  ── Needle Holders ──           │  ← Grouped by category
│                                 │
│  ┌─────────────────────────┐    │
│  │ 📷 Bozemann 15cm        │    │
│  │    Art: 03-27-15  ₹380  │    │
│  │    [-] [2] [+]    ₹760  │    │  ← Tap [2] for keypad
│  │                    🗑    │    │  ← Swipe or trash icon
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📷 Bozemann 18cm        │    │
│  │    Art: 03-27-18  ₹450  │    │
│  │    [-] [1] [+]    ₹450  │    │
│  │                    🗑    │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Scissors ──                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 📷 Mayo Scissors 17cm   │    │
│  │    Art: 04-05-17  ₹340  │    │
│  │    [-] [1] [+]    ₹340  │    │
│  │                    🗑    │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📷 Iris Scissors 11cm   │    │  ← Out of stock item
│  │    Art: 04-12-11  ₹—    │    │     (greyed, with badge)
│  │    ⛔ OUT OF STOCK       │    │
│  │                    🗑    │    │
│  └─────────────────────────┘    │
│                                 │
│═════════════════════════════════│
│  Subtotal (4 items)    ₹1,550  │  ← Sticky bottom summary
│  GST (estimated)         ₹279  │
│  ─────────────────────────────  │
│  Estimated Total       ₹1,829  │
│                                 │
│  ┌─────────────────────────┐    │
│  │   Proceed to Checkout → │    │  ← Primary CTA in thumb zone
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │   💾 Save as Set        │    │  ← FR-16: Save cart as named set
│  └─────────────────────────┘    │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart(3) 📋Orders 👤Profile │
└─────────────────────────────────┘
```

**"Clear Cart" Confirmation Modal (FR-6):**
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  🗑  Empty Cart?        │    │
│  │                         │    │
│  │  This will remove all   │    │
│  │  5 items from your      │    │
│  │  cart. This cannot be   │    │
│  │  undone.                │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │   Cancel         │    │    │  ← In thumb zone
│  │  └─────────────────┘    │    │
│  │  ┌─────────────────┐    │    │
│  │  │   Empty Cart  🔴│    │    │  ← Red destructive action
│  │  └─────────────────┘    │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Empty Cart State:**
```
┌─────────────────────────────────┐
│  Cart                           │
│─────────────────────────────────│
│                                 │
│                                 │
│                                 │
│         🛒                      │
│    Your cart is empty            │
│                                 │
│    Browse our catalog of        │
│    surgical instruments and     │
│    add items to get started.    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Explore Instruments →  │    │  ← Routes to category grid
│  └─────────────────────────┘    │
│                                 │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

---

### Screen 10: Checkout Review — `/checkout`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Review Order                │
│─────────────────────────────────│
│                                 │
│  ── Delivery Address ──         │
│  ┌─────────────────────────┐    │
│  │ 📍 Clinic (Default)     │    │
│  │ 201 Trade Center        │    │
│  │ Ahmedabad, GJ 380015   │    │
│  │               [Change ▸]│    │  ← Opens address picker
│  └─────────────────────────┘    │
│                                 │
│  ── Order Items (4) ──          │
│  ┌─────────────────────────┐    │
│  │ Bozemann 15cm ×2  ₹760 │    │
│  │ Bozemann 18cm ×1  ₹450 │    │
│  │ Mayo Scissors ×1  ₹340 │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Order Notes ──              │
│  ┌─────────────────────────┐    │
│  │ Need by Friday for OT   │    │  ← Free-text input
│  └─────────────────────────┘    │
│                                 │
│  ── Price Breakdown ──          │
│  Subtotal              ₹1,550  │
│  CGST (9%)               ₹139  │
│  SGST (9%)               ₹139  │
│  ─────────────────────────────  │
│  Grand Total           ₹1,829  │
│                                 │
│  ☑ I agree to the Terms of     │
│    Service                      │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Submit Order Request → │    │  ← Primary CTA, bottom zone
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Desktop — Side-by-Side Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Medical          🔍 Search instruments...              🛒(3)  👤▾  │
│  ← Back to Cart                                                             │
│──────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────┐      │
│  │  Review Your Order               │  │  Order Summary               │      │
│  │                                  │  │                              │      │
│  │  Delivery Address                │  │  Bozemann 15cm ×2    ₹760   │      │
│  │  ┌──────────────────────────┐    │  │  Bozemann 18cm ×1    ₹450   │      │
│  │  │ 📍 Clinic (Default)     │    │  │  Mayo Scissors ×1    ₹340   │      │
│  │  │ 201 Trade Center        │    │  │  ─────────────────────────── │      │
│  │  │ Ahmedabad, GJ 380015   │    │  │  Subtotal            ₹1,550 │      │
│  │  │          [Change ▸]     │    │  │  CGST (9%)             ₹139 │      │
│  │  └──────────────────────────┘    │  │  SGST (9%)             ₹139 │      │
│  │                                  │  │  ═════════════════════════  │      │
│  │  Order Notes                     │  │  Grand Total         ₹1,829│      │
│  │  ┌──────────────────────────┐    │  │                              │      │
│  │  │ Need by Friday for OT   │    │  │  ☑ I agree to Terms          │      │
│  │  └──────────────────────────┘    │  │                              │      │
│  │                                  │  │  ┌────────────────────────┐  │      │
│  │                                  │  │  │ Submit Order Request → │  │      │
│  │                                  │  │  └────────────────────────┘  │      │
│  └──────────────────────────────────┘  └──────────────────────────────┘      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 11: Order Success — `/checkout/success`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│           ✅                    │
│   Order Submitted!              │
│                                 │
│   Order # SPQ-2026-0042         │
│                                 │
│   We've received your request.  │
│   The Speqtus team will review  │
│   and confirm your order        │
│   shortly.                      │
│                                 │
│   Delivery to:                  │
│   📍 Clinic — 201 Trade Center │
│   Ahmedabad, GJ 380015         │
│                                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │  View Order Status →    │    │  ← Goes to Order Detail
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  Continue Shopping      │    │  ← Goes to Category Grid
│  └─────────────────────────┘    │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

---

### Screen 12: My Orders (List) — `/(tabs)/orders`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  My Orders              🔍     │
│─────────────────────────────────│
│  ┌────┐┌────┐┌────┐┌────┐┌────┐│
│  │All ││Req ││Conf││Disp││Delv││  ← Horizontal scroll tabs
│  └────┘└────┘└────┘└────┘└────┘│     (F-24 order filter tabs)
│                          ┌────┐│     + Cancelled (scrolls)
│                          │Canc││
│                          └────┘│
│─────────────────────────────────│
│  ┌─────────────────────────┐    │
│  │ SPQ-2026-0042           │    │
│  │ 22 Sep 2026 · 4 items   │    │
│  │ ₹1,829                  │    │
│  │ ● Requested        →    │    │  ← Gray badge
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ SPQ-2026-0041           │    │
│  │ 20 Sep 2026 · 2 items   │    │
│  │ ₹920                    │    │
│  │ ● Dispatched       →    │    │  ← Orange badge
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ SPQ-2026-0038           │    │
│  │ 15 Sep 2026 · 8 items   │    │
│  │ ₹4,200                  │    │
│  │ ● Delivered         →   │    │  ← Green badge
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ SPQ-2026-0035           │    │
│  │ 10 Sep 2026 · 1 item    │    │
│  │ ₹450                    │    │
│  │ ● Cancelled         →   │    │  ← Red badge
│  └─────────────────────────┘    │
│       ↕ pull-to-refresh         │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

---

### Screen 13: Order Detail — `/orders/[id]`

This is the most feature-dense doctor screen. Every action button must be clearly visible and in the thumb zone.

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Order SPQ-2026-0042        │
│─────────────────────────────────│
│                                 │
│  ── Status Timeline ──          │
│  ● Requested   22 Sep, 3:15pm  │
│  │                              │
│  ● Confirmed   22 Sep, 4:30pm  │  ← Status timeline with
│  │                              │     timestamps from
│  ○ Dispatched  (pending)       │     order_status_history
│  │                              │
│  ○ Delivered   (pending)       │
│                                 │
│  ── Delivery ──                 │
│  📍 Clinic — 201 Trade Center  │
│  Ahmedabad, GJ 380015          │
│                                 │
│  ── Items (4) ──                │
│  ┌─────────────────────────┐    │
│  │ Bozemann 15cm ×2  ₹760 │    │
│  │ Art: 03-27-15           │    │
│  │─────────────────────────│    │
│  │ Bozemann 18cm ×1  ₹450 │    │
│  │ Art: 03-27-18           │    │
│  │─────────────────────────│    │
│  │ Mayo Scissors ×1  ₹340 │    │
│  │ Art: 04-05-17           │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Price Breakdown ──          │
│  Subtotal              ₹1,550  │
│  GST                     ₹279  │
│  Grand Total           ₹1,829  │
│                                 │
│  Notes: "Need by Friday"       │
│                                 │
│  ── Fulfillment (F-16) ──      │  ← Only visible when dispatched
│  🚚 BlueDart · AWB 12345678   │
│  ┌─────────────────────────┐    │
│  │  📦 Track Shipment →    │    │  ← Opens carrier URL
│  └─────────────────────────┘    │
│                                 │
│  ── Invoice ──                  │  ← Only visible when uploaded
│  ┌─────────────────────────┐    │
│  │  📄 Download Invoice    │    │
│  └─────────────────────────┘    │
│                                 │
│═════════════════════════════════│  ← STICKY ACTION BAR (bottom)
│                                 │     ALL BUTTONS IN THUMB ZONE
│  ┌─────────────────────────┐    │
│  │  🔄 Reorder All Items   │    │  ← F-14: Always visible
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  ❌ Cancel Order         │    │  ← F-13: Red, only if
│  └─────────────────────────┘    │     status=requested/confirmed
│  ┌─────────────────────────┐    │
│  │  💬 Need Help? (WhatsApp)│   │  ← F-18: Pre-filled context
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Cancel Order Modal (F-13):**
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  ❌ Cancel Order         │    │
│  │  SPQ-2026-0042          │    │
│  │                         │    │
│  │  Reason for cancellation│    │
│  │  (required) *           │    │
│  │  ┌─────────────────┐    │    │
│  │  │ Select reason ▾ │    │    │
│  │  ├─────────────────┤    │    │
│  │  │ Wrong size/Art  │    │    │
│  │  │ Surgery postpone│    │    │
│  │  │ Duplicate order │    │    │
│  │  │ Price issue     │    │    │
│  │  │ Other           │    │    │
│  │  └─────────────────┘    │    │
│  │                         │    │
│  │  Additional notes       │    │
│  │  ┌─────────────────┐    │    │
│  │  │ (optional)      │    │    │
│  │  └─────────────────┘    │    │
│  │                         │    │
│  │  ┌────────┐┌──────────┐ │    │
│  │  │ Go Back││Cancel  🔴│ │    │  ← Thumb zone actions
│  │  └────────┘└──────────┘ │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 14: Profile & Settings — `/(tabs)/profile`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  Profile & Settings             │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │  👤  Dr. Mehul Patel    │    │
│  │  City Care Hospital     │    │
│  │  General Surgery        │    │
│  │  +91 98765 43210        │    │
│  │  Reg: GJ-12345          │    │
│  │              [Edit ✏]   │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Account ──                  │
│  ┌─────────────────────────┐    │
│  │ 📍 My Addresses      →  │    │
│  │─────────────────────────│    │
│  │ 💊 My Saved Sets     →  │    │  ← FR-16
│  │─────────────────────────│    │
│  │ 📋 Order History      →  │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Support ──                  │
│  ┌─────────────────────────┐    │
│  │ 💬 Contact Support    →  │    │  ← F-18
│  │─────────────────────────│    │
│  │ ❓ FAQ                →  │    │
│  │─────────────────────────│    │
│  │ 📜 Privacy Policy     →  │    │  ← F-20
│  │─────────────────────────│    │
│  │ 📜 Terms of Service   →  │    │
│  └─────────────────────────┘    │
│                                 │
│  ── App ──                      │
│  ┌─────────────────────────┐    │
│  │ Version 1.0.0 (42)      │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🔴 Log Out             │    │  ← F-19: RED, PROMINENT
│  └─────────────────────────┘    │     in thumb zone
│                                 │
│  ┌─────────────────────────┐    │
│  │  🗑 Delete Account      │    │  ← F-19: Secondary style,
│  └─────────────────────────┘    │     smaller, with warning
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

**Log Out Confirmation Modal (F-19):**
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  Log Out?               │    │
│  │                         │    │
│  │  Are you sure you want  │    │
│  │  to log out of Speqtus  │    │
│  │  Medical?               │    │
│  │                         │    │
│  │  Your cart will be      │    │
│  │  cleared from this      │    │
│  │  device.                │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │    Cancel        │    │    │
│  │  └─────────────────┘    │    │
│  │  ┌─────────────────┐    │    │
│  │  │    Log Out   🔴 │    │    │  ← Red destructive
│  │  └─────────────────┘    │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Delete Account Confirmation Modal (F-19, F-20):**

Required by Apple App Store Review Guideline 5.1.1(v). Multi-step: warning → re-authentication → final confirmation.
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  ⚠ Delete Your Account? │    │
│  │                         │    │
│  │  This will permanently  │    │
│  │  delete your Speqtus    │    │
│  │  Medical account and    │    │
│  │  all associated data:   │    │
│  │                         │    │
│  │  • Profile & addresses  │    │
│  │  • Cart & saved sets    │    │
│  │  • Consent records      │    │
│  │                         │    │
│  │  Order history will be  │    │
│  │  anonymized for audit   │    │
│  │  compliance.            │    │
│  │                         │    │
│  │  This cannot be undone. │    │
│  │                         │    │
│  │  To confirm, re-enter   │    │
│  │  your phone number:     │    │
│  │  ┌─────────────────┐    │    │
│  │  │ +91              │    │    │  ← Re-authentication
│  │  └─────────────────┘    │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │    Cancel        │    │    │
│  │  └─────────────────┘    │    │
│  │  ┌─────────────────┐    │    │
│  │  │ Delete Account 🔴│   │    │  ← Enabled only when
│  │  └─────────────────┘    │    │     phone matches
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 15: Edit Profile — `/profile/edit`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Edit Profile                │
│─────────────────────────────────│
│                                 │
│  Full Name *                    │
│  ┌─────────────────────────┐    │
│  │ Dr. Mehul Patel         │    │
│  └─────────────────────────┘    │
│                                 │
│  Hospital / Clinic Name *       │
│  ┌─────────────────────────┐    │
│  │ City Care Hospital      │    │
│  └─────────────────────────┘    │
│                                 │
│  Specialty                      │
│  ┌─────────────────────────┐    │
│  │ General Surgery     ▾   │    │  ← Dropdown: 12 tags
│  └─────────────────────────┘    │
│                                 │
│  Medical Reg. No.               │
│  ┌─────────────────────────┐    │
│  │ GJ-12345               │    │
│  └─────────────────────────┘    │
│                                 │
│  Phone (read-only)              │
│  ┌─────────────────────────┐    │
│  │ +91 98765 43210    🔒   │    │  ← Cannot change phone
│  └─────────────────────────┘    │     (auth identity)
│                                 │
│  Email (optional)               │
│  ┌─────────────────────────┐    │
│  │ dr.patel@citycare.com   │    │
│  └─────────────────────────┘    │
│                                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │   Save Changes →        │    │  ← Primary CTA in thumb zone
│  └─────────────────────────┘    │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

**Interaction notes:**
- "Save Changes" is disabled until at least one field is modified.
- Phone number is read-only (it's the auth identity; changing it requires re-verification).
- On save: updates `users` row, shows success toast, pops back to Profile screen.
- Desktop: same form rendered in the main content area (sidebar visible).

---

### Screen 16: My Addresses — `/profile/addresses`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  My Addresses                │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ 📍 Clinic ⭐ Default    │    │
│  │ City Care Hospital      │    │
│  │ 201 Trade Center        │    │
│  │ Ahmedabad, GJ 380015   │    │
│  │ Ph: 98765 43210         │    │
│  │         [Edit] [Delete] │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📍 Home                 │    │
│  │ 42 Satellite Road       │    │
│  │ Ahmedabad, GJ 380015   │    │
│  │ Ph: 98765 43210         │    │
│  │   [Set Default] [Edit]  │    │
│  │                [Delete] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │   + Add New Address     │    │  ← In thumb zone
│  └─────────────────────────┘    │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

---

### Screen 17: Add / Edit Address — `/profile/addresses/[id]`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Add New Address             │  ← or "Edit Address" when
│─────────────────────────────────│     editing existing
│                                 │
│  Label *                        │
│  ┌──────┐ ┌──────┐ ┌────────┐   │
│  │Clinic│ │  OT  │ │ Home   │   │  ← Quick-select chips
│  └──────┘ └──────┘ └────────┘   │     (or type custom)
│  ┌─────────────────────────┐    │
│  │ Clinic                  │    │
│  └─────────────────────────┘    │
│                                 │
│  Hospital / Clinic Name         │
│  ┌─────────────────────────┐    │
│  │ City Care Hospital      │    │
│  └─────────────────────────┘    │
│                                 │
│  Address Line 1 *               │
│  ┌─────────────────────────┐    │
│  │ 201, Trade Center       │    │
│  └─────────────────────────┘    │
│                                 │
│  Address Line 2                 │
│  ┌─────────────────────────┐    │
│  │ Near SG Highway         │    │
│  └─────────────────────────┘    │
│                                 │
│  City *            State *      │
│  ┌───────────┐ ┌───────────┐    │
│  │ Ahmedabad │ │ Gujarat ▾ │    │  ← State dropdown
│  └───────────┘ └───────────┘    │
│                                 │
│  PIN Code *     Contact Phone   │
│  ┌───────────┐ ┌───────────┐    │
│  │ 380015    │ │ 9876543210│    │  ← Numeric keypad
│  └───────────┘ └───────────┘    │
│                                 │
│  ☐ Set as default address       │  ← Toggle (pre-checked if
│                                 │     first address)
│                                 │
│  ┌─────────────────────────┐    │
│  │   Save Address →        │    │  ← Primary CTA in thumb zone
│  └─────────────────────────┘    │
│                                 │
│  (Edit mode only:)              │
│  ┌─────────────────────────┐    │
│  │   🗑 Delete Address      │    │  ← Red text button with
│  └─────────────────────────┘    │     confirmation alert
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

**Interaction notes:**
- PIN code field is 6 digits, auto-lookup for city/state (if API available).
- "Save Address" validates all required fields via Zod schema.
- On save: upserts `addresses` row, shows success toast, pops back to My Addresses list.
- If "Set as default" is toggled on, clears `is_default` on all other addresses first.

---

### Screen 18: My Saved Sets — `/sets`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  My Saved Sets               │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ 💊 Minor OT Set         │    │
│  │ 8 items · Created 15 Sep│    │
│  │                         │    │
│  │ ┌─────────┐ ┌─────────┐ │    │
│  │ │Add to   │ │ Edit  ✏│ │    │
│  │ │Cart  🛒 │ │         │ │    │  ← Quick actions
│  │ └─────────┘ └─────────┘ │    │     in thumb zone
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 💊 ENT Tray             │    │
│  │ 5 items · Created 10 Sep│    │
│  │                         │    │
│  │ ┌─────────┐ ┌─────────┐ │    │
│  │ │Add to   │ │ Edit  ✏│ │    │
│  │ │Cart  🛒 │ │         │ │    │
│  │ └─────────┘ └─────────┘ │    │
│  └─────────────────────────┘    │
│                                 │
│  No more sets.                  │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

---

### Screen 19: Edit Saved Set — `/sets/[id]`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Edit: Minor OT Set     🗑  │  ← 🗑 = Delete entire set
│─────────────────────────────────│
│                                 │
│  Set Name                       │
│  ┌─────────────────────────┐    │
│  │ Minor OT Set            │    │  ← Editable name
│  └─────────────────────────┘    │
│                                 │
│  ── Items (8) ──                │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 📷 Bozemann 15cm        │    │
│  │    Art: 03-27-15  ₹380  │    │
│  │    [-] [2] [+]     🗑   │    │  ← Qty stepper + remove
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📷 Mayo Scissors 17cm   │    │
│  │    Art: 04-05-17  ₹340  │    │
│  │    [-] [1] [+]     🗑   │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 📷 Iris Scissors 11cm   │    │
│  │    Art: 04-12-11        │    │
│  │    ⛔ DISCONTINUED       │    │  ← Unavailable item
│  │    (remove recommended) │    │     flagged visually
│  │                    🗑   │    │
│  └─────────────────────────┘    │
│  ... (more items scroll)        │
│                                 │
│  ┌─────────────────────────┐    │
│  │   + Add Items from      │    │  ← Routes to catalog
│  │     Catalog              │    │     with "add to set" mode
│  └─────────────────────────┘    │
│                                 │
│═════════════════════════════════│
│  ┌─────────────────────────┐    │
│  │   Save Set Changes →    │    │  ← Primary CTA in thumb zone
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │   🛒 Add Set to Cart    │    │  ← Secondary action
│  └─────────────────────────┘    │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

**Interaction notes:**
- Changes to the set do NOT affect any past orders that used this set.
- Discontinued/unavailable items are visually flagged with a removal suggestion.
- "Add Items from Catalog" opens catalog in a special selection mode where "Add to Cart" becomes "Add to Set".
- "Delete Set" (trash icon) triggers confirmation: "Delete 'Minor OT Set'? This won't affect past orders."

---

### Screen 20: Contact & FAQ — `/support`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  ←  Help & Support              │
│─────────────────────────────────│
│                                 │
│  ── Contact Us ──               │
│  ┌─────────────────────────┐    │
│  │ 💬 WhatsApp             │    │  ← Opens wa.me link
│  │    Chat with Speqtus    │    │
│  │─────────────────────────│    │
│  │ 📞 Call Us              │    │  ← tel: link
│  │    +91 98765 43210      │    │
│  │─────────────────────────│    │
│  │ ✉  Email                │    │  ← mailto: link
│  │    orders@speqtus.com   │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Frequently Asked ──         │
│  ┌─────────────────────────┐    │
│  │ ▸ How do I place an     │    │  ← Expandable FAQ items
│  │   order?                │    │
│  │─────────────────────────│    │
│  │ ▸ How long does         │    │
│  │   delivery take?        │    │
│  │─────────────────────────│    │
│  │ ▸ Can I cancel my       │    │
│  │   order?                │    │
│  │─────────────────────────│    │
│  │ ▸ How do I track my     │    │
│  │   shipment?             │    │
│  │─────────────────────────│    │
│  │ ▸ I need to return      │    │
│  │   an item               │    │
│  └─────────────────────────┘    │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 🏠Home  🔍Search 🛒Cart  📋Orders 👤Profile │
└─────────────────────────────────┘
```

---

## SECTION C: ADMIN SCREENS (Desktop-First)

---

### Screen 28: Admin Dashboard — `/admin`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │                                                    │    │
│  │  📊 Dashboard│  │  Dashboard Overview                               │    │
│  │  ──────────  │  │                                                    │    │
│  │  👥 Approvals│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │    │
│  │     (3 new)  │  │  │  3     │ │  12    │ │  47    │ │ ₹82K   │      │    │
│  │  👨‍⚕ Doctors  │  │  │Pending │ │Active  │ │Orders  │ │Revenue │      │    │
│  │  📋 Orders   │  │  │Doctors │ │Orders  │ │(Month) │ │(Month) │      │    │
│  │     (12 new) │  │  └────────┘ └────────┘ └────────┘ └────────┘      │    │
│  │  📦 Products │  │                                                    │    │
│  │  📊 Export   │  │  Recent Orders                    [View All →]     │    │
│  │  🔄 Sync     │  │  ┌─────────────────────────────────────────────┐   │    │
│  │              │  │  │ Order#     │Doctor     │Total  │Status     │   │    │
│  │              │  │  │────────────│───────────│───────│───────────│   │    │
│  │              │  │  │ SPQ-0042   │Dr.Patel   │₹1,829│● Requested│   │    │
│  │              │  │  │ SPQ-0041   │Dr.Shah    │₹920  │● Confirmed│   │    │
│  │              │  │  │ SPQ-0040   │Dr.Mehta   │₹3,400│● Dispatched│  │    │
│  │              │  │  └─────────────────────────────────────────────┘   │    │
│  │              │  │                                                    │    │
│  │              │  │  Pending Approvals                [View All →]     │    │
│  │              │  │  ┌─────────────────────────────────────────────┐   │    │
│  │              │  │  │ Dr. Anil Kumar · Gujarat ENT Hospital      │   │    │
│  │              │  │  │ Submitted 22 Sep · Ph: +91 99887 76655     │   │    │
│  │              │  │  │                   [Approve ✅] [Reject ❌]  │   │    │
│  │              │  │  └─────────────────────────────────────────────┘   │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 21: Admin — Pending Approvals — `/admin/approvals`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │  Pending Doctor Approvals (3)                      │    │
│  │  📊 Dashboard│  │                                                    │    │
│  │  👥 Approvals│  │  ┌─────────────────────────────────────────────────┐│   │
│  │  ◀ active    │  │  │Name          │Hospital     │Phone      │Reg No ││   │
│  │  👨‍⚕ Doctors  │  │  │──────────────│─────────────│───────────│───────││   │
│  │  📋 Orders   │  │  │Dr. Anil Kumar│Gujarat ENT  │9988776655 │GJ-442 ││   │
│  │  📦 Products │  │  │              │Hospital     │           │       ││   │
│  │  📊 Export   │  │  │  Submitted: 22 Sep 2026                        ││   │
│  │  🔄 Sync     │  │  │  Specialty: ENT                                ││   │
│  │              │  │  │  Address: 15 Main Rd, Surat, GJ 395001        ││   │
│  │              │  │  │                                                 ││   │
│  │              │  │  │  Note (optional):                               ││   │
│  │              │  │  │  ┌──────────────────────────────────────┐       ││   │
│  │              │  │  │  │                                      │       ││   │
│  │              │  │  │  └──────────────────────────────────────┘       ││   │
│  │              │  │  │                                                 ││   │
│  │              │  │  │        [Approve ✅ Doctor]  [Reject ❌]         ││   │
│  │              │  │  └─────────────────────────────────────────────────┘│   │
│  │              │  │                                                    │    │
│  │              │  │  (next doctor card...)                              │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 24: Admin — Orders — `/admin/orders`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │  Order Management                  [📊 Export CSV] │    │
│  │  📊 Dashboard│  │                                                    │    │
│  │  👥 Approvals│  │  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐             │    │
│  │  👨‍⚕ Doctors  │  │  │All ││Req ││Conf││Disp││Delv││Canc│             │    │
│  │  📋 Orders   │  │  └────┘└────┘└────┘└────┘└────┘└────┘             │    │
│  │  ◀ active    │  │                                                    │    │
│  │  📦 Products │  │  🔍 Search by order#, doctor name...               │    │
│  │  📊 Export   │  │  📅 Date range: [This Month ▾]                     │    │
│  │  🔄 Sync     │  │                                                    │    │
│  │              │  │  ┌───────────────────────────────────────────────┐  │    │
│  │              │  │  │Order#    │Date     │Doctor    │Total │Status  │  │    │
│  │              │  │  │──────────│─────────│──────────│──────│────────│  │    │
│  │              │  │  │SPQ-0042  │22 Sep   │Dr.Patel  │₹1829 │●Reqstd │  │    │
│  │              │  │  │SPQ-0041  │20 Sep   │Dr.Shah   │₹920  │●Confmd │  │    │
│  │              │  │  │SPQ-0040  │18 Sep   │Dr.Mehta  │₹3400 │●Dispatd│  │    │
│  │              │  │  │SPQ-0039  │15 Sep   │Dr.Kumar  │₹1200 │●Delivrd│  │    │
│  │              │  │  │SPQ-0038  │14 Sep   │Dr.Patel  │₹4200 │●Delivrd│  │    │
│  │              │  │  │SPQ-0035  │10 Sep   │Dr.Shah   │₹450  │●Cancel │  │    │
│  │              │  │  └───────────────────────────────────────────────┘  │    │
│  │              │  │  Showing 1-6 of 47 orders         [← 1 2 3 ... →] │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 25: Admin — Order Detail — `/admin/orders/[id]`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │  ← Back   Order SPQ-2026-0042   ● Requested       │    │
│  │  (sidebar)   │  │──────────────────────────────────────────────────  │    │
│  │              │  │                                                    │    │
│  │              │  │  Doctor: Dr. Mehul Patel · City Care Hospital      │    │
│  │              │  │  Phone: +91 98765 43210                           │    │
│  │              │  │  Delivery: 201 Trade Center, Ahmedabad, GJ 380015│    │
│  │              │  │  Notes: "Need by Friday for OT"                   │    │
│  │              │  │                                                    │    │
│  │              │  │  ┌───────────────────────────────────────────────┐  │    │
│  │              │  │  │Item          │ArtNo   │Qty│Unit Price│Line   │  │    │
│  │              │  │  │─────────────│────────│───│──────────│───────│  │    │
│  │              │  │  │Bozemann 15cm│03-27-15│ 2 │ ₹[380]   │ ₹760 │  │    │
│  │              │  │  │Bozemann 18cm│03-27-18│ 1 │ ₹[450]   │ ₹450 │  │    │
│  │              │  │  │Mayo Scissors│04-05-17│ 1 │ ₹[340]   │ ₹340 │  │    │
│  │              │  │  │─────────────│────────│───│──────────│───────│  │    │
│  │              │  │  │             │        │   │ Subtotal │₹1,550│  │    │
│  │              │  │  │             │        │   │ GST      │  ₹279│  │    │
│  │              │  │  │             │        │   │ TOTAL    │₹1,829│  │    │
│  │              │  │  └───────────────────────────────────────────────┘  │    │
│  │              │  │  ↑ [380] = inline editable while status=requested  │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Actions ──                                      │    │
│  │              │  │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │    │
│  │              │  │  │Confirm ✅│ │Cancel  ❌│ │Upload Invoice 📄│   │    │
│  │              │  │  └──────────┘ └──────────┘ └───────────────────┘   │    │
│  │              │  │                                                    │    │
│  │              │  │  (After confirmed, shows:)                         │    │
│  │              │  │  ┌────────────────────────┐ ┌──────────────────┐   │    │
│  │              │  │  │Dispatch 🚚 (open modal)│ │Cancel  ❌        │   │    │
│  │              │  │  └────────────────────────┘ └──────────────────┘   │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Status History ──                               │    │
│  │              │  │  • Requested  22 Sep 3:15pm  by Dr. Patel          │    │
│  │              │  │  • Confirmed  22 Sep 4:30pm  by Admin              │    │
│  │              │  │                                                    │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Dispatch Fulfillment Modal (F-16):**
```
┌─────────────────────────────────────────┐
│  🚚 Dispatch Order SPQ-2026-0042       │
│─────────────────────────────────────────│
│                                         │
│  Courier / Delivery Partner *           │
│  ┌─────────────────────────────────┐    │
│  │ BlueDart                    ▾   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Tracking / Consignment Number *        │
│  ┌─────────────────────────────────┐    │
│  │ 12345678901                     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Tracking URL (auto-filled)             │
│  ┌─────────────────────────────────┐    │
│  │ https://bluedart.com/track/...  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Dispatch Notes (optional)              │
│  ┌─────────────────────────────────┐    │
│  │ Packed in 2 boxes               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────┐ ┌────────────────────┐    │
│  │  Cancel   │ │  Mark Dispatched  │    │
│  └──────────┘ └────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

### Screen 26: Admin — Products & Pricing — `/admin/products`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │  Products & Pricing          [🔄 Sync from Sheet] │    │
│  │  (sidebar)   │  │                                                    │    │
│  │              │  │  🔍 Search products or Art No...                    │    │
│  │              │  │  Category: [All ▾]  Status: [Active ▾]             │    │
│  │              │  │                                                    │    │
│  │              │  │  ┌───────────────────────────────────────────────┐  │    │
│  │              │  │  │Product    │Art No  │Size  │Price │Avail│Active│  │    │
│  │              │  │  │───────────│────────│──────│──────│─────│──────│  │    │
│  │              │  │  │Bozemann  │03-27-15│15cm  │₹[380]│ ✅  │  ☑  │  │    │
│  │              │  │  │Knot Tier │03-27-18│18cm  │₹[450]│ ✅  │  ☑  │  │    │
│  │              │  │  │          │03-27-20│20cm  │₹[520]│ ⚠   │  ☑  │  │    │
│  │              │  │  │───────────│────────│──────│──────│─────│──────│  │    │
│  │              │  │  │Mayo Needle│03-28-14│14cm  │₹[280]│ ✅  │  ☑  │  │    │
│  │              │  │  │Holder    │03-28-16│16cm  │₹[320]│ ✅  │  ☑  │  │    │
│  │              │  │  │          │03-28-18│18cm  │₹[—]  │ ✅  │  ☑  │  │    │
│  │              │  │  └───────────────────────────────────────────────┘  │    │
│  │              │  │                                                    │    │
│  │              │  │  ₹[380] = click to edit price inline               │    │
│  │              │  │  ₹[—]   = no price set (doctors see lock icon)     │    │
│  │              │  │  ⚠      = click dropdown to change availability    │    │
│  │              │  │  ☑      = toggle active/inactive                   │    │
│  │              │  │                                                    │    │
│  │              │  │  Showing 1-20 of 412 variants      [← 1 2 ... →]  │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 22: Admin — Doctor Directory — `/admin/doctors`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │  Doctor Directory (42 total)                       │    │
│  │  (sidebar)   │  │                                                    │    │
│  │              │  │  🔍 Search by name, phone, or hospital...          │    │
│  │              │  │  Status: [All ▾]                                   │    │
│  │              │  │                                                    │    │
│  │              │  │  ┌───────────────────────────────────────────────┐  │    │
│  │              │  │  │Name         │Hospital    │Orders│Joined│Status│  │    │
│  │              │  │  │─────────────│────────────│──────│──────│──────│  │    │
│  │              │  │  │Dr.Patel     │City Care   │  12  │15 Aug│ ✅   │  │    │
│  │              │  │  │Dr.Shah      │Apollo      │   8  │20 Aug│ ✅   │  │    │
│  │              │  │  │Dr.Kumar     │Gujarat ENT │   0  │22 Sep│ ⏳   │  │    │
│  │              │  │  │Dr.Verma     │Lifeline    │   0  │12 Sep│ ❌   │  │    │
│  │              │  │  └───────────────────────────────────────────────┘  │    │
│  │              │  │                                                    │    │
│  │              │  │  Click row to view full doctor profile, addresses, │    │
│  │              │  │  order history, and suspend/reactivate controls.   │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 23: Admin — Doctor Profile — `/admin/doctors/[id]`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │  ← Back   Dr. Mehul Patel              ● Approved │    │
│  │  (sidebar)   │  │──────────────────────────────────────────────────  │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Doctor Information ──                           │    │
│  │              │  │  ┌────────────────────────────────────────────────┐ │    │
│  │              │  │  │ Full Name       │ Dr. Mehul Patel              │ │    │
│  │              │  │  │ Phone           │ +91 98765 43210              │ │    │
│  │              │  │  │ Hospital/Clinic │ City Care Hospital           │ │    │
│  │              │  │  │ Specialty       │ General Surgery              │ │    │
│  │              │  │  │ Medical Reg. No │ GJ-12345                     │ │    │
│  │              │  │  │ Joined          │ 15 Aug 2026                  │ │    │
│  │              │  │  │ Approved By     │ Admin · 16 Aug 2026, 2:30pm │ │    │
│  │              │  │  │ Status          │ ● Approved                   │ │    │
│  │              │  │  └────────────────────────────────────────────────┘ │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Addresses (2) ──                                │    │
│  │              │  │  ┌────────────────────────────────────────────────┐ │    │
│  │              │  │  │ 📍 Clinic (Default)                            │ │    │
│  │              │  │  │ 201 Trade Center, Ahmedabad, GJ 380015        │ │    │
│  │              │  │  │────────────────────────────────────────────────│ │    │
│  │              │  │  │ 📍 Home                                        │ │    │
│  │              │  │  │ 42 Satellite Road, Ahmedabad, GJ 380015       │ │    │
│  │              │  │  └────────────────────────────────────────────────┘ │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Order History (12 orders · ₹28,450 total) ──   │    │
│  │              │  │  ┌───────────────────────────────────────────────┐  │    │
│  │              │  │  │Order#    │Date     │Total  │Status            │  │    │
│  │              │  │  │──────────│─────────│───────│──────────────────│  │    │
│  │              │  │  │SPQ-0042  │22 Sep   │₹1,829 │● Requested       │  │    │
│  │              │  │  │SPQ-0038  │15 Sep   │₹4,200 │● Delivered       │  │    │
│  │              │  │  │SPQ-0031  │02 Sep   │₹2,100 │● Delivered       │  │    │
│  │              │  │  └───────────────────────────────────────────────┘  │    │
│  │              │  │  [View All Orders →]                                │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Account Actions ──                              │    │
│  │              │  │  ┌──────────────────┐ ┌────────────────────┐        │    │
│  │              │  │  │ Suspend Account  │ │ Re-review Profile │        │    │
│  │              │  │  └──────────────────┘ └────────────────────┘        │    │
│  │              │  │                                                    │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Interaction notes:**
- "Suspend Account" sets `approval_status = 'suspended'`; doctor loses price visibility and ordering. Triggers notification.
- "Re-review Profile" changes status to `'pending'` and adds the doctor back to the approval queue.
- Order history shows the 5 most recent orders; "View All Orders" links to the admin orders list pre-filtered by this doctor.
- For rejected doctors: "Suspend" button is replaced with "Approve ✅" and "Delete Account" buttons.

---

### Screen 27: Admin — Sync & Logs — `/admin/sync`

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SPEQTUS Admin                                               👤 Admin ▾     │
│──────────────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐    │
│  │              │  │  Catalog Sync & Logs                               │    │
│  │  (sidebar)   │  │                                                    │    │
│  │              │  │  ── Last Sync ──                                    │    │
│  │              │  │  ┌────────────────────────────────────────────────┐ │    │
│  │              │  │  │ Status:   ✅ Completed                         │ │    │
│  │              │  │  │ Time:     22 Sep 2026, 2:00 AM (auto)          │ │    │
│  │              │  │  │ Duration: 12.4 seconds                         │ │    │
│  │              │  │  │ Products: 412 variants across 24 categories    │ │    │
│  │              │  │  │ Upserted: 3 new · 7 updated · 0 deactivated   │ │    │
│  │              │  │  │ Errors:   0                                    │ │    │
│  │              │  │  └────────────────────────────────────────────────┘ │    │
│  │              │  │                                                    │    │
│  │              │  │  ┌────────────────────────┐                         │    │
│  │              │  │  │ 🔄 Trigger Manual Sync │                         │    │
│  │              │  │  └────────────────────────┘                         │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Sync History (Last 30 Days) ──                  │    │
│  │              │  │  ┌───────────────────────────────────────────────┐  │    │
│  │              │  │  │Date & Time       │Status │New│Updated│Errors │  │    │
│  │              │  │  │──────────────────│───────│───│───────│───────│  │    │
│  │              │  │  │22 Sep, 2:00 AM   │ ✅    │ 3 │   7   │   0   │  │    │
│  │              │  │  │21 Sep, 2:00 AM   │ ✅    │ 0 │   2   │   0   │  │    │
│  │              │  │  │20 Sep, 2:00 AM   │ ⚠     │ 1 │   0   │   2   │  │    │
│  │              │  │  │19 Sep, 11:30 AM  │ ✅    │ 5 │  12   │   0   │  │    │
│  │              │  │  │                  │(manual)│   │       │       │  │    │
│  │              │  │  └───────────────────────────────────────────────┘  │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Error Log (click row above to view) ──          │    │
│  │              │  │  ┌───────────────────────────────────────────────┐  │    │
│  │              │  │  │ 20 Sep sync: 2 errors                        │  │    │
│  │              │  │  │────────────────────────────────────────────── │  │    │
│  │              │  │  │ ⚠ Row 45: Duplicate Art No "03-27-15"        │  │    │
│  │              │  │  │   found in rows 45 and 112. Skipped row 112. │  │    │
│  │              │  │  │ ⚠ Row 89: Missing required field "ArtNo".    │  │    │
│  │              │  │  │   Product "Unnamed" in category "Scissors"   │  │    │
│  │              │  │  │   skipped.                                    │  │    │
│  │              │  │  └───────────────────────────────────────────────┘  │    │
│  │              │  │                                                    │    │
│  │              │  │  ── Google Sheet Source ──                          │    │
│  │              │  │  📄 Master Catalog Sheet                           │    │
│  │              │  │  [Open in Google Sheets →]                          │    │
│  │              │  │                                                    │    │
│  └──────────────┘  └────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Interaction notes:**
- "Trigger Manual Sync" shows a progress spinner and live status. Disables button until complete.
- Clicking a sync history row with errors expands the error log below.
- Sync errors are color-coded: red for fatal (sync aborted), amber for row-level skips.
- "Open in Google Sheets" links to the master catalog spreadsheet for manual review.

---

## SECTION D: GLOBAL OVERLAYS & CROSS-CUTTING UI

---

### Offline Banner (F-27) — Global Overlay
```
┌─────────────────────────────────┐
│ ⚠ No Internet Connection       │  ← Floating top banner
│   Reconnecting...               │     Non-blocking
└─────────────────────────────────┘
```
Appears over any screen. Disappears automatically when network restored.

### Notification Permission Request (FR-15)
Shown once after profile completion:
```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐    │
│  │  🔔 Stay Updated        │    │
│  │                         │    │
│  │  Get notified when your │    │
│  │  order is confirmed,    │    │
│  │  dispatched, or         │    │
│  │  delivered.             │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │  Enable Alerts   │    │    │
│  │  └─────────────────┘    │    │
│  │  ┌─────────────────┐    │    │
│  │  │  Not Now         │    │    │
│  │  └─────────────────┘    │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Rejected / Suspended Account Screen (FR-9, FR-4a)

Shown to doctors whose `approval_status` is `rejected` or `suspended`. They cannot see a blank pending banner forever.

**Mobile Layout:**
```
┌─────────────────────────────────┐
│  SPEQTUS Medical                │
│─────────────────────────────────│
│                                 │
│                                 │
│         ⚠                       │
│  Account Not Approved           │  ← For rejected doctors
│                                 │
│  Your registration was not      │
│  approved at this time.         │
│                                 │
│  If you believe this is an      │
│  error, please contact          │
│  Speqtus support:               │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 📞 Call Speqtus Support │    │  ← tel: link
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 💬 WhatsApp Support     │    │  ← wa.me link
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🔴 Log Out              │    │  ← Always accessible
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Interaction notes:**
- Doctors with `rejected` status are routed here instead of the Catalog.
- Doctors with `suspended` status see a slightly different message: "Your account has been temporarily suspended."
- The screen always provides a way to contact support and log out — no dead-end.

### "Save Cart as Set" Modal (FR-16)

Triggered by the "Save as Set" button on the Cart screen (Screen 9).
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  💾 Save Cart as Set    │    │
│  │                         │    │
│  │  Give your set a name   │    │
│  │  so you can quickly     │    │
│  │  reorder later.         │    │
│  │                         │    │
│  │  Set Name *             │    │
│  │  ┌─────────────────┐    │    │
│  │  │ Minor OT Set     │    │    │  ← Auto-focused
│  │  └─────────────────┘    │    │
│  │                         │    │
│  │  5 items will be saved  │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │    Cancel        │    │    │
│  │  └─────────────────┘    │    │
│  │  ┌─────────────────┐    │    │
│  │  │    Save Set  💾  │    │    │  ← Disabled until
│  │  └─────────────────┘    │    │     name entered
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### Reorder Availability Modal (F-14)

Triggered by "Reorder All Items" when some items have changed since the original order.
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  🔄 Reorder Review      │    │
│  │                         │    │
│  │  Some items from Order  │    │
│  │  SPQ-2026-0038 have     │    │
│  │  changed:               │    │
│  │                         │    │
│  │  ⚠ Price changed:       │    │
│  │  • Bozemann 15cm        │    │
│  │    ₹380 → ₹420          │    │
│  │                         │    │
│  │  ❌ Unavailable:         │    │
│  │  • Iris Scissors 11cm   │    │
│  │    (Discontinued)       │    │
│  │                         │    │
│  │  ✅ Available (6 items): │    │
│  │  Will be added to cart  │    │
│  │  at current prices.     │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │    Cancel        │    │    │
│  │  └─────────────────┘    │    │
│  │  ┌─────────────────┐    │    │
│  │  │ Add Available    │    │    │  ← Adds 6 items to cart
│  │  │ to Cart (6) →   │    │    │
│  │  └─────────────────┘    │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### Address Picker Bottom Sheet (F-11, F-12)

Triggered by "[Change ▸]" on the Checkout Review screen (Screen 10).
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  Select Delivery Address│    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │ ● 📍 Clinic      │    │    │  ← Radio selection
│  │  │   City Care      │    │    │     ● = currently
│  │  │   201 Trade Ctr  │    │    │     selected
│  │  │   Ahmedabad      │    │    │
│  │  └─────────────────┘    │    │
│  │  ┌─────────────────┐    │    │
│  │  │ ○ 📍 Home        │    │    │
│  │  │   42 Satellite   │    │    │
│  │  │   Road           │    │    │
│  │  │   Ahmedabad      │    │    │
│  │  └─────────────────┘    │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │ + Add New Address│    │    │  ← Routes to Screen 17
│  │  └─────────────────┘    │    │
│  │                         │    │
│  │  ┌─────────────────┐    │    │
│  │  │    Confirm →     │    │    │
│  │  └─────────────────┘    │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### Admin Order Export Modal (F-25)

Triggered by "📊 Export CSV" on the Admin Orders screen (Screen 24).
```
┌─────────────────────────────────────────┐
│  📊 Export Orders                      │
│─────────────────────────────────────────│
│                                         │
│  Date Range *                           │
│  ┌───────────────┐ ┌───────────────┐    │
│  │ From: 01 Sep  │ │ To: 22 Sep    │    │
│  └───────────────┘ └───────────────┘    │
│                                         │
│  Quick Select:                          │
│  ┌──────┐ ┌──────────┐ ┌──────────┐     │
│  │Today │ │This Week │ │This Month│     │
│  └──────┘ └──────────┘ └──────────┘     │
│                                         │
│  Status Filter:                         │
│  ☑ Requested  ☑ Confirmed               │
│  ☑ Dispatched ☑ Delivered               │
│  ☐ Cancelled                            │
│                                         │
│  Format:                                │
│  ● CSV (.csv)                           │
│  ○ Excel (.xlsx)                        │
│                                         │
│  ┌──────────┐ ┌────────────────────┐    │
│  │  Cancel   │ │  Download Export  │    │
│  └──────────┘ └────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## SECTION E: RESPONSIVE BREAKPOINT SUMMARY

| Breakpoint | Target | Navigation | Grid | Layout Pattern |
|------------|--------|-----------|------|----------------|
| `<640px` | Phone (portrait) | Bottom tabs | 2 columns | Single-column content, sticky bottom actions |
| `640–1023px` | Tablet / Phone landscape | Bottom tabs | 3 columns | Slightly wider cards, same flow |
| `≥1024px` | Desktop browser | Sidebar nav | 4 columns | Side-by-side layouts (checkout, product detail), data tables |
| `≥1440px` | Large desktop | Sidebar + max-width container | 4–5 columns | Centered content container with generous whitespace |

**Key desktop-specific differences:**
- Bottom tab bar → Left sidebar navigation.
- Cart badge moves to persistent top header.
- Search bar always visible in top header (not a separate tab).
- Checkout uses two-column layout (form left, summary right).
- Product detail uses two-column layout (image left, info/variants right).
- Admin screens use full data tables with inline editing (not card stacks).
- Hover states on all interactive elements.
- No swipe-to-delete; use explicit trash icon buttons instead.

---

## SECTION F: ACCESSIBILITY CHECKLIST (F-7)

Applied to every screen above:
- [ ] All tap targets ≥ 44×44pt.
- [ ] Status badges use color + text + icon (not color alone).
- [ ] All images have `accessibilityLabel`.
- [ ] Form inputs have visible labels (not placeholder-only).
- [ ] Destructive buttons use red color AND explicit text ("Cancel Order", not just a red icon).
- [ ] Modals are dismissible via backdrop tap AND a visible close button.
- [ ] Dynamic type support: text scales with system font size preference.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-09-22 | Initial wireframe specification covering 28 screens, 10 modals, all 50 features mapped, mobile thumb-zone ergonomics, desktop sidebar layouts, and responsive breakpoints | Assistant |
| 2026-09-22 | **Audit fix:** Added 6 missing screens (Screen 3: Google OAuth, Screen 15: Edit Profile, Screen 17: Add/Edit Address, Screen 19: Edit Saved Set, Screen 23: Admin Doctor Profile, Screen 27: Admin Sync & Logs) and 6 missing modals/overlays (Delete Account, Save as Set, Reorder Availability, Address Picker, Order Export, Rejected Account Banner) | Assistant |

---

*This wireframe spec is the visual companion to FEATURES.md (what to build) and TASKS.md (how to build it). Reference screen numbers (e.g. "Screen 13: Order Detail") when discussing UI implementation.*
