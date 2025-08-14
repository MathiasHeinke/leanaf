-- TOTAL CLEANUP: Remove all old coaches (Lucy, Vita, Sascha, Kai) - Keep only FREYA and ARES

-- 1. Delete old coach personas
DELETE FROM public.coach_personas 
WHERE id IN ('persona_lucy', 'persona_vita', 'persona_sascha', 'persona_kai');

-- 2. Delete all knowledge base entries for old coaches
DELETE FROM public.knowledge_base_embeddings 
WHERE knowledge_id IN (
  SELECT id FROM public.coach_knowledge_base 
  WHERE coach_id IN ('lucy', 'vita', 'sascha', 'kai')
);

DELETE FROM public.coach_knowledge_base 
WHERE coach_id IN ('lucy', 'vita', 'sascha', 'kai');

-- 3. Delete all conversation memory for old coaches
DELETE FROM public.coach_conversation_memory 
WHERE coach_id IN ('lucy', 'vita', 'sascha', 'kai');

-- 4. Clean up any remaining coach-specific data
DELETE FROM public.coach_recommendations 
WHERE coach_id IN ('lucy', 'vita', 'sascha', 'kai');