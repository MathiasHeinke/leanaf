-- Phase B: User Conversation State Persistence
-- Stores topic state and other conversation context per user

CREATE TABLE IF NOT EXISTS public.user_conversation_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_state JSONB DEFAULT '{"primary": null, "secondary": [], "archived": [], "lastShiftAt": null, "shiftCount": 0}'::jsonb,
    last_coach_id TEXT DEFAULT 'ares',
    session_started_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_conversation_state ENABLE ROW LEVEL SECURITY;

-- Users can only access their own state
CREATE POLICY "Users can view own conversation state"
    ON public.user_conversation_state
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation state"
    ON public.user_conversation_state
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation state"
    ON public.user_conversation_state
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role needs full access for orchestrator
CREATE POLICY "Service role has full access to conversation state"
    ON public.user_conversation_state
    FOR ALL
    USING (auth.role() = 'service_role');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_conversation_state_updated 
    ON public.user_conversation_state(updated_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_user_conversation_state_updated_at
    BEFORE UPDATE ON public.user_conversation_state
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();