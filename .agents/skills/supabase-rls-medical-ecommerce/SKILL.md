---
name: supabase-rls-medical-ecommerce
description: >-
  Design, implement, and audit Supabase PostgreSQL schemas, Row-Level Security (RLS) policies,
  order status state machines, and price confidentiality controls for medical B2B ecommerce.
---

# Supabase RLS & Medical Ecommerce Security Engine

A hardened database engineering runbook for B2B medical procurement platforms built on Supabase, enforcing zero-trust data access, strict price protection, and immutable order history.

## Core Architectural Invariants

1. **FR-5 Price Confidentiality Enforcement:**
   - Guest visitors and unapproved accounts (`approval_status != 'approved'`) must NEVER receive catalog prices from API queries.
   - Enforce server-side via Supabase secure views or PostgreSQL column-level security:
     ```sql
     -- Public catalog view hiding prices for non-approved users
     CREATE OR REPLACE VIEW public.catalog_products AS
     SELECT 
       p.id, p.category_id, p.name, p.art_no, p.description, p.image_url,
       pv.id AS variant_id, pv.size,
       CASE 
         WHEN auth.role() = 'authenticated' 
              AND (SELECT approval_status FROM public.users WHERE id = auth.uid()) = 'approved'
         THEN pv.price 
         ELSE NULL 
       END AS price
     FROM public.products p
     JOIN public.product_variants pv ON p.id = pv.product_id;
     ```

2. **FR-13 Order Status State Machine:**
   - Orders must strictly follow the transition path:
     `placed` -> `confirmed` -> `packed` -> `dispatched` -> `delivered` (or `cancelled`).
   - Prevent illegal state jumps via trigger:
     ```sql
     CREATE OR REPLACE FUNCTION validate_order_status_transition()
     RETURNS TRIGGER AS $$
     BEGIN
       IF OLD.status = NEW.status THEN
         RETURN NEW;
       END IF;
       
       IF (OLD.status = 'placed' AND NEW.status IN ('confirmed', 'cancelled')) OR
          (OLD.status = 'confirmed' AND NEW.status IN ('packed', 'cancelled')) OR
          (OLD.status = 'packed' AND NEW.status IN ('dispatched', 'cancelled')) OR
          (OLD.status = 'dispatched' AND NEW.status IN ('delivered')) THEN
         RETURN NEW;
       ELSE
         RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
       END IF;
     END;
     $$ LANGUAGE plpgsql;
     ```

3. **Immutable Price Snapshotting:**
   - `order_items.unit_price_at_order` must be captured at order placement time and locked forever.
   - Any updates or recalculations against future catalog price changes are strictly prohibited.

4. **Multi-Tenant RLS Policy Baseline:**
   - Customers can only read and write their own carts, orders, and addresses (`auth.uid() = user_id`).
   - Admin users have bypass privileges controlled strictly by server-verified role attributes.

---

## Detailed Reference
For complete SQL migration scripts, RLS policies, trigger implementations, and audit queries, refer to:
- [RLS Policies & PostgreSQL Triggers Reference](./references/rls_and_triggers.md)
