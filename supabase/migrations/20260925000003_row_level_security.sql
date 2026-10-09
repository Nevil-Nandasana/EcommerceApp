-- Migration 20260925000003: Row Level Security (RLS)
-- Governed by PRD Section 3.11, FR-5, and Planning/VARIABLE_REGISTRY.md

-- 1. Helper security functions (SECURITY DEFINER to prevent recursive RLS evaluations)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_approved_doctor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND approval_status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 3. categories policies
CREATE POLICY "Public read categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admin manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- 4. products policies
CREATE POLICY "Public read active products"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- 5. product_variants policies
CREATE POLICY "Public read active variants"
  ON public.product_variants FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin manage variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin());

-- 6. users policies
CREATE POLICY "Users read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users create own profile on signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own non-sensitive profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    -- Non-admins cannot alter approval_status or role
    public.is_admin() OR (
      role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) AND
      approval_status = (SELECT u.approval_status FROM public.users u WHERE u.id = auth.uid())
    )
  );

-- 7. addresses policies
CREATE POLICY "Users read own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users manage own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users delete own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- 8. saved_sets & saved_set_items policies
CREATE POLICY "Users manage own saved sets"
  ON public.saved_sets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own saved set items"
  ON public.saved_set_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_sets
      WHERE saved_sets.id = saved_set_items.saved_set_id
        AND saved_sets.user_id = auth.uid()
    )
  );

-- 9. orders policies
CREATE POLICY "Users read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Approved doctors create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (public.is_approved_doctor() OR public.is_admin())
  );

CREATE POLICY "Admin update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

-- 10. order_items policies
CREATE POLICY "Users read own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users insert order items for own orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin update order items while requested"
  ON public.order_items FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.status = 'requested'
    )
  );

-- 11. order_status_history policies
CREATE POLICY "Users read own order history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "System and admin insert order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (auth.uid() = changed_by OR public.is_admin());

-- 12. Explicit DELETE policies for compliance and intent clarity
CREATE POLICY "Admin delete order history"
  ON public.order_status_history FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Block direct user deletion"
  ON public.users FOR DELETE
  USING (false);

CREATE POLICY "Block direct order deletion"
  ON public.orders FOR DELETE
  USING (false);

CREATE POLICY "Block direct order items deletion"
  ON public.order_items FOR DELETE
  USING (false);

