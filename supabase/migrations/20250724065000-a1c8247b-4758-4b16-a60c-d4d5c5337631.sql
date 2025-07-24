-- Create coach knowledge base table
CREATE TABLE public.coach_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id TEXT NOT NULL, -- 'sascha', 'lucy', 'kai'
  knowledge_type TEXT NOT NULL, -- 'core_principle', 'scientific_study', 'methodology', 'fact'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  scientific_paper_doi TEXT,
  tags TEXT[] DEFAULT '{}',
  expertise_area TEXT NOT NULL, -- 'nutrition', 'training', 'recovery', 'psychology'
  priority_level INTEGER DEFAULT 1, -- 1=highest, 5=lowest
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scientific papers table
CREATE TABLE public.scientific_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doi TEXT UNIQUE,
  title TEXT NOT NULL,
  authors TEXT[],
  abstract TEXT,
  publication_year INTEGER,
  journal TEXT,
  keywords TEXT[],
  coach_relevance JSONB DEFAULT '{}', -- {"sascha": 8, "lucy": 9, "kai": 5}
  full_text TEXT,
  key_findings TEXT[],
  practical_applications TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coach specializations table
CREATE TABLE public.coach_specializations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  expertise_areas TEXT[] NOT NULL,
  core_philosophy TEXT NOT NULL,
  specialization_description TEXT NOT NULL,
  knowledge_focus TEXT[],
  methodology TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scientific_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_specializations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coach_knowledge_base
CREATE POLICY "Anyone can view coach knowledge" 
ON public.coach_knowledge_base 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage coach knowledge" 
ON public.coach_knowledge_base 
FOR ALL 
USING (is_super_admin());

-- RLS Policies for scientific_papers
CREATE POLICY "Anyone can view scientific papers" 
ON public.scientific_papers 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage scientific papers" 
ON public.scientific_papers 
FOR ALL 
USING (is_super_admin());

-- RLS Policies for coach_specializations
CREATE POLICY "Anyone can view coach specializations" 
ON public.coach_specializations 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage coach specializations" 
ON public.coach_specializations 
FOR ALL 
USING (is_super_admin());

-- Add indexes for performance
CREATE INDEX idx_coach_knowledge_coach_id ON public.coach_knowledge_base(coach_id);
CREATE INDEX idx_coach_knowledge_expertise_area ON public.coach_knowledge_base(expertise_area);
CREATE INDEX idx_coach_knowledge_tags ON public.coach_knowledge_base USING GIN(tags);
CREATE INDEX idx_scientific_papers_doi ON public.scientific_papers(doi);
CREATE INDEX idx_scientific_papers_keywords ON public.scientific_papers USING GIN(keywords);
CREATE INDEX idx_coach_specializations_coach_id ON public.coach_specializations(coach_id);

-- Insert initial coach specializations
INSERT INTO public.coach_specializations (coach_id, name, expertise_areas, core_philosophy, specialization_description, knowledge_focus, methodology) VALUES
(
  'lucy',
  'Lucy - Die 80/20+ Expertin',
  ARRAY['nutrition', 'lifestyle_medicine', 'hormonal_balance'],
  '80% Ernährung, 20% Bewegung & Schlaf für optimale Transformation',
  'Ernährungswissenschaftlerin mit Fokus auf Lifestyle-Medizin. Bekannt für ihre 80/20+ Regel, die besagt, dass 80% der Transformation durch richtige Ernährung und 20% durch Bewegung und Erholung erreicht wird.',
  ARRAY['anti_inflammatory_nutrition', 'nutrient_timing', 'circadian_nutrition', 'hormonal_optimization', 'metabolic_flexibility'],
  'Evidenzbasierte Ernährungsstrategien mit Fokus auf nachhaltige Lifestyle-Veränderungen'
),
(
  'sascha',
  'Sascha - Der Performance Optimizer',
  ARRAY['exercise_science', 'strength_training', 'physiology'],
  'High-Intensity Training mit militärischer Disziplin für maximale Effizienz',
  'Sportwissenschaftler und ehemaliger Militärtrainer. Spezialisiert auf hocheffiziente Trainingsmethoden und Performance-Optimierung durch systematisches, diszipliniertes Vorgehen.',
  ARRAY['periodization', 'vo2max_optimization', 'biomechanics', 'hiit_protocols', 'strength_endurance'],
  'Periodisierte Trainingsplanung mit Fokus auf messbare Leistungssteigerungen'
),
(
  'kai',
  'Kai - Der Mindset & Recovery Spezialist',
  ARRAY['sports_psychology', 'recovery_science', 'sleep_optimization'],
  'Mental Performance und Smart Recovery für nachhaltige Transformation',
  'Sportpsychologe und Regenerationsexperte. Fokussiert auf die mentalen Aspekte der Transformation und optimale Erholungsstrategien für langfristigen Erfolg.',
  ARRAY['neuroplasticity', 'habit_formation', 'sleep_science', 'stress_management', 'motivation_psychology'],
  'Ganzheitlicher Ansatz mit Fokus auf mentale Stärke und optimale Regeneration'
);

-- Insert some initial knowledge base entries for Lucy (80/20+ Regel)
INSERT INTO public.coach_knowledge_base (coach_id, knowledge_type, title, content, expertise_area, priority_level, tags) VALUES
(
  'lucy',
  'core_principle',
  'Die 80/20+ Regel',
  'Lucys Kernprinzip besagt, dass 80% der Körpertransformation durch die richtige Ernährung erreicht wird, während 20% durch Bewegung und Erholung kommen. Diese Regel basiert auf der Erkenntnis, dass Ernährung den größten Einfluss auf Körperkomposition, Energielevel und Gesundheit hat.',
  'nutrition',
  1,
  ARRAY['80_20_rule', 'nutrition_priority', 'transformation']
),
(
  'lucy',
  'methodology',
  'Anti-inflammatorische Ernährung',
  'Lucy fokussiert auf anti-inflammatorische Lebensmittel als Basis für nachhaltige Gesundheit. Omega-3-reiche Fische, buntes Gemüse, Beeren und Gewürze wie Kurkuma bilden die Grundlage ihrer Ernährungsempfehlungen.',
  'nutrition',
  1,
  ARRAY['anti_inflammatory', 'omega_3', 'phytonutrients']
),
(
  'sascha',
  'core_principle',
  'Militärische Effizienz',
  'Saschas Ansatz basiert auf militärischer Disziplin: Maximale Ergebnisse in minimaler Zeit durch strukturierte, hochintensive Trainingseinheiten. Kein Zeitverschwendung, nur bewährte, wissenschaftlich fundierte Methoden.',
  'training',
  1,
  ARRAY['military_training', 'efficiency', 'hiit']
),
(
  'kai',
  'core_principle',
  'Mindset First',
  'Kai glaubt, dass jede erfolgreiche Transformation im Kopf beginnt. Ohne die richtige mentale Einstellung und Gewohnheiten scheitern auch die besten Ernährungs- und Trainingspläne.',
  'psychology',
  1,
  ARRAY['mindset', 'habits', 'psychology']
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_coach_knowledge_base_updated_at
BEFORE UPDATE ON public.coach_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scientific_papers_updated_at
BEFORE UPDATE ON public.scientific_papers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_specializations_updated_at
BEFORE UPDATE ON public.coach_specializations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();