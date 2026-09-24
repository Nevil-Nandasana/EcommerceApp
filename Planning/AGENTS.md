# AGENTS.md — Project Rules for AI Coding Agents

This file is read by Antigravity, Cursor, Claude Code, and other AGENTS.md-compatible tools before every task. Rules here apply to all work in this repository. The full product spec lives in `PRD_Speqtus_Ordering_App.md` — read it before starting any feature work. This file is the "how," the PRD is the "what."

If a rule here and the PRD conflict, the PRD wins on product behavior; this file wins on code style and process. If a task requires breaking a rule below, stop and ask rather than proceeding.

---

## Project overview

- **Name:** Speqtus Medical Ordering Platform
- **Type:** Cross-platform app (Android, iOS, Web) with a shared backend
- **Stage:** Greenfield / pre-MVP
- **Owner:** Nevil (non-technical client-facing role: Speqtus Medical, a surgical instrument manufacturer)
- **Users:** Doctors and clinic staff (customers), one Speqtus admin (owner)
- **Full spec:** `PRD_Speqtus_Ordering_App.md` — always check this first for feature scope, data model, and acceptance criteria

## Tech stack (do not substitute without asking)

- **Client:** Expo (React Native + TypeScript), Expo Router — single codebase for Android, iOS, and Web
- **Backend:** Supabase (Postgres, Auth, Row-Level Security, Realtime, Edge Functions)
- **File/image storage:** Cloudflare R2
- **Web hosting:** Cloudflare Pages
- **Search:** Postgres full-text + `pg_trgm` (no external search service)
- **Push notifications:** Expo Notifications (FCM/APNs)
- **Payments (Phase 6+):** Razorpay Standard Checkout (hosted, not a custom card form)
- **Messaging (Phase 6+):** WhatsApp Business Platform
- **Package manager:** npm (use `npm`, not `yarn` or `pnpm`, unless told otherwise)
- **Language:** TypeScript in strict mode everywhere — no `.js` files in `src/`, no `any` without a comment explaining why

Do not introduce a new library, service, or paid tier without flagging it first. Every dependency should be free-tier-compatible at launch scale (~40 users, ~100 daily actives) — see the PRD's cost section for context.

## Project stage and priorities

This is being built by one part-time developer (4 hours/day, 4 days/week) for a small real business. Optimize for:
1. **Correctness on the money/medical-data paths** (orders, prices, Art Nos) over speed of delivery elsewhere.
2. **Simplicity over cleverness** — a junior developer or a future agent session should be able to read the code without extra context.
3. **Working software over completeness** — build exactly the current phase's scope (see PRD Section 9), not adjacent features "while you're in there."

## Code style and structure

- Maximum file length: ~300 lines — split larger files into modules.
- Maximum function length: ~40 lines — extract helpers rather than nesting deeply.
- Prefer named exports over default exports (easier to grep and rename).
- Use `interface` for object shapes, `type` for unions/intersections.
- No `console.log` left in committed code — use a small logger utility, or remove debug output before finishing a task.
- Externalize user-facing strings (no hardcoded English text buried in deep component logic) — this app will likely need Hindi/regional language support later, so keep strings easy to extract even though localization itself is out of scope now.
- Folder structure should separate: `app/` (Expo Router screens), `components/` (shared UI), `lib/` (data access, Supabase client, business logic), `types/` (shared TypeScript types mirroring the PRD's data model).
- **Variable Registry Single Source of Truth:** All important identifiers (database columns, DTO properties, state variables, environment keys, enum literals) must be looked up in and registered in `VARIABLE_REGISTRY.md` per `.agents/skills/variable-registry/SKILL.md`. Never guess, invent, or inconsistently case variable names.

## Data and backend rules

- **Never write a database migration that contradicts the schema in PRD Section 3.** If a change seems necessary, propose it and explain why rather than silently diverging.
- **Every new table that stores user-scoped data must ship with Row-Level Security policies in the same change** — no table should go live without RLS if it's supposed to have it (see PRD Section 3.11 for the baseline rules).
- **Never expose `product_variants.price` to unauthenticated or unapproved users at the API/query level** — this must be enforced server-side, not just hidden in the UI (PRD FR-5). Treat this as a security requirement, not a cosmetic one.
- **Never let a client-side role check be the only check.** Any admin-only action (approving doctors, editing prices, changing order status) must also be enforced server-side (RLS policy or Edge Function check).
- **Order status transitions must follow the state machine in PRD FR-13 exactly.** Don't allow arbitrary status strings or skip-ahead transitions.
- **Price snapshotting:** `order_items.unit_price_at_order` is captured once at order time and must never be recalculated from current catalog prices, even if the catalog price later changes.
- All secrets (Supabase keys, Cloudflare credentials, Razorpay keys, etc.) come from environment variables — see `.env.example` for the full list. Never hardcode a key or commit a real `.env` file.

## Testing requirements

- Any new function that touches money (prices, totals, payment status) or order state (status transitions) needs a unit test covering at least: the normal case, an empty/zero case, and one invalid-input case.
- Any new RLS policy should be tested against at least two scenarios: a user accessing their own data (should succeed) and a user accessing someone else's data (should fail).
- Before marking a PRD functional requirement "done," re-check it against that FR's Acceptance Criteria in the PRD — treat that list as the actual test spec, not just a description.
- UI changes don't need automated tests in this project's current stage, but should be manually verified on both a simulated phone size and a desktop browser width before being called complete (this app is Expo-for-web too).

## What NOT to do

- Do not build anything listed under **PRD Section 8 (Out of Scope)** — inventory tracking, multi-vendor support, in-app chat, automated GST invoicing, multi-admin roles, AI recommendations, web push. If a task seems to need one of these, stop and flag it rather than quietly building a version of it.
- Do not build Phase 2+ features (saved sets, offline mode, WhatsApp integration, payments, invoices — PRD Section 5) while MVP phases (PRD Section 9, Phases 2–5) are still incomplete, even if it seems efficient to "do it now while you're in the area."
- Do not silently resolve an item marked `DECISION NEEDED` in the PRD (Section 10). Surface it to the human instead of picking an answer.
- Do not invent new enum values, status names, or field names that aren't in the PRD's data model (Section 3) without checking first — the exact strings matter because the business (order statuses, Art Nos) depends on them staying consistent.
- Do not add a paid service, upgrade a free tier, or change the hosting/backend stack without asking — cost control matters for this project.

## Workflow expectations

- Work in the phase order defined in PRD Section 9 unless told otherwise. Before starting a phase, confirm the previous phase's acceptance criteria are actually met (check the database schema and existing screens — don't assume a clean slate).
- When a task is ambiguous and the PRD doesn't resolve it, prefer the simplest interpretation that satisfies the stated acceptance criteria, and note the assumption made.
- Keep commits/changes scoped to one PRD functional requirement (or one clearly-related group) at a time, so progress is easy to review against the PRD checklist.
- When you finish a task, state which PRD functional requirement(s) it satisfies and which acceptance criteria you verified.

## Nested rules

If a subfolder (e.g. `src/lib/payments/`) needs rules specific to that area (e.g. Razorpay integration conventions once Phase 6 starts), add a nested `AGENTS.md` inside that folder rather than growing this root file indefinitely. Nested rules supplement this file, they don't replace it.
