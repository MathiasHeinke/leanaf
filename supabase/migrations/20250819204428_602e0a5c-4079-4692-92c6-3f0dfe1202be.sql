-- Tighten RLS on admin_emails to ensure only authenticated super admins can access
-- 1) Ensure RLS is enabled (idempotent)
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- 2) Drop broad/ambiguous policy and recreate explicit, role-scoped policies
DROP POLICY IF EXISTS "Super admins can manage admin emails" ON public.admin_emails;

-- 3) Create explicit per-command policies limited to authenticated role
CREATE POLICY "Super admins can view admin emails"
ON public.admin_emails
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert admin emails"
ON public.admin_emails
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update admin emails"
ON public.admin_emails
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete admin emails"
ON public.admin_emails
FOR DELETE
TO authenticated
USING (public.is_super_admin());