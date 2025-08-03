-- Add user to admin_emails table (bypasses all other restrictions)
INSERT INTO admin_emails (email, role, is_active, created_by)
VALUES ('office@mathiasheinke.de', 'super_admin', true, '84b0664f-0934-49ce-9c35-c99546b792bf')
ON CONFLICT (email) DO UPDATE SET 
  role = 'super_admin',
  is_active = true;