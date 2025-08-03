-- Force update subscribers table directly
UPDATE subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Super Admin',
  subscription_end = (CURRENT_TIMESTAMP + INTERVAL '10 years')::timestamptz,
  updated_at = now()
WHERE user_id = '84b0664f-0934-49ce-9c35-c99546b792bf';

-- Also add admin role directly if possible
INSERT INTO user_roles (user_id, role, created_by)
VALUES ('84b0664f-0934-49ce-9c35-c99546b792bf', 'admin', '84b0664f-0934-49ce-9c35-c99546b792bf')
ON CONFLICT (user_id, role) DO NOTHING;