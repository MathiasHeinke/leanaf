-- 1. Duplikate entfernen (nur neuesten Eintrag pro user_id/coach_id behalten)
DELETE FROM coach_memory 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, COALESCE(coach_id, 'default')) id 
  FROM coach_memory 
  ORDER BY user_id, COALESCE(coach_id, 'default'), updated_at DESC
);

-- 2. UNIQUE Constraint hinzufügen (mit COALESCE für NULL coach_id)
CREATE UNIQUE INDEX IF NOT EXISTS coach_memory_user_coach_unique 
ON coach_memory (user_id, COALESCE(coach_id, 'default'));