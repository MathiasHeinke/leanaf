-- Consolidate Vita knowledge base entries
-- Update all dr_vita_femina and dr_vita entries to use 'vita' as coach_id

UPDATE coach_knowledge_base 
SET coach_id = 'vita' 
WHERE coach_id IN ('dr_vita_femina', 'dr_vita');

-- Verify the consolidation
-- This will be executed as part of the migration verification