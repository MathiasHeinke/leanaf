-- Create table to log credit payments and prevent double application
CREATE TABLE IF NOT EXISTS public.credit_payments_log (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  pack TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_payments_log ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own payment logs
CREATE POLICY IF NOT EXISTS "select_own_credit_payments" ON public.credit_payments_log
FOR SELECT USING (user_id = auth.uid());

-- Create function to add credits atomically
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_credits integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'Credits to add must be a positive integer';
  END IF;

  -- Ensure the credits row exists and is up-to-date
  PERFORM public._ensure_user_credits();

  UPDATE public.user_credits
  SET credits_remaining = credits_remaining + p_credits,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits_remaining INTO v_remaining;

  RETURN jsonb_build_object(
    'success', TRUE,
    'credits_remaining', v_remaining,
    'added', p_credits
  );
END;
$$;