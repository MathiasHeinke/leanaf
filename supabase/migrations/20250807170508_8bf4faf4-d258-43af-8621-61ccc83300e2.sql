-- Create storage bucket for journal photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('journal-photos', 'journal-photos', true);

-- Create storage policies for journal photos
CREATE POLICY "Journal photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'journal-photos');

CREATE POLICY "Users can upload their own journal photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own journal photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own journal photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);