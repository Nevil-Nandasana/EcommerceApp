-- Migration 20261006000009: Security Hardening & Explicit Policy Enforcement
-- Governed by Security Audit 2026-10-06, PRD Section 7, OWASP A01, and Planning/VARIABLE_REGISTRY.md

-- 1. Explicit DELETE Policies for Compliance, Immutability & Intent Clarity
-- 1.1 Allow admins to purge order history if needed for GDPR/DPDP right-to-be-forgotten (HIGH-2)
DROP POLICY IF EXISTS "Admin delete order history" ON public.order_status_history;
CREATE POLICY "Admin delete order history"
  ON public.order_status_history FOR DELETE
  USING (public.is_admin());

-- 1.2 Explicitly block direct DELETE on users table (must use delete_user_account RPC) (HIGH-3)
DROP POLICY IF EXISTS "Block direct user deletion" ON public.users;
CREATE POLICY "Block direct user deletion"
  ON public.users FOR DELETE
  USING (false);

-- 1.3 Explicitly block direct DELETE on orders (orders can only transition to 'cancelled', never deleted)
DROP POLICY IF EXISTS "Block direct order deletion" ON public.orders;
CREATE POLICY "Block direct order deletion"
  ON public.orders FOR DELETE
  USING (false);

-- 1.4 Explicitly block direct DELETE on order_items (preserves financial audit trail)
DROP POLICY IF EXISTS "Block direct order items deletion" ON public.order_items;
CREATE POLICY "Block direct order items deletion"
  ON public.order_items FOR DELETE
  USING (false);

-- 2. Price Confidentiality in Search Catalog RPC (HIGH-1)
-- Enforce SECURITY INVOKER so auth.role() and public.is_approved_doctor() evaluate
-- in caller session context rather than database owner context.
CREATE OR REPLACE FUNCTION public.search_catalog(
  query_text TEXT,
  result_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category_name TEXT,
  category_id UUID,
  image_url TEXT,
  art_no TEXT,
  size_label TEXT,
  price NUMERIC,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    c.name AS category_name,
    c.id AS category_id,
    p.image_url,
    v.art_no,
    v.size_label,
    CASE
      WHEN auth.role() = 'authenticated' AND (public.is_approved_doctor() OR public.is_admin())
      THEN v.price
      ELSE NULL
    END AS price,
    GREATEST(
      similarity(p.name, query_text),
      similarity(v.art_no, query_text),
      CASE WHEN v.art_no ILIKE '%' || query_text || '%' THEN 1.0 ELSE 0.0 END,
      CASE WHEN p.name ILIKE '%' || query_text || '%' THEN 0.8 ELSE 0.0 END
    )::REAL AS similarity_score
  FROM public.products p
  JOIN public.categories c ON p.category_id = c.id
  JOIN public.catalog_variants v ON p.id = v.product_id
  WHERE
    p.is_active = true
    AND v.is_active = true
    AND (
      v.art_no ILIKE '%' || query_text || '%'
      OR p.name ILIKE '%' || query_text || '%'
      OR c.name ILIKE '%' || query_text || '%'
      OR p.name % query_text
      OR query_text % ANY(p.search_tags)
    )
  ORDER BY similarity_score DESC, p.name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 3. Ensure Price Masking in catalog_variants View
CREATE OR REPLACE VIEW public.catalog_variants AS
SELECT
  pv.id,
  pv.product_id,
  pv.art_no,
  pv.size_label,
  pv.size_cm,
  CASE
    WHEN auth.role() = 'authenticated' AND (public.is_approved_doctor() OR public.is_admin())
    THEN pv.price
    ELSE NULL
  END AS price,
  pv.currency,
  pv.is_active,
  pv.created_at,
  pv.updated_at
FROM public.product_variants pv;
