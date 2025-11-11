-- Add authentication column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create secure RLS policies that check auth
CREATE POLICY "Users can view only their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id);

-- Update medicines table policies to ensure proper user isolation
DROP POLICY IF EXISTS "Users can view their own medicines" ON public.medicines;
DROP POLICY IF EXISTS "Users can insert their own medicines" ON public.medicines;
DROP POLICY IF EXISTS "Users can update their own medicines" ON public.medicines;
DROP POLICY IF EXISTS "Users can delete their own medicines" ON public.medicines;

CREATE POLICY "Users can view their own medicines"
ON public.medicines
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own medicines"
ON public.medicines
FOR INSERT
TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own medicines"
ON public.medicines
FOR UPDATE
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own medicines"
ON public.medicines
FOR DELETE
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Update medicine_logs policies for proper isolation
DROP POLICY IF EXISTS "Users can view their medicine logs" ON public.medicine_logs;
DROP POLICY IF EXISTS "Users can insert their medicine logs" ON public.medicine_logs;
DROP POLICY IF EXISTS "Users can update their medicine logs" ON public.medicine_logs;

CREATE POLICY "Users can view their medicine logs"
ON public.medicine_logs
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.medicines m
  JOIN public.users u ON m.user_id = u.id
  WHERE m.id = medicine_logs.medicine_id
  AND u.auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert their medicine logs"
ON public.medicine_logs
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.medicines m
  JOIN public.users u ON m.user_id = u.id
  WHERE m.id = medicine_logs.medicine_id
  AND u.auth_user_id = auth.uid()
));

CREATE POLICY "Users can update their medicine logs"
ON public.medicine_logs
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.medicines m
  JOIN public.users u ON m.user_id = u.id
  WHERE m.id = medicine_logs.medicine_id
  AND u.auth_user_id = auth.uid()
));