-- Create storage bucket for coach media uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('coach-media', 'coach-media', true);

-- Create policies for coach media uploads
CREATE POLICY "Users can upload their own coach media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'coach-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own coach media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'coach-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own coach media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'coach-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own coach media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'coach-media' AND auth.uid()::text = (storage.foldername(name))[1]);