-- LUCY → ARES KNOWLEDGE CONSOLIDATION (CORRECTED)
-- Duplicate Lucy's supplement and male-relevant fitness knowledge to ARES
-- Lucy remains completely unchanged

-- Step 1: Duplicate Lucy's supplement knowledge to ARES
INSERT INTO public.coach_knowledge_base (
  id, coach_id, knowledge_type, title, content, expertise_area,
  source_url, scientific_paper_doi, tags, priority_level,
  created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'ares',
  knowledge_type,
  CASE 
    WHEN title ILIKE '%creatine%' THEN 'ARES Creatine Mastery: ' || title
    WHEN title ILIKE '%hmb%' THEN 'ARES Performance HMB: ' || title
    WHEN title ILIKE '%beta%alanin%' THEN 'ARES Power Beta-Alanin: ' || title
    WHEN title ILIKE '%supplement%' THEN 'ARES Supplement Protocol: ' || title
    WHEN title ILIKE '%protein%' THEN 'ARES Protein Strategy: ' || title
    WHEN title ILIKE '%betain%' OR title ILIKE '%tmg%' THEN 'ARES Performance Betain: ' || title
    WHEN title ILIKE '%spermidin%' THEN 'ARES Longevity Spermidin: ' || title
    WHEN title ILIKE '%polyphenol%' THEN 'ARES Polyphenol Power: ' || title
    WHEN title ILIKE '%tactical%' THEN 'ARES Tactical: ' || title
    WHEN title ILIKE '%acft%' OR title ILIKE '%army%' THEN 'ARES Military Performance: ' || title
    WHEN title ILIKE '%metabolic%' THEN 'ARES Metabolic: ' || title
    WHEN title ILIKE '%longevity%' THEN 'ARES Male Longevity: ' || title
    ELSE 'ARES Male Enhancement: ' || title
  END,
  -- Adapt content for male context
  REPLACE(
    REPLACE(
      REPLACE(content, 'für alle', 'für Männer optimiert'),
      'allgemein', 'speziell für männliche Performance'
    ),
    'Frauen und Männer', 'Männer'
  ),
  CASE 
    WHEN expertise_area = 'supplements' THEN 'male_performance_supplements'
    WHEN expertise_area = 'nutrition' THEN 'tactical_nutrition'
    WHEN expertise_area = 'performance' THEN 'male_performance_optimization'
    WHEN expertise_area = 'longevity' THEN 'male_longevity'
    WHEN expertise_area = 'training' THEN 'tactical_training'
    ELSE 'male_' || expertise_area
  END,
  source_url,
  scientific_paper_doi,
  CASE 
    WHEN tags IS NULL THEN ARRAY['male_optimization']
    ELSE array_append(tags, 'male_optimization')
  END,
  COALESCE(priority_level, 5),
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
    content ILIKE '%maximierung%' OR
    
    -- General male-relevant nutrition and training
    (expertise_area IN ('nutrition', 'training', 'performance') AND 
     (content ILIKE '%kraft%' OR content ILIKE '%muscle%' OR 
      content ILIKE '%testosteron%' OR content ILIKE '%hormon%'))
  );

-- Step 2: Add ARES-specific knowledge metadata entries
INSERT INTO public.coach_knowledge_base (
  id, coach_id, knowledge_type, title, content, expertise_area,
  tags, priority_level, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  'ares',
  'integration_protocol',
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
  ARRAY['integration', 'male_optimization', 'performance', 'supplements', 'tactical'],
  1,
  now(),
  now()
),
(
  gen_random_uuid(),
  'ares', 
  'status_documentation',
  'ARES Knowledge Base Status: Post-Lucy Integration',
  'Nach der Lucy-Integration verfügt ARES über erweiterte Expertise:

**KNOWLEDGE BASE EXPANSION:**
- Ursprünglich: 272 Einträge (Sascha + Kai Integration)
- Nach Lucy-Integration: ~310+ Einträge
- Lucy: Unverändert und vollständig erhalten

**NEUE EXPERTISE-BEREICHE:**
1. Male Performance Supplements
2. Tactical Nutrition
3. Male Performance Optimization
4. Male Longevity
5. Tactical Training
6. Performance Integration

**ARES IST JETZT DER ULTIMATE MALE COACH:**
- Supplement-Experte (Creatine, HMB, Beta-Alanin, Betain)
- Tactical Fitness Spezialist (ACFT, Military Performance)
- Performance Optimization Master (Nutrient Timing, Metabolic Flexibility)
- Male Health & Longevity Advisor (Spermidin, Polyphenole, Blue Zone)
- Hormon-Optimierung (Testosteron, männerspezifische Gesundheit)

Lucy behält ihre komplette Expertise - ARES hat zusätzliche männerspezifische Power erhalten.',
  'integration_status', 
  ARRAY['status', 'integration', 'expansion', 'male_optimization'],
  1,
  now(),
  now()
);