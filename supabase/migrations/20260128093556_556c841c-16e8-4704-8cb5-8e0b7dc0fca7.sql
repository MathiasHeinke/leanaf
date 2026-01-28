-- Add deep sleep tracking column to sleep_tracking table
ALTER TABLE sleep_tracking 
ADD COLUMN deep_sleep_minutes INTEGER;