-- Create storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-images', 'exercise-images', true);

-- Create storage policies for exercise images
CREATE POLICY "Exercise images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'exercise-images');

CREATE POLICY "Users can upload exercise images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'exercise-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own exercise images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'exercise-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own exercise images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'exercise-images' AND auth.uid() IS NOT NULL);