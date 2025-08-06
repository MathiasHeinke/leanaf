-- Add image_category to target_images table
ALTER TABLE public.target_images 
ADD COLUMN image_category text DEFAULT 'unspecified' CHECK (image_category IN ('front', 'back', 'side_left', 'side_right', 'unspecified'));

-- Add image_category to weight_history table for progress photos
ALTER TABLE public.weight_history 
ADD COLUMN image_category text DEFAULT 'unspecified' CHECK (image_category IN ('front', 'back', 'side_left', 'side_right', 'unspecified'));

-- Create index for better performance on category filtering
CREATE INDEX idx_target_images_category ON public.target_images(user_id, image_category, is_active);
CREATE INDEX idx_weight_history_category ON public.weight_history(user_id, image_category, date);