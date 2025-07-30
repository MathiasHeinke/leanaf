-- Create medical conditions library
CREATE TABLE public.medical_conditions_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  fitness_considerations TEXT,
  contraindications TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medications library
CREATE TABLE public.medications_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  active_ingredient TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  fitness_considerations TEXT,
  exercise_interactions TEXT[],
  nutrition_interactions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user medical profile
CREATE TABLE public.user_medical_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_medical_conditions BOOLEAN NOT NULL DEFAULT false,
  takes_medications BOOLEAN NOT NULL DEFAULT false,
  medical_conditions UUID[] DEFAULT '{}',
  custom_conditions TEXT[],
  medications UUID[] DEFAULT '{}',
  custom_medications TEXT[],
  risk_assessment JSONB DEFAULT '{}',
  medical_notes TEXT,
  screening_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add medical fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_screening_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_risk_level TEXT DEFAULT 'unknown' CHECK (medical_risk_level IN ('unknown', 'low', 'medium', 'high', 'critical'));

-- Enable RLS
ALTER TABLE public.medical_conditions_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_medical_profile ENABLE ROW LEVEL SECURITY;

-- Create policies for medical_conditions_library
CREATE POLICY "Anyone can view medical conditions library" 
ON public.medical_conditions_library 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage medical conditions library" 
ON public.medical_conditions_library 
FOR ALL 
USING (is_super_admin());

-- Create policies for medications_library
CREATE POLICY "Anyone can view medications library" 
ON public.medications_library 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage medications library" 
ON public.medications_library 
FOR ALL 
USING (is_super_admin());

-- Create policies for user_medical_profile
CREATE POLICY "Users can view their own medical profile" 
ON public.user_medical_profile 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own medical profile" 
ON public.user_medical_profile 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical profile" 
ON public.user_medical_profile 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical profile" 
ON public.user_medical_profile 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view medical profiles for health-aware coaching" 
ON public.user_medical_profile 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = user_medical_profile.user_id
  ) OR 
  ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
);

-- Create triggers for updated_at
CREATE TRIGGER update_medical_conditions_library_updated_at
BEFORE UPDATE ON public.medical_conditions_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medications_library_updated_at
BEFORE UPDATE ON public.medications_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_medical_profile_updated_at
BEFORE UPDATE ON public.user_medical_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert common medical conditions with properly cast empty arrays
INSERT INTO public.medical_conditions_library (name, category, risk_level, fitness_considerations, contraindications) VALUES
-- Cardiovascular conditions
('Bluthochdruck (Hypertonie)', 'Cardiovascular', 'medium', 'Moderates Training empfohlen, Blutdruck regelmäßig überwachen', ARRAY['Hochintensives Training ohne ärztliche Freigabe']),
('Herzrhythmusstörungen', 'Cardiovascular', 'high', 'Ärztliche Freigabe erforderlich, Herzfrequenz überwachen', ARRAY['Intensive Ausdauertraining', 'Hochintensive Intervalle']),
('Koronare Herzkrankheit', 'Cardiovascular', 'critical', 'Nur unter ärztlicher Aufsicht', ARRAY['Unüberwachtes Training', 'Maximale Belastung']),
('Herzinfarkt (Anamnese)', 'Cardiovascular', 'critical', 'Kardiale Rehabilitation erforderlich', ARRAY['Training ohne Reha-Freigabe']),

-- Metabolic conditions  
('Diabetes Typ 1', 'Metabolic', 'high', 'Blutzucker vor/nach Training kontrollieren, Insulin anpassen', ARRAY['Training ohne Blutzuckerkontrolle']),
('Diabetes Typ 2', 'Metabolic', 'medium', 'Regelmäßige Blutzuckerkontrolle, schrittweise Steigerung', ARRAY['Extreme Kalorienrestriktion']),
('Schilddrüsenüberfunktion', 'Metabolic', 'medium', 'Herzfrequenz überwachen, moderate Intensität', ARRAY['Übertraining']),
('Schilddrüsenunterfunktion', 'Metabolic', 'low', 'Langsame Steigerung, Energielevel beachten', ARRAY[]::TEXT[]),

-- Respiratory conditions
('Asthma', 'Respiratory', 'medium', 'Inhalator griffbereit, Aufwärmen wichtig', ARRAY['Training bei akuten Symptomen']),
('COPD', 'Respiratory', 'high', 'Atemtraining integrieren, niedrige Intensität', ARRAY['Hochintensives Ausdauertraining']),

-- Musculoskeletal conditions
('Bandscheibenvorfall', 'Musculoskeletal', 'medium', 'Rückengerechte Übungen, Gewichte reduzieren', ARRAY['Schweres Heben', 'Rotationsbewegungen unter Last']),
('Arthritis', 'Musculoskeletal', 'medium', 'Gelenkschonende Übungen, entzündungsfreie Phasen nutzen', ARRAY['Hohe Gelenkbelastung']),
('Osteoporose', 'Musculoskeletal', 'medium', 'Krafttraining für Knochendichte, Sturzprävention', ARRAY['Sprungbewegungen', 'Extreme Flexion']),

-- Mental Health
('Depression', 'Mental Health', 'medium', 'Training als Therapieunterstützung, realistische Ziele', ARRAY['Überehrgeizige Ziele']),
('Angststörung', 'Mental Health', 'low', 'Stressreduktion durch Sport, schrittweise Steigerung', ARRAY['Überforderung']),

-- Other common conditions
('Schwangerschaft', 'Other', 'high', 'Spezielles Schwangerschaftstraining, ärztliche Begleitung', ARRAY['Bauchmuskeltraining ab 2. Trimester', 'Rückenlage nach 20. SSW']),
('Nierenerkrankung', 'Other', 'high', 'Flüssigkeitshaushalt beachten, Proteinzufuhr anpassen', ARRAY['Excessive Proteinzufuhr', 'Dehydration']);

-- Insert common medications with properly cast empty arrays
INSERT INTO public.medications_library (name, category, active_ingredient, risk_level, fitness_considerations, exercise_interactions, nutrition_interactions) VALUES
-- Blood pressure medications
('ACE-Hemmer', 'Antihypertensiva', 'verschiedene', 'medium', 'Kann Herzfrequenz beeinflussen, Blutdruck überwachen', ARRAY['Herzfrequenz möglicherweise niedriger'], ARRAY['Kaliumreiche Ernährung vermeiden']),
('Beta-Blocker', 'Antihypertensiva', 'verschiedene', 'medium', 'Herzfrequenz deutlich reduziert, Trainingsintensität anpassen', ARRAY['Niedrigere maximale Herzfrequenz'], ARRAY[]::TEXT[]),
('Diuretika', 'Antihypertensiva', 'verschiedene', 'medium', 'Dehydration vermeiden, Elektrolyte überwachen', ARRAY['Erhöhtes Dehydrationsrisiko'], ARRAY['Natriumzufuhr anpassen']),

-- Diabetes medications
('Metformin', 'Antidiabetika', 'Metformin', 'low', 'Unterzuckerung bei intensivem Training möglich', ARRAY['Blutzucker vor/nach Training prüfen'], ARRAY['Vitamin B12-Spiegel beachten']),
('Insulin', 'Antidiabetika', 'Insulin', 'high', 'Dosierung an Training anpassen, Unterzuckerung vermeiden', ARRAY['Blutzuckerkontrolle essentiell'], ARRAY['Kohlenhydrate bei Training']),

-- Thyroid medications
('L-Thyroxin', 'Schilddrüsenhormone', 'Levothyroxin', 'low', 'Stabile Einstellung vor Trainingsbeginn', ARRAY[]::TEXT[], ARRAY['Eisenpräparate zeitversetzt einnehmen']),

-- Mental health medications
('Antidepressiva (SSRI)', 'Psychopharmaka', 'verschiedene', 'medium', 'Kann Gewichtszunahme fördern, Motivation beeinflussen', ARRAY['Gewichtsveränderungen möglich'], ARRAY[]::TEXT[]),
('Benzodiazepine', 'Psychopharmaka', 'verschiedene', 'high', 'Koordination und Reaktion beeinträchtigt', ARRAY['Sturzgefahr erhöht'], ARRAY['Alkohol strikt vermeiden']),

-- Pain medications
('NSAIDs (Ibuprofen, etc.)', 'Schmerzmittel', 'verschiedene', 'medium', 'Nierenfunktion bei intensivem Training beachten', ARRAY['Dehydration verstärkt Nebenwirkungen'], ARRAY['Ausreichend Flüssigkeit']),
('Opioide', 'Schmerzmittel', 'verschiedene', 'critical', 'Koordination stark beeinträchtigt, Atemdepression möglich', ARRAY['Keine intensiven Übungen'], ARRAY[]::TEXT[]),

-- Blood thinners
('Marcumar/Warfarin', 'Antikoagulantien', 'Warfarin', 'high', 'Verletzungsrisiko minimieren, Kontaktsport vermeiden', ARRAY['Blutungsrisiko bei Verletzungen'], ARRAY['Vitamin K-Aufnahme konstant halten']),

-- Common supplements that are actually medications
('Cortison', 'Immunsuppressiva', 'Prednisolon', 'high', 'Muskelschwäche und Knochenverlust möglich', ARRAY['Osteoporose-Risiko'], ARRAY['Calciumzufuhr erhöhen']),
('Antibiotika', 'Anti-Infektiva', 'verschiedene', 'medium', 'Training bei Infektion reduzieren', ARRAY['Reduzierte Leistungsfähigkeit'], ARRAY['Probiotika erwägen']);