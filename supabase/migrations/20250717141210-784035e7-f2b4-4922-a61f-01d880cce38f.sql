-- Create table for men's quotes
CREATE TABLE public.men_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_text TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (no restrictions needed as quotes are public)
ALTER TABLE public.men_quotes ENABLE ROW LEVEL SECURITY;

-- Create policy for reading quotes (everyone can read)
CREATE POLICY "Anyone can read quotes" 
ON public.men_quotes 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_men_quotes_updated_at
BEFORE UPDATE ON public.men_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();