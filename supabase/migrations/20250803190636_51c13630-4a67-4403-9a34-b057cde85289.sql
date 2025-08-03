-- Create table for tracking embedding generation jobs
CREATE TABLE IF NOT EXISTS public.embedding_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_entries INTEGER NOT NULL DEFAULT 0,
  processed_entries INTEGER NOT NULL DEFAULT 0,
  failed_entries INTEGER NOT NULL DEFAULT 0,
  current_batch INTEGER NOT NULL DEFAULT 0,
  batch_size INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_batch_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.embedding_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for super admins only
CREATE POLICY "Super admins can manage embedding jobs" ON public.embedding_generation_jobs
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_embedding_jobs_updated_at
  BEFORE UPDATE ON public.embedding_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();