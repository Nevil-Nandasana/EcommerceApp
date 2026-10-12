-- Migration 20261012000012: Inventory & Stock-Level Tracking
-- Governed by PRD Section 5 (T5.P.1 / F-15) and Planning/VARIABLE_REGISTRY.md

-- 1. Add inventory columns to product_variants table
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
  ADD COLUMN IF NOT EXISTS is_in_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0);

-- 2. Trigger function to auto-update is_in_stock based on stock_quantity
CREATE OR REPLACE FUNCTION public.sync_variant_in_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity = 0 THEN
    NEW.is_in_stock := false;
  ELSIF NEW.stock_quantity > 0 AND NEW.is_in_stock IS NOT FALSE THEN
    NEW.is_in_stock := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_variant_in_stock ON public.product_variants;
CREATE TRIGGER trg_sync_variant_in_stock
  BEFORE INSERT OR UPDATE OF stock_quantity, is_in_stock ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_variant_in_stock();

-- 3. Update catalog_variants view to expose stock tracking attributes with price masking
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
  pv.stock_quantity,
  pv.is_in_stock,
  pv.low_stock_threshold,
  pv.is_active,
  pv.created_at,
  pv.updated_at
FROM public.product_variants pv;

-- 4. Update search_catalog RPC to return stock information
CREATE OR REPLACE FUNCTION public.search_catalog(
  query_text text,
  result_limit integer DEFAULT 30
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  category_name text,
  category_id uuid,
  image_url text,
  art_no text,
  size_label text,
  price numeric,
  stock_quantity integer,
  is_in_stock boolean,
  low_stock_threshold integer,
  similarity_score real
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
    v.stock_quantity,
    v.is_in_stock,
    v.low_stock_threshold,
    GREATEST(
      similarity(p.name, query_text),
      similarity(v.art_no, query_text),
      CASE WHEN v.art_no ILIKE '%' || query_text || '%' THEN 0.8::real ELSE 0.0::real END,
      CASE WHEN p.name ILIKE '%' || query_text || '%' THEN 0.6::real ELSE 0.0::real END
    ) AS similarity_score
  FROM public.products p
  JOIN public.categories c ON p.category_id = c.id
  JOIN public.product_variants v ON p.id = v.product_id
  WHERE
    p.is_active = true
    AND v.is_active = true
    AND (
      p.name % query_text
      OR v.art_no % query_text
      OR v.art_no ILIKE '%' || query_text || '%'
      OR p.name ILIKE '%' || query_text || '%'
      OR p.search_tags && ARRAY[query_text]
    )
  ORDER BY similarity_score DESC, p.name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;
