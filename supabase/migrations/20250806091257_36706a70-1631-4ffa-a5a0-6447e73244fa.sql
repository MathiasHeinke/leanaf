-- Add photo metadata to weight_history table
ALTER TABLE weight_history 
ADD COLUMN photo_metadata JSONB DEFAULT '{}';

-- Create AI usage tracking table
CREATE TABLE ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('openai_vision', 'image_generation', 'huggingface')),
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ai_usage_tracking
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_usage_tracking
CREATE POLICY "Users can view their own AI usage"
ON ai_usage_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI usage"
ON ai_usage_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_ai_usage_tracking_user_id_created_at 
ON ai_usage_tracking(user_id, created_at DESC);