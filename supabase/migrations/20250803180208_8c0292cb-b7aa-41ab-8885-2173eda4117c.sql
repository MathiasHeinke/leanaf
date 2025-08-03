-- Create RAG chunk logs table
CREATE TABLE IF NOT EXISTS public.rag_chunk_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  chunk_id UUID,
  score NUMERIC,
  source_doc TEXT,
  content_snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tool usage events table
CREATE TABLE IF NOT EXISTS public.tool_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  tool TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
  confidence NUMERIC DEFAULT 0.0,
  is_applied BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coach plans table
CREATE TABLE IF NOT EXISTS public.coach_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'training' CHECK (type IN ('training', 'nutrition', 'supplement')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  title TEXT,
  json_payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create the dashboard view
CREATE OR REPLACE VIEW public.v_coach_dashboard AS
SELECT
  c.conversation_id,
  c.coach_personality AS coach,
  c.user_id,
  MIN(c.created_at) AS started_at,
  MAX(c.created_at) AS last_msg_at,
  COUNT(*) FILTER (WHERE c.role = 'user') AS user_msgs,
  COUNT(*) FILTER (WHERE c.role = 'assistant') AS coach_msgs,
  BOOL_OR(t.tool IS NOT NULL) AS used_tool,
  BOOL_OR(r.id IS NOT NULL) AS used_rag,
  COALESCE(JSONB_AGG(DISTINCT t.tool) FILTER (WHERE t.tool IS NOT NULL), '[]'::jsonb) AS tool_list,
  COALESCE(MAX(a.status), 'open') AS admin_status,
  COUNT(DISTINCT cp.id) AS plan_count
FROM public.coach_conversations c
LEFT JOIN public.tool_usage_events t ON t.conversation_id = c.conversation_id
LEFT JOIN public.rag_chunk_logs r ON r.conversation_id = c.conversation_id
LEFT JOIN public.admin_conversation_notes a ON a.conversation_id = c.conversation_id
LEFT JOIN public.coach_plans cp ON cp.conversation_id = c.conversation_id
WHERE c.conversation_id IS NOT NULL
GROUP BY c.conversation_id, c.coach_personality, c.user_id;

-- Enable RLS on new tables
ALTER TABLE public.rag_chunk_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admins can view rag chunk logs" ON public.rag_chunk_logs
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage rag chunk logs" ON public.rag_chunk_logs
  FOR ALL USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert rag chunk logs" ON public.rag_chunk_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view tool usage events" ON public.tool_usage_events
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage tool usage events" ON public.tool_usage_events
  FOR ALL USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert tool usage events" ON public.tool_usage_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view coach plans" ON public.coach_plans
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage coach plans" ON public.coach_plans
  FOR ALL USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert coach plans" ON public.coach_plans
  FOR INSERT WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rag_chunk_logs_conversation_id ON public.rag_chunk_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunk_logs_created_at ON public.rag_chunk_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_tool_usage_events_conversation_id ON public.tool_usage_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_events_created_at ON public.tool_usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_events_tool ON public.tool_usage_events(tool);

CREATE INDEX IF NOT EXISTS idx_coach_plans_conversation_id ON public.coach_plans(conversation_id);
CREATE INDEX IF NOT EXISTS idx_coach_plans_created_at ON public.coach_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_coach_plans_type ON public.coach_plans(type);

-- Add trigger for coach_plans updated_at
CREATE TRIGGER update_coach_plans_updated_at
  BEFORE UPDATE ON public.coach_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();