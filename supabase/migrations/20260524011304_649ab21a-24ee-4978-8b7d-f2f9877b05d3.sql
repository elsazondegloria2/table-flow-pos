
-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  emoji TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extras
CREATE TABLE public.extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tables
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL UNIQUE,
  capacity INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied','awaiting_payment','reserved')),
  guests INT NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'dine_in' CHECK (type IN ('dine_in','takeaway','quick')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','awaiting_payment','paid','cancelled')),
  customer_name TEXT,
  guests INT NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  amount_received NUMERIC(10,2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_table_idx ON public.orders(table_id);
CREATE INDEX orders_closed_at_idx ON public.orders(closed_at);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- Order item extras
CREATE TABLE public.order_item_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  extra_id UUID REFERENCES public.extras(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_item_extras_item_idx ON public.order_item_extras(order_item_id);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  concept TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS with open policies (single-restaurant, no login)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','products','extras','tables','orders','order_items','order_item_extras','expenses']
  LOOP
    EXECUTE format('CREATE POLICY "pos open read %I" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "pos open insert %I" ON public.%I FOR INSERT WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "pos open update %I" ON public.%I FOR UPDATE USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "pos open delete %I" ON public.%I FOR DELETE USING (true);', t, t);
  END LOOP;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Helper: recompute order totals
CREATE OR REPLACE FUNCTION public.recompute_order_total(p_order UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_subtotal NUMERIC(10,2);
BEGIN
  SELECT COALESCE(SUM(items_total),0) INTO v_subtotal FROM (
    SELECT
      oi.price_snapshot * oi.quantity
      + COALESCE((SELECT SUM(e.price_snapshot * e.quantity) FROM public.order_item_extras e WHERE e.order_item_id = oi.id),0) * oi.quantity / GREATEST(oi.quantity,1)
      AS items_total
    FROM public.order_items oi
    WHERE oi.order_id = p_order
  ) s;
  UPDATE public.orders SET subtotal = v_subtotal, total = v_subtotal WHERE id = p_order;
END $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_from_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.recompute_order_total(COALESCE(NEW.order_id, OLD.order_id));
  RETURN NULL;
END $$;

CREATE TRIGGER recompute_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_item();

CREATE OR REPLACE FUNCTION public.trg_recompute_from_extra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_order UUID;
BEGIN
  SELECT order_id INTO v_order FROM public.order_items WHERE id = COALESCE(NEW.order_item_id, OLD.order_item_id);
  IF v_order IS NOT NULL THEN PERFORM public.recompute_order_total(v_order); END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER recompute_on_extra_change
AFTER INSERT OR UPDATE OR DELETE ON public.order_item_extras
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_extra();
