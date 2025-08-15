-- Fix RLS policy for meal-images bucket to include WITH CHECK for proper user folder validation
DROP POLICY IF EXISTS "Allow meal image uploads" ON storage.objects;

CREATE POLICY "Allow meal image uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'meal-images' 
    AND auth.uid() IS NOT NULL 
    AND (auth.uid())::text = split_part(name, '/', 1)
  );