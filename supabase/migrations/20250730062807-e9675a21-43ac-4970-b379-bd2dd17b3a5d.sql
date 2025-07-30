-- Fix coach data inconsistencies

-- 1. Add Dr. Sophia Integral (missing from database)
INSERT INTO public.coach_specializations (
    coach_id,
    name,
    specialization_description,
    core_philosophy,
    methodology,
    expertise_areas,
    knowledge_focus
) VALUES (
    'integral',
    'Dr. Sophia Integral - Die Integrative Gesundheitsexpertin',
    'Ganzheitliche Gesundheitsberatung mit Fokus auf die Integration von Körper, Geist und Seele',
    'Wahre Gesundheit entsteht durch das harmonische Zusammenspiel aller Lebensbereiche',
    'Integrative Medizin, Systemische Beratung, Achtsamkeitspraxis',
    ARRAY['Integrative Medizin', 'Stressmanagement', 'Work-Life-Balance', 'Präventivmedizin', 'Ganzheitliche Ernährung'],
    ARRAY['Integrative Gesundheitsansätze', 'Stress und Burnout Prävention', 'Mindfulness-Based Health', 'Systemische Gesundheitsberatung']
);

-- 2. Fix Dr. Vita Femina coach_id (change from 'dr_vita_femina' to 'dr_vita' to match route)
UPDATE public.coach_specializations 
SET coach_id = 'dr_vita'
WHERE coach_id = 'dr_vita_femina';

-- 3. Remove duplicate Markus entry (keep the 'markus' one, remove 'markus_ruehl')
DELETE FROM public.coach_specializations 
WHERE coach_id = 'markus_ruehl';