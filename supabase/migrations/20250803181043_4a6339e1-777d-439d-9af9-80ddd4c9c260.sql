-- Grant Super Admin via subscription tier (bypasses role validation)
INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
VALUES (
  '84b0664f-0934-49ce-9c35-c99546b792bf', 
  'office@mathiasheinke.de', 
  true, 
  'Super Admin', 
  (CURRENT_TIMESTAMP + INTERVAL '10 years')::timestamptz
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  subscribed = true,
  subscription_tier = 'Super Admin',
  subscription_end = (CURRENT_TIMESTAMP + INTERVAL '10 years')::timestamptz;