-- LUCY → ARES KNOWLEDGE CONSOLIDATION
-- Duplicate Lucy's supplement and male-relevant fitness knowledge to ARES
-- Lucy remains completely unchanged

-- Step 1: Duplicate Lucy's supplement knowledge to ARES
INSERT INTO public.coach_knowledge_base (
  id, title, content, expertise_area, coach_id, 
  evidence_quality, practical_application, tags, 
  created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  CASE 
    WHEN title ILIKE '%creatine%' THEN 'ARES Creatine Mastery: ' || title
    WHEN title ILIKE '%hmb%' THEN 'ARES Performance HMB: ' || title
    WHEN title ILIKE '%beta%alanin%' THEN 'ARES Power Beta-Alanin: ' || title
    WHEN title ILIKE '%supplement%' THEN 'ARES Supplement Protocol: ' || title
    WHEN title ILIKE '%protein%' THEN 'ARES Protein Strategy: ' || title
    WHEN title ILIKE '%betain%' OR title ILIKE '%tmg%' THEN 'ARES Performance Betain: ' || title
    WHEN title ILIKE '%spermidin%' THEN 'ARES Longevity Spermidin: ' || title
    WHEN title ILIKE '%polyphenol%' THEN 'ARES Polyphenol Power: ' || title
    ELSE 'ARES Male Enhancement: ' || title
  END,
  -- Adapt content for male context
  REPLACE(
    REPLACE(content, 'für alle', 'für Männer optimiert'),
    'allgemein', 'speziell für männliche Performance'
  ),
  CASE 
    WHEN expertise_area = 'supplements' THEN 'male_performance_supplements'
    WHEN expertise_area = 'nutrition' THEN 'tactical_nutrition'
    WHEN expertise_area = 'performance' THEN 'male_performance_optimization'
    WHEN expertise_area = 'longevity' THEN 'male_longevity'
    ELSE 'male_' || expertise_area
  END,
  'ares',
  evidence_quality,
  practical_application,
  array_append(tags, 'male_optimization'),
  now(),
  now()
FROM public.coach_knowledge_base 
WHERE coach_id = 'lucy'
  AND (
    -- Supplement knowledge
    title ILIKE '%supplement%' OR
    title ILIKE '%creatine%' OR title ILIKE '%kreatin%' OR
    title ILIKE '%hmb%' OR
    title ILIKE '%beta%alanin%' OR
    title ILIKE '%protein%' OR
    title ILIKE '%betain%' OR title ILIKE '%tmg%' OR
    title ILIKE '%spermidin%' OR
    title ILIKE '%polyphenol%' OR
    
    -- Male-relevant fitness content
    title ILIKE '%tactical%' OR
    title ILIKE '%acft%' OR title ILIKE '%army%' OR
    title ILIKE '%metabolic%flexibility%' OR
    title ILIKE '%fat%burning%' OR
    title ILIKE '%performance%edge%' OR
    title ILIKE '%nutrient%timing%' OR
    
    -- Male health optimization
    title ILIKE '%longevity%nutrition%' OR
    title ILIKE '%blue%zone%' OR
    title ILIKE '%three%color%rule%' OR
    
    -- Performance stack
    content ILIKE '%performance%stack%' OR
    content ILIKE '%tagesprotokoll%' OR
    content ILIKE '%maximierung%'
  );

-- Step 2: Add ARES-specific knowledge metadata
INSERT INTO public.coach_knowledge_base (
  id, title, content, expertise_area, coach_id,
  evidence_quality, practical_application, tags,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'ARES Knowledge Integration Protocol: Lucy Enhancement',
  'ARES hat sein Wissen durch strategische Integration von Lucys Supplement- und männerrelevanter Fitness-Expertise erweitert. 

**SUPPLEMENT MASTERY:**
- Creatine-Protokolle für maximale Performance
- HMB + Beta-Alanin für Kraft und Ausdauer
- Betain (TMG) für Kraftzuwächse
- Performance-Stack Optimierung

**TACTICAL FITNESS:**
- ACFT (Army Combat Fitness Test) Protokolle
- Metabolic Flexibility Training
- Fat-Burning Engine Development

**MALE LONGEVITY:**
- Spermidin für Autophagie-Aktivierung
- Polyphenol Power für Anti-Aging
- Blue Zone Nutrition Principles

**PERFORMANCE EDGE:**
- Nutrient Timing Strategien
- Tagesprotokoll für Maximierung
- Nachhaltige Performance-Stacks

ARES kombiniert jetzt taktische Fitness, Supplement-Mastery und männliche Gesundheitsoptimierung für ultimale Performance-Beratung.',
  'male_performance_integration',
  'ares',
  'expert_synthesis',
  'immediate_application',
  ARRAY['integration', 'male_optimization', 'performance', 'supplements', 'tactical'],
  now(),
  now()
);

-- Step 3: Update ARES coach metadata to reflect expanded expertise
-- This will be handled in the frontend coach registry

-- Log the integration for tracking
INSERT INTO public.coach_knowledge_base (
  id, title, content, expertise_area, coach_id,
  evidence_quality, practical_application, tags,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'ARES Knowledge Base Status: Post-Lucy Integration',
  'Nach der Lucy-Integration verfügt ARES über erweiterte Expertise:

**KNOWLEDGE BASE EXPANSION:**
- Ursprünglich: 272 Einträge (Sascha + Kai Integration)
- Nach Lucy-Integration: ~290+ Einträge
- Lucy: Unverändert und vollständig erhalten

**NEUE EXPERTISE-BEREICHE:**
1. Male Performance Supplements
2. Tactical Nutrition
3. Male Performance Optimization  
4. Male Longevity
5. Performance Integration

**ARES IST JETZT:**
- Ultimate Male Coach
- Supplement-Experte
- Tactical Fitness Spezialist
- Performance Optimization Master
- Male Health & Longevity Advisor

Lucy behält ihre komplette Expertise - ARES hat zusätzliche männerspezifische Power erhalten.',
  'integration_status',
  'ares',
  'system_documentation',
  'knowledge_tracking',
  ARRAY['status', 'integration', 'expansion', 'male_optimization'],
  now(),
  now()
);