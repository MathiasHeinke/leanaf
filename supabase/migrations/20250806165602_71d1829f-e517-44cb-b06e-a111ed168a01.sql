-- Add foreign key constraint for photo linking
ALTER TABLE target_images 
ADD CONSTRAINT fk_target_images_progress_photo 
FOREIGN KEY (ai_generated_from_photo_id) 
REFERENCES weight_history(id) 
ON DELETE SET NULL;