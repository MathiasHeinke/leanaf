-- Secure coach_ratings by removing public SELECT and tightening access
-- 1) Ensure RLS is enabled
ALTER TABLE public.coach_ratings ENABLE ROW LEVEL SECURITY;

-- 2) Remove overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view coach ratings for statistics" ON public.coach_ratings;

-- 3) Add an explicit admin-read policy (optional, for maintenance and audits)
CREATE POLICY "Super admins can view all coach ratings"
ON public.coach_ratings
FOR SELECT
USING (is_super_admin());