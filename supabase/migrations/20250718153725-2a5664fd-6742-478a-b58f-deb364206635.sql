-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can upload their own meal images" ON storage.objects;

-- Create new, more robust policy for meal image uploads
CREATE POLICY "Users can upload their own meal images" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (
  bucket_id = 'meal-images' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Also recreate the SELECT policy with the same fix
DROP POLICY IF EXISTS "Users can view their own meal images" ON storage.objects;

CREATE POLICY "Users can view their own meal images" 
ON storage.objects 
FOR SELECT 
TO public 
USING (
  bucket_id = 'meal-images' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- And the DELETE policy
DROP POLICY IF EXISTS "Users can delete their own meal images" ON storage.objects;

CREATE POLICY "Users can delete their own meal images" 
ON storage.objects 
FOR DELETE 
TO public 
USING (
  bucket_id = 'meal-images' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);