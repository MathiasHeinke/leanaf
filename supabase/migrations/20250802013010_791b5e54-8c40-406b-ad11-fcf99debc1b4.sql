-- Delete incomplete daily summaries for office@mathiasheinke.de
DELETE FROM daily_summaries
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'office@mathiasheinke.de'
)
AND summary_struct_json IS NULL;