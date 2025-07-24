-- Phase 3: Implement comprehensive server-side rate limiting

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL, -- function name or endpoint
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create composite index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint_window 
ON public.api_rate_limits (identifier, endpoint, window_start);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit data
CREATE POLICY "Admins can view rate limits" ON public.api_rate_limits
FOR SELECT USING (is_admin_by_email());

-- Create enhanced rate limiting function with progressive delays
CREATE OR REPLACE FUNCTION public.check_and_update_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_window_minutes INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER := 0;
  v_allowed BOOLEAN := TRUE;
  v_retry_after INTEGER := 0;
BEGIN
  -- Calculate current window start
  v_window_start := date_trunc('hour', now()) + 
    (EXTRACT(epoch FROM now() - date_trunc('hour', now()))::INTEGER / (p_window_minutes * 60)) * 
    (p_window_minutes * 60) * INTERVAL '1 second';
  
  -- Get or create rate limit record
  INSERT INTO public.api_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, v_window_start)
  ON CONFLICT (identifier, endpoint) DO UPDATE SET
    request_count = CASE 
      WHEN api_rate_limits.window_start < v_window_start THEN 1
      ELSE api_rate_limits.request_count + 1
    END,
    window_start = GREATEST(api_rate_limits.window_start, v_window_start),
    updated_at = now()
  RETURNING request_count INTO v_current_count;
  
  -- Check if limit exceeded
  IF v_current_count > p_max_requests THEN
    v_allowed := FALSE;
    -- Progressive retry delay (exponential backoff)
    v_retry_after := LEAST(60 * p_window_minutes, 60 * POWER(2, (v_current_count - p_max_requests)));
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_current_count,
    'limit', p_max_requests,
    'window_minutes', p_window_minutes,
    'retry_after_seconds', v_retry_after,
    'window_start', v_window_start
  );
END;
$$;

-- Add cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM public.api_rate_limits 
  WHERE window_start < (now() - INTERVAL '24 hours');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Create function to analyze suspicious activity patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
  p_identifier TEXT,
  p_time_window_minutes INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_requests INTEGER := 0;
  v_unique_endpoints INTEGER := 0;
  v_suspicious BOOLEAN := FALSE;
  v_patterns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Count total requests in time window
  SELECT 
    COALESCE(SUM(request_count), 0),
    COUNT(DISTINCT endpoint)
  INTO v_total_requests, v_unique_endpoints
  FROM public.api_rate_limits
  WHERE identifier = p_identifier
    AND window_start >= (now() - (p_time_window_minutes || ' minutes')::INTERVAL);
  
  -- Detect suspicious patterns
  IF v_total_requests > 1000 THEN
    v_suspicious := TRUE;
    v_patterns := array_append(v_patterns, 'HIGH_VOLUME');
  END IF;
  
  IF v_unique_endpoints > 10 THEN
    v_suspicious := TRUE;
    v_patterns := array_append(v_patterns, 'ENDPOINT_SCANNING');
  END IF;
  
  -- Log suspicious activity
  IF v_suspicious THEN
    INSERT INTO public.security_events (
      event_type,
      event_category,
      severity,
      metadata
    ) VALUES (
      'suspicious_api_activity',
      'security',
      'warning',
      jsonb_build_object(
        'identifier', p_identifier,
        'total_requests', v_total_requests,
        'unique_endpoints', v_unique_endpoints,
        'patterns', v_patterns,
        'time_window_minutes', p_time_window_minutes
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'suspicious', v_suspicious,
    'total_requests', v_total_requests,
    'unique_endpoints', v_unique_endpoints,
    'patterns', v_patterns
  );
END;
$$;