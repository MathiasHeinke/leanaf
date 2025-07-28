-- Create supplement database table for dropdown options
CREATE TABLE public.supplement_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_dosage TEXT,
  default_unit TEXT NOT NULL DEFAULT 'mg',
  common_timing TEXT[] DEFAULT '{"morning","evening"}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user supplements table
CREATE TABLE public.user_supplements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplement_id UUID REFERENCES public.supplement_database(id),
  custom_name TEXT, -- for custom supplements not in database
  dosage TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'mg',
  timing TEXT[] NOT NULL DEFAULT '{"morning"}',
  goal TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  frequency_days INTEGER DEFAULT 1, -- 1 = daily, 7 = weekly, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplement intake log table
CREATE TABLE public.supplement_intake_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_supplement_id UUID NOT NULL REFERENCES public.user_supplements(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  timing TEXT NOT NULL, -- morning, noon, evening
  taken BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_supplement_id, date, timing)
);

-- Enable RLS
ALTER TABLE public.supplement_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_intake_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplement_database
CREATE POLICY "Anyone can view supplement database" 
ON public.supplement_database 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage supplement database" 
ON public.supplement_database 
FOR ALL 
USING (is_super_admin());

-- RLS Policies for user_supplements
CREATE POLICY "Users can view their own supplements" 
ON public.user_supplements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplements" 
ON public.user_supplements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplements" 
ON public.user_supplements 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplements" 
ON public.user_supplements 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view all supplements for coaching" 
ON public.user_supplements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = user_supplements.user_id
  ) OR 
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- RLS Policies for supplement_intake_log
CREATE POLICY "Users can view their own supplement intake" 
ON public.supplement_intake_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplement intake" 
ON public.supplement_intake_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplement intake" 
ON public.supplement_intake_log 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplement intake" 
ON public.supplement_intake_log 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view all supplement intake for analysis" 
ON public.supplement_intake_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = supplement_intake_log.user_id
  ) OR 
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Create updated_at triggers
CREATE TRIGGER update_supplement_database_updated_at
BEFORE UPDATE ON public.supplement_database
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_supplements_updated_at
BEFORE UPDATE ON public.user_supplements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplement_intake_log_updated_at
BEFORE UPDATE ON public.supplement_intake_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert common supplements into database
INSERT INTO public.supplement_database (name, category, default_dosage, default_unit, common_timing, description) VALUES
('Protein Pulver', 'Muskelaufbau', '30', 'g', '{"morning","post_workout"}', 'Hochwertiges Whey oder Casein Protein'),
('Creatin', 'Muskelaufbau', '5', 'g', '{"post_workout"}', 'Unterstützt Kraft und Muskelmasse'),
('Vitamin D3', 'Vitamine', '2000', 'IU', '{"morning"}', 'Unterstützt Immunsystem und Knochengesundheit'),
('Omega-3', 'Fettsäuren', '1000', 'mg', '{"evening"}', 'EPA/DHA für Herz und Gehirn'),
('Magnesium', 'Mineralien', '400', 'mg', '{"evening"}', 'Unterstützt Muskel- und Nervenfunktion'),
('Vitamin B12', 'Vitamine', '1000', 'mcg', '{"morning"}', 'Energie und Nervensystem'),
('Ashwagandha', 'Adaptogene', '600', 'mg', '{"evening"}', 'Stressreduktion und Schlafqualität'),
('Zink', 'Mineralien', '15', 'mg', '{"evening"}', 'Immunsystem und Testosteron'),
('BCAA', 'Aminosäuren', '10', 'g', '{"pre_workout","during_workout"}', 'Verzweigtkettige Aminosäuren'),
('Multivitamin', 'Vitamine', '1', 'Tablette', '{"morning"}', 'Tägliche Vitaminversorgung'),
('Kollagen', 'Proteine', '10', 'g', '{"morning"}', 'Haut, Haare, Gelenke'),
('Probiotika', 'Darmgesundheit', '10', 'Milliarden CFU', '{"morning"}', 'Darmflora und Verdauung'),
('Curcumin', 'Antioxidantien', '500', 'mg', '{"evening"}', 'Entzündungshemmend'),
('Melatonin', 'Schlaf', '3', 'mg', '{"before_bed"}', 'Schlafqualität und Einschlafhilfe'),
('Koffein', 'Stimulanzien', '200', 'mg', '{"morning","pre_workout"}', 'Energie und Fokus'),
('L-Theanin', 'Aminosäuren', '200', 'mg', '{"morning","evening"}', 'Entspannung und Fokus'),
('Vitamin C', 'Vitamine', '1000', 'mg', '{"morning"}', 'Immunsystem und Antioxidans'),
('Eisen', 'Mineralien', '18', 'mg', '{"morning"}', 'Sauerstofftransport im Blut'),
('Calcium', 'Mineralien', '1000', 'mg', '{"evening"}', 'Knochengesundheit'),
('Biotin', 'Vitamine', '5000', 'mcg', '{"morning"}', 'Haare, Haut und Nägel');