-- Migration 20260925000004: Triggers, Audit History and Order State Machine
-- Governed by PRD Section 3.8-3.10, FR-13, and Planning/DECISIONS.md

-- 1. Auto-generate human-readable order_number: SPQ-YYYY-XXXX
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    v_year := to_char(now(), 'YYYY');
    v_seq := nextval('order_number_seq');
    NEW.order_number := 'SPQ-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- 2. Validate Order Status Transitions (State Machine)
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- No change in status is always valid
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Allowed transition rules strictly per PRD FR-10, FR-13 & VARIABLE_REGISTRY.md:
  -- requested -> confirmed, cancelled
  -- confirmed -> dispatched, cancelled
  -- dispatched -> delivered (cancelled is NOT reachable from dispatched)
  IF (OLD.status = 'requested' AND NEW.status IN ('confirmed', 'cancelled')) OR
     (OLD.status = 'confirmed' AND NEW.status IN ('dispatched', 'cancelled')) OR
     (OLD.status = 'dispatched' AND NEW.status = 'delivered') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

-- 3. Auto-append to order_status_history on order insert and status change
CREATE OR REPLACE FUNCTION public.log_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (
      order_id,
      status,
      changed_by,
      changed_at,
      note
    ) VALUES (
      NEW.id,
      NEW.status,
      COALESCE(auth.uid(), NEW.user_id),
      now(),
      'Order created with initial status ' || NEW.status::text
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (
      order_id,
      status,
      changed_by,
      changed_at,
      note
    ) VALUES (
      NEW.id,
      NEW.status,
      COALESCE(auth.uid(), NEW.user_id),
      now(),
      'Status transitioned from ' || OLD.status::text || ' to ' || NEW.status::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_status_history ON public.orders;
CREATE TRIGGER trg_order_status_history
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_history();

-- 4. Price snapshotting on order item creation (Locks unit price at order time)
CREATE OR REPLACE FUNCTION public.snapshot_order_item_price()
RETURNS TRIGGER AS $$
DECLARE
  v_catalog_price NUMERIC;
BEGIN
  IF NEW.unit_price_at_order IS NULL THEN
    SELECT price INTO v_catalog_price
    FROM public.product_variants
    WHERE id = NEW.product_variant_id;

    NEW.unit_price_at_order := v_catalog_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_snapshot_order_item_price ON public.order_items;
CREATE TRIGGER trg_snapshot_order_item_price
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_item_price();

-- 5. Recalculate order subtotal automatically
CREATE OR REPLACE FUNCTION public.recalculate_order_subtotal()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_has_unpriced BOOLEAN;
  v_subtotal NUMERIC;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  -- PRD Section 3.8 & FR-6: Subtotal is NULL until ALL items in the order are priced
  SELECT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = v_order_id AND unit_price_at_order IS NULL
  ) INTO v_has_unpriced;

  IF v_has_unpriced THEN
    v_subtotal := NULL;
  ELSE
    SELECT SUM(quantity * unit_price_at_order)
    INTO v_subtotal
    FROM public.order_items
    WHERE order_id = v_order_id;
  END IF;

  UPDATE public.orders
  SET subtotal = v_subtotal,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalc_order_subtotal ON public.order_items;
CREATE TRIGGER trg_recalc_order_subtotal
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_subtotal();
