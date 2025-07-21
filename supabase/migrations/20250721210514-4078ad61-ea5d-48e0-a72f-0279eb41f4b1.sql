-- Update the check constraint for sleep_quality to allow values 1-10
ALTER TABLE public.sleep_tracking 
DROP CONSTRAINT sleep_tracking_sleep_quality_check;

ALTER TABLE public.sleep_tracking 
ADD CONSTRAINT sleep_tracking_sleep_quality_check 
CHECK (sleep_quality >= 1 AND sleep_quality <= 10);