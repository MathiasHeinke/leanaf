-- Create storage bucket for meal images
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-images', 'meal-images', true);

-- Create policies for meal images storage
CREATE POLICY "Users can upload their own meal images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own meal images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own meal images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create meal_images table to store image references
CREATE TABLE public.meal_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.meal_images ENABLE ROW LEVEL SECURITY;

-- Create policies for meal_images table
CREATE POLICY "Users can view their own meal images" 
ON public.meal_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal images" 
ON public.meal_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal images" 
ON public.meal_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal images" 
ON public.meal_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_meal_images_updated_at
BEFORE UPDATE ON public.meal_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();