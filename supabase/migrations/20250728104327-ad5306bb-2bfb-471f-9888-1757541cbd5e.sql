-- Add office@mathiasheinke.de as Super Admin
UPDATE public.subscribers 
SET subscription_tier = 'Super Admin'
WHERE email = 'office@mathiasheinke.de';

-- Also add to admin emails table for additional admin functions
INSERT INTO public.admin_emails (email, role, is_active, created_by)
VALUES ('office@mathiasheinke.de', 'super_admin', true, '84b0664f-0934-49ce-9c35-c99546b792bf')
ON CONFLICT (email) DO UPDATE SET 
  role = 'super_admin',
  is_active = true;