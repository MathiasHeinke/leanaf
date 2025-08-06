-- Add admin role for preview user to enable admin access
INSERT INTO public.user_roles (user_id, role) 
VALUES ('84b0664f-0934-49ce-9c35-c99546b792bf', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;