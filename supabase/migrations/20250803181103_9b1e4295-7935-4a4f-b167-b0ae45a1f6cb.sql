-- First check if user exists, then update or insert
DO $$
BEGIN
  -- Try to update existing record
  UPDATE subscribers 
  SET subscribed = true,
      subscription_tier = 'Super Admin',
      subscription_end = (CURRENT_TIMESTAMP + INTERVAL '10 years')::timestamptz
  WHERE user_id = '84b0664f-0934-49ce-9c35-c99546b792bf';
  
  -- If no record was updated, insert new one
  IF NOT FOUND THEN
    INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
    VALUES (
      '84b0664f-0934-49ce-9c35-c99546b792bf', 
      'office@mathiasheinke.de', 
      true, 
      'Super Admin', 
      (CURRENT_TIMESTAMP + INTERVAL '10 years')::timestamptz
    );
  END IF;
END $$;