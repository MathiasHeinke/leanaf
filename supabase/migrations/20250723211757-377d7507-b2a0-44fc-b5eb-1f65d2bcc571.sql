-- Enable Row Level Security on badges_backup table
ALTER TABLE public.badges_backup ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only Super Admins to view backup badges
CREATE POLICY "Super Admin can view badges backup" 
ON public.badges_backup
FOR SELECT
USING (is_super_admin());