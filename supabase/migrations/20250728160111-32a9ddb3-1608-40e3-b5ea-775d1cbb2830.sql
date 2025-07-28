-- Create fluid database table for standard drinks
CREATE TABLE public.fluid_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- water, coffee, alcohol, soft_drinks, juices, dairy, other
  default_amount INTEGER DEFAULT 250, -- in ml
  calories_per_100ml NUMERIC DEFAULT 0,
  has_caffeine BOOLEAN DEFAULT false,
  has_alcohol BOOLEAN DEFAULT false,
  alcohol_percentage NUMERIC DEFAULT 0,
  description TEXT,
  icon_name TEXT, -- for UI icons
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user fluid intake table
CREATE TABLE public.user_fluids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fluid_id UUID REFERENCES public.fluid_database(id),
  custom_name TEXT, -- for custom drinks not in database
  amount_ml INTEGER NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alcohol abstinence tracking table
CREATE TABLE public.user_alcohol_abstinence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_abstinent BOOLEAN NOT NULL DEFAULT false,
  abstinence_start_date DATE,
  abstinence_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fluid_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fluids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alcohol_abstinence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fluid_database
CREATE POLICY "Anyone can view fluid database" 
ON public.fluid_database 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage fluid database" 
ON public.fluid_database 
FOR ALL 
USING (is_super_admin());

-- RLS Policies for user_fluids
CREATE POLICY "Users can view their own fluid intake" 
ON public.user_fluids 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fluid intake" 
ON public.user_fluids 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fluid intake" 
ON public.user_fluids 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fluid intake" 
ON public.user_fluids 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view all fluid intake for analysis" 
ON public.user_fluids 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = user_fluids.user_id
  ) OR 
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- RLS Policies for user_alcohol_abstinence
CREATE POLICY "Users can view their own alcohol abstinence" 
ON public.user_alcohol_abstinence 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alcohol abstinence" 
ON public.user_alcohol_abstinence 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alcohol abstinence" 
ON public.user_alcohol_abstinence 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alcohol abstinence" 
ON public.user_alcohol_abstinence 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view all alcohol abstinence for coaching" 
ON public.user_alcohol_abstinence 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = user_alcohol_abstinence.user_id
  ) OR 
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Create updated_at triggers
CREATE TRIGGER update_fluid_database_updated_at
BEFORE UPDATE ON public.fluid_database
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_fluids_updated_at
BEFORE UPDATE ON public.user_fluids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_alcohol_abstinence_updated_at
BEFORE UPDATE ON public.user_alcohol_abstinence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert common fluids into database
INSERT INTO public.fluid_database (name, category, default_amount, calories_per_100ml, has_caffeine, has_alcohol, alcohol_percentage, description, icon_name) VALUES
-- Water
('Wasser', 'water', 250, 0, false, false, 0, 'Reines Wasser', 'droplets'),
('Mineralwasser', 'water', 250, 0, false, false, 0, 'Mineralwasser mit Kohlensäure', 'droplets'),
('Stilles Wasser', 'water', 250, 0, false, false, 0, 'Stilles Mineralwasser', 'droplets'),

-- Coffee
('Kaffee schwarz', 'coffee', 200, 2, true, false, 0, 'Schwarzer Kaffee ohne Milch/Zucker', 'coffee'),
('Kaffee mit Milch', 'coffee', 200, 15, true, false, 0, 'Kaffee mit Milch', 'coffee'),
('Cappuccino', 'coffee', 150, 45, true, false, 0, 'Espresso mit Milchschaum', 'coffee'),
('Latte Macchiato', 'coffee', 250, 60, true, false, 0, 'Espresso mit viel Milch', 'coffee'),
('Espresso', 'coffee', 30, 2, true, false, 0, 'Kleiner starker Kaffee', 'coffee'),

-- Alcohol
('Bier', 'alcohol', 500, 45, false, true, 5, 'Standard Bier', 'beer'),
('Wein rot', 'alcohol', 150, 85, false, true, 12, 'Rotwein', 'wine'),
('Wein weiß', 'alcohol', 150, 80, false, true, 11, 'Weißwein', 'wine'),
('Sekt', 'alcohol', 100, 80, false, true, 11, 'Sekt/Prosecco', 'wine'),
('Schnaps', 'alcohol', 40, 250, false, true, 40, 'Spirituosen', 'wine'),
('Cocktail', 'alcohol', 200, 150, false, true, 15, 'Gemischte Cocktails', 'wine'),

-- Soft Drinks
('Coca Cola', 'soft_drinks', 330, 42, true, false, 0, 'Cola mit Koffein', 'cup'),
('Fanta', 'soft_drinks', 330, 38, false, false, 0, 'Orangenlimonade', 'cup'),
('Sprite', 'soft_drinks', 330, 37, false, false, 0, 'Zitronenlimonade', 'cup'),
('Energy Drink', 'soft_drinks', 250, 45, true, false, 0, 'Energy Drink mit Koffein', 'zap'),
('Cola Zero', 'soft_drinks', 330, 0.5, true, false, 0, 'Zuckerfreie Cola', 'cup'),

-- Juices
('Orangensaft', 'juices', 200, 45, false, false, 0, 'Frischer Orangensaft', 'orange'),
('Apfelsaft', 'juices', 200, 46, false, false, 0, 'Apfelsaft naturtrüb', 'apple'),
('Smoothie', 'juices', 250, 55, false, false, 0, 'Frucht-Smoothie', 'grape'),
('Gemüsesaft', 'juices', 200, 20, false, false, 0, 'Tomatensaft o.ä.', 'carrot'),

-- Dairy
('Milch', 'dairy', 200, 65, false, false, 0, 'Vollmilch 3,5%', 'milk'),
('Milch fettarm', 'dairy', 200, 48, false, false, 0, 'Fettarme Milch 1,5%', 'milk'),
('Hafermilch', 'dairy', 200, 45, false, false, 0, 'Pflanzliche Hafermilch', 'wheat'),

-- Tea
('Grüner Tee', 'tea', 200, 1, true, false, 0, 'Grüner Tee mit Koffein', 'leaf'),
('Schwarzer Tee', 'tea', 200, 1, true, false, 0, 'Schwarzer Tee mit Koffein', 'leaf'),
('Kräutertee', 'tea', 200, 1, false, false, 0, 'Koffeinfreier Kräutertee', 'leaf'),

-- Other
('Protein Shake', 'other', 300, 80, false, false, 0, 'Protein Shake mit Wasser/Milch', 'dumbbell'),
('Isotonisches Getränk', 'other', 500, 25, false, false, 0, 'Sportgetränk', 'activity');