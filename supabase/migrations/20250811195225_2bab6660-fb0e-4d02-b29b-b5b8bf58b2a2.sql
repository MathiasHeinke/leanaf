-- Cleanup duplicate "already answered" messages (fixed query)
DELETE FROM coach_conversations 
WHERE message_role = 'assistant' 
  AND message_content LIKE '%ich habe dir bereits geantwortet%'
  AND id NOT IN (
    -- Keep only the most recent duplicate per user per day
    SELECT DISTINCT ON (user_id, conversation_date) id
    FROM coach_conversations
    WHERE message_role = 'assistant' 
      AND message_content LIKE '%ich habe dir bereits geantwortet%'
    ORDER BY user_id, conversation_date, created_at DESC
  );