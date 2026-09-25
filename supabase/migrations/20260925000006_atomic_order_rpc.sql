-- Migration 20260925000006: Atomic Order Submission RPC
-- Governed by PRD Section 7 (Reliability) and T3.4.2

CREATE OR REPLACE FUNCTION public.submit_order(
  p_address_id UUID,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
  v_variant_id UUID;
  v_qty INT;
  v_price NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit an order.';
  END IF;

  -- Ensure caller is approved doctor or admin
  IF NOT (public.is_approved_doctor() OR public.is_admin()) THEN
    RAISE EXCEPTION 'Only approved doctors can submit orders.';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items cannot be empty.';
  END IF;

  -- 1. Create order (Triggers will auto-generate order_number and log initial history)
  INSERT INTO public.orders (
    user_id,
    address_id,
    status,
    notes,
    payment_status
  ) VALUES (
    v_user_id,
    p_address_id,
    'requested',
    p_notes,
    'not_applicable'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 2. Insert order items atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variantId')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be at least 1.';
    END IF;

    -- Lookup catalog price
    SELECT price INTO v_price
    FROM public.product_variants
    WHERE id = v_variant_id AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product variant % not found or inactive.', v_variant_id;
    END IF;

    INSERT INTO public.order_items (
      order_id,
      product_variant_id,
      quantity,
      unit_price_at_order
    ) VALUES (
      v_order_id,
      v_variant_id,
      v_qty,
      v_price
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_order(UUID, TEXT, JSONB) TO authenticated;
