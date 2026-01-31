-- Add synergies and blockers columns to supplement_products
ALTER TABLE public.supplement_products
ADD COLUMN IF NOT EXISTS synergies text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS blockers text[] DEFAULT '{}';