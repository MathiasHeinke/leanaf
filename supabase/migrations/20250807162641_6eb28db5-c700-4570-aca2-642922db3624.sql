-- Add the user as Super Admin to admin_emails table
INSERT INTO public.admin_emails (email, role, is_active, created_by)
VALUES ('heinkemathias@icloud.com', 'super_admin', true, '5708d895-28a5-4376-93e8-b18c62568385')
ON CONFLICT (email) DO UPDATE SET 
  role = 'super_admin',
  is_active = true,
  updated_at = now();