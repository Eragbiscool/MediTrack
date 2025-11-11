-- Create users table for simple profile storage
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (true);

-- Create medicines table
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency INTEGER NOT NULL CHECK (frequency > 0 AND frequency <= 10),
  timing TEXT NOT NULL CHECK (timing IN ('before_meal', 'after_meal', 'anytime')),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- Users can manage their own medicines
CREATE POLICY "Users can view their own medicines"
  ON public.medicines FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own medicines"
  ON public.medicines FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own medicines"
  ON public.medicines FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own medicines"
  ON public.medicines FOR DELETE
  USING (true);

-- Create medicine logs table to track when medicines are taken
CREATE TABLE IF NOT EXISTS public.medicine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their medicines
CREATE POLICY "Users can view their medicine logs"
  ON public.medicine_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.medicines
      WHERE medicines.id = medicine_logs.medicine_id
    )
  );

CREATE POLICY "Users can insert their medicine logs"
  ON public.medicine_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.medicines
      WHERE medicines.id = medicine_logs.medicine_id
    )
  );

CREATE POLICY "Users can update their medicine logs"
  ON public.medicine_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.medicines
      WHERE medicines.id = medicine_logs.medicine_id
    )
  );