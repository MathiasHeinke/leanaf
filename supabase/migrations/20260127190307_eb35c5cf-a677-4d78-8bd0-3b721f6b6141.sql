-- Add new profile fields for ARES Protocol reorganization

-- Protocol mode (natural/enhanced/clinical)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS protocol_mode text DEFAULT 'natural' 
CHECK (protocol_mode IN ('natural', 'enhanced', 'clinical'));

-- Weekly training sessions for better TDEE calculation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weekly_training_sessions integer DEFAULT 3 
CHECK (weekly_training_sessions >= 0 AND weekly_training_sessions <= 14);

-- Longevity settings (Phase 3+)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rapamycin_day text DEFAULT 'sunday'
CHECK (rapamycin_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fasting_protocol text DEFAULT '16:8'
CHECK (fasting_protocol IN ('16:8', '24h', 'extended'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS track_dunedin_pace boolean DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS track_senolytics boolean DEFAULT false;

-- Add index for protocol mode queries
CREATE INDEX IF NOT EXISTS idx_profiles_protocol_mode ON public.profiles(protocol_mode);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.protocol_mode IS 'ARES Protocol mode: natural (diet only), enhanced (GLP-1/peptides), clinical (TRT+)';
COMMENT ON COLUMN public.profiles.weekly_training_sessions IS 'Training sessions per week for improved TDEE calculation';
COMMENT ON COLUMN public.profiles.rapamycin_day IS 'Weekly Rapamycin intake day for Phase 3 users';
COMMENT ON COLUMN public.profiles.fasting_protocol IS 'Fasting protocol: 16:8 daily, 24h weekly, extended quarterly';
COMMENT ON COLUMN public.profiles.track_dunedin_pace IS 'Enable DunedinPACE biological age tracking';
COMMENT ON COLUMN public.profiles.track_senolytics IS 'Enable Fisetin/Quercetin senolytic cycle tracking';