# Supabase RLS Policies & PostgreSQL Triggers Reference

## 1. Row-Level Security Policies

### Products & Categories (Public Browsing)
```sql
-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Allow public read access to category structure and base products
CREATE POLICY "Public read categories" 
ON public.categories FOR SELECT 
USING (true);

CREATE POLICY "Public read products" 
ON public.products FOR SELECT 
USING (true);

-- Product variants can be read by anyone, but prices are masked via catalog_products view
CREATE POLICY "Public read variants base" 
ON public.product_variants FOR SELECT 
USING (true);
```

---

### Orders & Order Items (Customer Scoped)
```sql
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own orders
CREATE POLICY "Users read own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

-- Approved customers can insert new orders
CREATE POLICY "Approved users insert orders" 
ON public.orders FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (SELECT approval_status FROM public.users WHERE id = auth.uid()) = 'approved'
);

-- Customers can view only items for their own orders
CREATE POLICY "Users read own order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);
```

---

## 2. Order Status Audit History Trigger
```sql
CREATE OR REPLACE FUNCTION log_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      created_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_history
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION log_order_status_history();
```

---

## 3. Price Snapshotting Trigger on Order Creation
```sql
CREATE OR REPLACE FUNCTION snapshot_order_item_price()
RETURNS TRIGGER AS $$
DECLARE
  v_current_price NUMERIC;
BEGIN
  -- If unit_price_at_order is not provided, fetch current variant price
  IF NEW.unit_price_at_order IS NULL THEN
    SELECT price INTO v_current_price 
    FROM public.product_variants 
    WHERE id = NEW.variant_id;
    
    NEW.unit_price_at_order := v_current_price;
  END IF;
  
  -- Calculate line total
  NEW.line_total := NEW.quantity * NEW.unit_price_at_order;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_snapshot_order_item_price
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION snapshot_order_item_price();
```
