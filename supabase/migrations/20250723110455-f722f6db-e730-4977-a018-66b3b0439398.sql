
-- Create admin_logs table for tracking debug panel actions
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  target_user_id UUID,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  old_values JSONB DEFAULT '{}',
  new_values JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view logs (for debugging)
CREATE POLICY "Authenticated users can view admin logs" 
  ON public.admin_logs 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can insert admin logs" 
  ON public.admin_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = admin_user_id);

-- Add indexes for better performance
CREATE INDEX idx_admin_logs_admin_user_id ON public.admin_logs(admin_user_id);
CREATE INDEX idx_admin_logs_target_user_id ON public.admin_logs(target_user_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
