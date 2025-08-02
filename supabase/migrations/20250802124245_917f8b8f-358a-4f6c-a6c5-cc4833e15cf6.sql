-- Create profile reminder log table for periodic reminders
CREATE TABLE IF NOT EXISTS profile_reminder_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'stale_profile',
  days_since_update INTEGER NOT NULL,
  message TEXT NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'in_app',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE profile_reminder_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view their own reminders" 
ON profile_reminder_log FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert reminders
CREATE POLICY "System can insert reminders" 
ON profile_reminder_log FOR INSERT 
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profile_reminder_log_user_created 
ON profile_reminder_log(user_id, created_at DESC);