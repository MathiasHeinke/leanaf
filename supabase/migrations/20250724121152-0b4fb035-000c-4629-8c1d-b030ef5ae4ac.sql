-- Security Enhancement: Replace hardcoded admin emails with environment-based configuration
-- Create a more secure admin configuration system

-- First, create a new admin_emails table to store authorized admin emails
CREATE TABLE IF NOT EXISTS public.admin_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on admin_emails table
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage admin emails
CREATE POLICY "Super admins can manage admin emails" 
ON public.admin_emails 
FOR ALL 
USING (is_super_admin());

-- Insert the current hardcoded admin emails as initial data
INSERT INTO public.admin_emails (email, role, is_active) VALUES 
('admin@example.com', 'admin', true),
('superadmin@example.com', 'super_admin', true),
('support@kaloai.de', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Create a more secure admin check function
CREATE OR REPLACE FUNCTION public.is_admin_by_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND is_active = true
  );
$function$;

-- Update the existing function to use the new secure method
CREATE OR REPLACE FUNCTION public.is_super_admin_by_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$function$;