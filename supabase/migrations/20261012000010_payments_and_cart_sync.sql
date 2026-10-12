-- Migration 20261012000010: Payments Ledger, Razorpay References, and Cloud Cart Sync
-- Governed by PRD Section 3, Section 5, and Planning/VARIABLE_REGISTRY.md

-- 1. Extend Enums Safely
DO $$ BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'partially_paid';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'razorpay';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'upi';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add Razorpay References to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature text;

-- 3. Create payments Ledger Table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for speedy order & user payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON public.payments(gateway_order_id);

-- 4. Create cart_items Table for Cross-Device Cloud Cart Sync (T5.P.10)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cart_user_variant UNIQUE (user_id, product_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

-- 5. Row-Level Security (RLS) Enforcement
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Payments RLS Policies
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR is_admin()
  );

DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
CREATE POLICY "payments_insert_policy" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR is_admin()
  );

DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;
CREATE POLICY "payments_update_policy" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payments_delete_policy" ON public.payments;
CREATE POLICY "payments_delete_policy" ON public.payments
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Cart Items RLS Policies (User-isolated)
DROP POLICY IF EXISTS "cart_items_select_policy" ON public.cart_items;
CREATE POLICY "cart_items_select_policy" ON public.cart_items
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "cart_items_insert_policy" ON public.cart_items;
CREATE POLICY "cart_items_insert_policy" ON public.cart_items
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cart_items_update_policy" ON public.cart_items;
CREATE POLICY "cart_items_update_policy" ON public.cart_items
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cart_items_delete_policy" ON public.cart_items;
CREATE POLICY "cart_items_delete_policy" ON public.cart_items
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
