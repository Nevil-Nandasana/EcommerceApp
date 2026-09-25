-- Migration 20260925000005: Search Indexes and Price-Protected Catalog Views
-- Governed by PRD FR-3, FR-5, Section 6.3, and Planning/VARIABLE_REGISTRY.md

-- 1. Trigram GIN Indexes for Sub-300ms Fuzzy & Partial Search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_variants_art_no_trgm ON public.product_variants USING gin (art_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON public.categories USING gin (name gin_trgm_ops);

-- 2. FR-5 Price-Protected Variant View (Catalog View)
-- Strips price completely for unauthenticated guests and pending/rejected doctors
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

-- 3. FR-3 Fast Search RPC Function
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
    v.price,
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
