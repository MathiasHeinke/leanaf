-- Grant super_admin role to enable admin access
INSERT INTO user_roles (user_id, role, created_by)
VALUES ('84b0664f-0934-49ce-9c35-c99546b792bf', 'super_admin', '84b0664f-0934-49ce-9c35-c99546b792bf')
ON CONFLICT (user_id, role) DO NOTHING;