-- Create storage bucket for AI target images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ai-target-images', 'ai-target-images', false);

-- Create RLS policies for ai-target-images bucket
CREATE POLICY "Users can view their own AI target images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ai-target-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own AI target images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ai-target-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own AI target images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'ai-target-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own AI target images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ai-target-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add new columns to target_images table
ALTER TABLE public.target_images 
ADD COLUMN is_cropped BOOLEAN DEFAULT false,
ADD COLUMN original_ai_url TEXT,
ADD COLUMN supabase_storage_path TEXT,
ADD COLUMN progress_photo_mapping JSONB DEFAULT '{}'::jsonb;