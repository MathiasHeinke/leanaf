-- Clean up outdated coach IDs and standardize coach references

-- 1. Remove 'integral' coach specialization (replaced by 'sophia')
DELETE FROM public.coach_specializations 
WHERE coach_id = 'integral';

-- 2. Update coach_knowledge_base to use standard coach IDs
UPDATE public.coach_knowledge_base 
SET coach_id = 'lucy' 
WHERE coach_id = 'soft';

UPDATE public.coach_knowledge_base 
SET coach_id = 'sascha' 
WHERE coach_id = 'hart';

UPDATE public.coach_knowledge_base 
SET coach_id = 'kai' 
WHERE coach_id = 'motivierend';

UPDATE public.coach_knowledge_base 
SET coach_id = 'dr_vita' 
WHERE coach_id IN ('vita', 'dr-vita');

UPDATE public.coach_knowledge_base 
SET coach_id = 'sophia' 
WHERE coach_id = 'integral';

-- 3. Update knowledge base embeddings to reference correct coach IDs
UPDATE public.knowledge_base_embeddings 
SET knowledge_id = (
    SELECT id FROM public.coach_knowledge_base 
    WHERE coach_knowledge_base.id = knowledge_base_embeddings.knowledge_id
) 
WHERE EXISTS (
    SELECT 1 FROM public.coach_knowledge_base 
    WHERE coach_knowledge_base.id = knowledge_base_embeddings.knowledge_id
);

-- 4. Clean up orphaned embeddings for deleted coaches
DELETE FROM public.knowledge_base_embeddings 
WHERE knowledge_id NOT IN (
    SELECT id FROM public.coach_knowledge_base
);

-- 5. Update coach_topic_configurations to use standard IDs
UPDATE public.coach_topic_configurations 
SET coach_id = 'lucy' 
WHERE coach_id = 'soft';

UPDATE public.coach_topic_configurations 
SET coach_id = 'sascha' 
WHERE coach_id = 'hart';

UPDATE public.coach_topic_configurations 
SET coach_id = 'kai' 
WHERE coach_id = 'motivierend';

UPDATE public.coach_topic_configurations 
SET coach_id = 'dr_vita' 
WHERE coach_id IN ('vita', 'dr-vita');

UPDATE public.coach_topic_configurations 
SET coach_id = 'sophia' 
WHERE coach_id = 'integral';

-- 6. Update coach_ratings to use standard IDs  
UPDATE public.coach_ratings 
SET coach_id = 'lucy' 
WHERE coach_id = 'soft';

UPDATE public.coach_ratings 
SET coach_id = 'sascha' 
WHERE coach_id = 'hart';

UPDATE public.coach_ratings 
SET coach_id = 'kai' 
WHERE coach_id = 'motivierend';

UPDATE public.coach_ratings 
SET coach_id = 'dr_vita' 
WHERE coach_id IN ('vita', 'dr-vita');

UPDATE public.coach_ratings 
SET coach_id = 'sophia' 
WHERE coach_id = 'integral';

-- 7. Update coach_recommendations to use standard IDs
UPDATE public.coach_recommendations 
SET coach_id = 'lucy' 
WHERE coach_id = 'soft';

UPDATE public.coach_recommendations 
SET coach_id = 'sascha' 
WHERE coach_id = 'hart';

UPDATE public.coach_recommendations 
SET coach_id = 'kai' 
WHERE coach_id = 'motivierend';

UPDATE public.coach_recommendations 
SET coach_id = 'dr_vita' 
WHERE coach_id IN ('vita', 'dr-vita');

UPDATE public.coach_recommendations 
SET coach_id = 'sophia' 
WHERE coach_id = 'integral';