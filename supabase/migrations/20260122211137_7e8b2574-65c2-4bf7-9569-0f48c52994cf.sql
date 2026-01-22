-- ARES-Only Consolidation: Migrate all coach references to 'ares'

-- 1. Normalize all coach_conversations to 'ares'
UPDATE coach_conversations 
SET coach_personality = 'ares' 
WHERE coach_personality IS DISTINCT FROM 'ares';

-- 2. Normalize all coach_memory entries to 'ares'
UPDATE coach_memory 
SET coach_id = 'ares' 
WHERE coach_id IS DISTINCT FROM 'ares' OR coach_id IS NULL;

-- 3. Normalize chat_history to 'ares'
UPDATE chat_history 
SET coach_personality = 'ares' 
WHERE coach_personality IS DISTINCT FROM 'ares';

-- 4. Clean up duplicate coach_memory entries (keep newest per user)
DELETE FROM coach_memory a
USING coach_memory b
WHERE a.user_id = b.user_id 
  AND a.updated_at < b.updated_at;

-- 5. Create unique constraint on coach_memory (user_id only since all are now 'ares')
CREATE UNIQUE INDEX IF NOT EXISTS coach_memory_user_unique 
ON coach_memory (user_id);