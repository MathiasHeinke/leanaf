-- Fix api_rate_limits table with unique constraint
ALTER TABLE public.api_rate_limits 
ADD CONSTRAINT api_rate_limits_identifier_endpoint_unique 
UNIQUE (identifier, endpoint);

-- Clean up any potential duplicate entries first
DELETE FROM public.api_rate_limits a USING public.api_rate_limits b 
WHERE a.id < b.id 
AND a.identifier = b.identifier 
AND a.endpoint = b.endpoint;