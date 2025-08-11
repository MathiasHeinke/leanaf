-- One-time cleanup of duplicate "already answered" messages
DELETE FROM coach_conversations 
WHERE message_role = 'assistant' 
  AND message_content LIKE '%ich habe dir bereits geantwortet%'
  AND id NOT IN (
    -- Keep only the most recent duplicate per conversation
    SELECT DISTINCT ON (conversation_id) id
    FROM coach_conversations
    WHERE message_role = 'assistant' 
      AND message_content LIKE '%ich habe dir bereits geantwortet%'
    ORDER BY conversation_id, created_at DESC
  );