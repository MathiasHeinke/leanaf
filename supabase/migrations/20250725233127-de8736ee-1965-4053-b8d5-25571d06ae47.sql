-- Add new columns to sleep_tracking table for enhanced sleep and behavior tracking
ALTER TABLE public.sleep_tracking 
ADD COLUMN bedtime time,
ADD COLUMN wake_time time,
ADD COLUMN sleep_interruptions integer DEFAULT 0,
ADD COLUMN screen_time_evening integer DEFAULT 0,
ADD COLUMN morning_libido integer,
ADD COLUMN motivation_level integer,
ADD COLUMN last_meal_time time;

-- Add constraints for data validation
ALTER TABLE public.sleep_tracking 
ADD CONSTRAINT check_sleep_interruptions CHECK (sleep_interruptions >= 0 AND sleep_interruptions <= 20),
ADD CONSTRAINT check_screen_time_evening CHECK (screen_time_evening >= 0 AND screen_time_evening <= 600),
ADD CONSTRAINT check_morning_libido CHECK (morning_libido >= 1 AND morning_libido <= 10),
ADD CONSTRAINT check_motivation_level CHECK (motivation_level >= 1 AND motivation_level <= 10);

-- Add indexes for better query performance
CREATE INDEX idx_sleep_tracking_bedtime ON public.sleep_tracking(bedtime);
CREATE INDEX idx_sleep_tracking_wake_time ON public.sleep_tracking(wake_time);
CREATE INDEX idx_sleep_tracking_user_date ON public.sleep_tracking(user_id, date);

-- Add helpful comments
COMMENT ON COLUMN public.sleep_tracking.bedtime IS 'Time when user went to bed';
COMMENT ON COLUMN public.sleep_tracking.wake_time IS 'Time when user woke up';
COMMENT ON COLUMN public.sleep_tracking.sleep_interruptions IS 'Number of times user woke up during sleep (0-20)';
COMMENT ON COLUMN public.sleep_tracking.screen_time_evening IS 'Evening screen time in minutes (0-600)';
COMMENT ON COLUMN public.sleep_tracking.morning_libido IS 'Morning libido level (1-10 scale)';
COMMENT ON COLUMN public.sleep_tracking.motivation_level IS 'Morning motivation level (1-10 scale)';
COMMENT ON COLUMN public.sleep_tracking.last_meal_time IS 'Time of last meal before sleep';