
-- Dry-Run: heutige aufeinanderfolgende Assistant-Duplikate (Lucy)
WITH seq AS (
  SELECT
    id,
    user_id,
    coach_personality,
    created_at,
    message_role,
    message_content,
    LAG(message_role)    OVER (PARTITION BY user_id, coach_personality ORDER BY created_at)    AS prev_role,
    LAG(message_content) OVER (PARTITION BY user_id, coach_personality ORDER BY created_at)    AS prev_content
  FROM coach_conversations
  WHERE coach_personality = 'lucy'
    AND created_at::date = CURRENT_DATE
)
SELECT id, user_id, created_at, message_content
FROM seq
WHERE message_role = 'assistant'
  AND message_role = prev_role
  AND message_content = prev_content
ORDER BY created_at DESC;

-- Löschung: nur die erkannten Duplikate (heute, Lucy)
WITH dupe AS (
  SELECT id
  FROM (
    SELECT
      id,
      message_role,
      message_content,
      LAG(message_role)    OVER (PARTITION BY user_id, coach_personality ORDER BY created_at) AS prev_role,
      LAG(message_content) OVER (PARTITION BY user_id, coach_personality ORDER BY created_at) AS prev_content
    FROM coach_conversations
    WHERE coach_personality = 'lucy'
      AND created_at::date = CURRENT_DATE
  ) t
  WHERE message_role = 'assistant'
    AND message_role = prev_role
    AND message_content = prev_content
)
DELETE FROM coach_conversations
WHERE id IN (SELECT id FROM dupe);
