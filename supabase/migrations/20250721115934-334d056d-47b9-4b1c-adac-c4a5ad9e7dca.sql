
-- Add the missing updated_at column to weight_history table
ALTER TABLE public.weight_history 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Update existing records to have the updated_at value
UPDATE public.weight_history 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Recreate the trigger to ensure it works properly
DROP TRIGGER IF EXISTS update_weight_history_updated_at ON public.weight_history;

CREATE TRIGGER update_weight_history_updated_at
  BEFORE UPDATE ON public.weight_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
