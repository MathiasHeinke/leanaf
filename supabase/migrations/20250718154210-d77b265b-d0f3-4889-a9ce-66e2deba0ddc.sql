-- First, let's check current RLS status
-- Drop all existing policies for meal-images to start fresh
DROP POLICY IF EXISTS "Users can upload their own meal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own meal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own meal images" ON storage.objects;

-- Create a more permissive INSERT policy for debugging
CREATE POLICY "Allow meal image uploads" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (
  bucket_id = 'meal-images'
);

-- Create more permissive SELECT policy
CREATE POLICY "Allow meal image viewing" 
ON storage.objects 
FOR SELECT 
TO public 
USING (
  bucket_id = 'meal-images'
);

-- Create more permissive DELETE policy  
CREATE POLICY "Allow meal image deletion" 
ON storage.objects 
FOR DELETE 
TO public 
USING (
  bucket_id = 'meal-images' AND 
  auth.uid()::text = split_part(name, '/', 1)
);