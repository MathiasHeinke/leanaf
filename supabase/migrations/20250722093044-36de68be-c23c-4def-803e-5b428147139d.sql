
-- Erweitere point_activities um mehr Metadaten für bessere Analyse
ALTER TABLE public.point_activities 
ADD COLUMN IF NOT EXISTS bonus_reason text,
ADD COLUMN IF NOT EXISTS streak_length integer DEFAULT 0;

-- Kommentare für bessere Dokumentation
COMMENT ON COLUMN public.point_activities.bonus_reason IS 'Grund für Bonuspunkte (z.B. consistency_bonus, quality_bonus)';
COMMENT ON COLUMN public.point_activities.streak_length IS 'Streak-Länge zum Zeitpunkt der Punktevergabe';

-- Erweitere workouts um Qualitätsbewertung
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bonus_points integer DEFAULT 0;

COMMENT ON COLUMN public.workouts.quality_score IS 'Workout-Qualitätsbewertung basierend auf Intensität/Dauer-Verhältnis';
COMMENT ON COLUMN public.workouts.bonus_points IS 'Bonuspunkte für optimale Workouts';

-- Erweitere sleep_tracking um Qualitätsbewertung
ALTER TABLE public.sleep_tracking 
ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bonus_points integer DEFAULT 0;

COMMENT ON COLUMN public.sleep_tracking.quality_score IS 'Schlafqualitätsbewertung (0-10)';
COMMENT ON COLUMN public.sleep_tracking.bonus_points IS 'Bonuspunkte für guten Schlaf';

-- Neue Tabelle für Chat-Verlauf mit Coach
CREATE TABLE IF NOT EXISTS public.coach_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_role text NOT NULL CHECK (message_role IN ('user', 'assistant')),
  message_content text NOT NULL,
  coach_personality text DEFAULT 'motivierend',
  context_data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS Policies für coach_conversations
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach conversations"
  ON public.coach_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coach conversations"
  ON public.coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach conversations"
  ON public.coach_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coach conversations"
  ON public.coach_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger für updated_at
CREATE OR REPLACE TRIGGER update_coach_conversations_updated_at
  BEFORE UPDATE ON public.coach_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_id ON public.coach_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_created_at ON public.coach_conversations(user_id, created_at);
