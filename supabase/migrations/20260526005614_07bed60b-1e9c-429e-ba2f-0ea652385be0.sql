
-- 1) Fix orders.type constraint to include delivery + quick_sale
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_type_check
  CHECK (type = ANY (ARRAY['dine_in','takeaway','delivery','quick','quick_sale']));

-- 2) Delivery queue + provider fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS queue_number INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_provider TEXT;

-- 3) Restaurant settings (single row)
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'El Sazón de Gloria',
  tagline TEXT DEFAULT 'Almuerzos Caseros',
  ruc TEXT,
  phone TEXT,
  address TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos open all settings" ON public.restaurant_settings FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.restaurant_settings (name, tagline)
SELECT 'El Sazón de Gloria', 'Almuerzos Caseros'
WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_settings);

-- 4) Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  weekly_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  day_off TEXT, -- 'mon','tue',...,'sun'
  hired_at DATE DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos open all employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- 5) Attendance
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','day_off','vacation','sick')),
  reason TEXT,
  deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, date)
);
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos open all attendance" ON public.employee_attendance FOR ALL USING (true) WITH CHECK (true);

-- 6) Consumption (employee orders deducted from salary)
CREATE TABLE IF NOT EXISTS public.employee_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  concept TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos open all consumption" ON public.employee_consumption FOR ALL USING (true) WITH CHECK (true);

-- 7) Payroll history (weekly pay + bonuses + vacations)
CREATE TABLE IF NOT EXISTS public.employee_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('weekly','bonus','vacation')),
  period_start DATE,
  period_end DATE,
  base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  consumption NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos open all payroll" ON public.employee_payroll FOR ALL USING (true) WITH CHECK (true);
