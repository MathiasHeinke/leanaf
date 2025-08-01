-- Fix RLS policy for coach_conversations to allow inserts for authenticated users
DROP POLICY IF EXISTS "Users can create their own coach conversations" ON public.coach_conversations;

CREATE POLICY "Users can create their own coach conversations" 
ON public.coach_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;