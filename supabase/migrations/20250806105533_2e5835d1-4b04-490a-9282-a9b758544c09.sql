-- Add ai_generated_from_photo_id to target_images table to link AI images to original progress photos
ALTER TABLE public.target_images 
ADD COLUMN ai_generated_from_photo_id uuid;

-- Add comment for clarity
COMMENT ON COLUMN public.target_images.ai_generated_from_photo_id IS 'Links AI-generated target image to the original progress photo it was generated from';

-- Create index for better performance when querying linked photos
CREATE INDEX idx_target_images_ai_generated_from ON public.target_images(ai_generated_from_photo_id) WHERE ai_generated_from_photo_id IS NOT NULL;