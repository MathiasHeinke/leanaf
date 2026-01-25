-- Create table for user widget preferences
CREATE TABLE public.user_widget_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  widget_type TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'medium',
  enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, widget_type)
);

-- Enable RLS
ALTER TABLE public.user_widget_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own widget preferences"
  ON public.user_widget_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget preferences"
  ON public.user_widget_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget preferences"
  ON public.user_widget_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget preferences"
  ON public.user_widget_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_widget_preferences_updated_at
  BEFORE UPDATE ON public.user_widget_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();