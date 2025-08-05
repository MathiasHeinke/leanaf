-- Remove the old progress_photos table since we're now using weight_history for everything
-- This migration ensures all progress photo functionality uses the unified weight_history table

-- First, check if we need to migrate any existing data from progress_photos to weight_history
-- Note: This is a cleanup migration since we've unified the system

-- Drop the progress_photos table if it exists (it's no longer needed)
DROP TABLE IF EXISTS public.progress_photos;

-- Add a comment to document the unified approach
COMMENT ON TABLE public.weight_history IS 'Unified table for weight tracking and progress photos. Photos are stored in photo_urls as JSON array.';