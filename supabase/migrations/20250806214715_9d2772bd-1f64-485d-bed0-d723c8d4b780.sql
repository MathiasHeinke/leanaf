-- Fix security vulnerability in v_vita_knowledge_analytics view
-- Change from SECURITY DEFINER to SECURITY INVOKER to enforce RLS policies

ALTER VIEW public.v_vita_knowledge_analytics
    SET (security_invoker = true);

-- Add comment for documentation
COMMENT ON VIEW public.v_vita_knowledge_analytics IS 'View configured with security_invoker=true to enforce Row Level Security policies for the calling user instead of the view owner';