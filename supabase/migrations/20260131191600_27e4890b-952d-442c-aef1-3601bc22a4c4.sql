-- Create enum for submission status
CREATE TYPE product_submission_status AS ENUM (
  'pending', 
  'approved', 
  'rejected', 
  'duplicate', 
  'invalid'
);

-- Create product_submissions table for community product submissions
CREATE TABLE public.product_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  supplement_id UUID REFERENCES public.supplement_database(id) ON DELETE SET NULL,
  status product_submission_status DEFAULT 'pending' NOT NULL,
  extracted_data JSONB,
  product_name TEXT,
  brand_name TEXT,
  price_eur NUMERIC(10,2),
  servings INTEGER,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_product_id UUID REFERENCES public.supplement_products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate submissions from same user
  CONSTRAINT unique_user_url UNIQUE(user_id, submitted_url)
);

-- Enable RLS
ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.product_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert submissions
CREATE POLICY "Users can submit products"
  ON public.product_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all submissions (check admin_emails table)
CREATE POLICY "Admins can view all submissions"
  ON public.product_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails 
      WHERE email = auth.jwt() ->> 'email' 
      AND is_active = true
    )
  );

-- Admins can update submissions (for review)
CREATE POLICY "Admins can update submissions"
  ON public.product_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails 
      WHERE email = auth.jwt() ->> 'email' 
      AND is_active = true
    )
  );

-- Index for pending review queue
CREATE INDEX idx_product_submissions_pending 
  ON public.product_submissions(status) 
  WHERE status = 'pending';

-- Index for user submissions lookup
CREATE INDEX idx_product_submissions_user 
  ON public.product_submissions(user_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_product_submissions_updated_at
  BEFORE UPDATE ON public.product_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();