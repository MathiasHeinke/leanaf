-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1 TASK 2: User Bloodwork für personalisierte Blutbild-Analyse
-- Speichert Blutwerte mit Referenzbereichen für ARES Coaching
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tabelle für User Bloodwork
CREATE TABLE IF NOT EXISTS public.user_bloodwork (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Meta-Daten
  test_date DATE NOT NULL,
  lab_name TEXT,
  is_fasted BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- HORMON PANEL
  -- ═══════════════════════════════════════════════════════════════════════════════
  total_testosterone NUMERIC,      -- ng/dL (Männer: 300-1000, optimal: 550-900)
  free_testosterone NUMERIC,       -- pg/mL (Männer: 9-30, optimal: 15-25)
  shbg NUMERIC,                    -- nmol/L (16-55, optimal: 20-40)
  estradiol NUMERIC,               -- pg/mL (Männer: 10-40, optimal: 20-35)
  lh NUMERIC,                      -- mIU/mL (1.7-8.6)
  fsh NUMERIC,                     -- mIU/mL (1.5-12.4)
  prolactin NUMERIC,               -- ng/mL (Männer: 2-18, Frauen: 2-29)
  dhea_s NUMERIC,                  -- µg/dL (altersabhängig)
  cortisol NUMERIC,                -- µg/dL (morgens: 6-23)
  igf1 NUMERIC,                    -- ng/mL (altersabhängig)
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- SCHILDDRÜSE
  -- ═══════════════════════════════════════════════════════════════════════════════
  tsh NUMERIC,                     -- mIU/L (0.4-4.0, optimal: 1.0-2.5)
  ft3 NUMERIC,                     -- pg/mL (2.3-4.2, optimal: 3.0-4.0)
  ft4 NUMERIC,                     -- ng/dL (0.8-1.8, optimal: 1.2-1.6)
  rt3 NUMERIC,                     -- ng/dL (reverse T3, optimal: 10-24)
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- METABOLISCH / GLUKOSE
  -- ═══════════════════════════════════════════════════════════════════════════════
  fasting_glucose NUMERIC,         -- mg/dL (70-100, optimal: 72-85)
  insulin NUMERIC,                 -- µIU/mL (2-25, optimal: 3-8)
  hba1c NUMERIC,                   -- % (< 5.7, optimal: 4.5-5.3)
  homa_ir NUMERIC,                 -- Calculated: (glucose * insulin) / 405
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- LIPIDE
  -- ═══════════════════════════════════════════════════════════════════════════════
  total_cholesterol NUMERIC,       -- mg/dL (< 200)
  ldl NUMERIC,                     -- mg/dL (< 100, optimal: < 70 für Hochrisiko)
  hdl NUMERIC,                     -- mg/dL (> 40 Männer, > 50 Frauen, optimal: > 60)
  triglycerides NUMERIC,           -- mg/dL (< 150, optimal: < 100)
  apob NUMERIC,                    -- mg/dL (< 90, optimal: < 80)
  lpa NUMERIC,                     -- nmol/L (< 75 optimal)
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- ENTZÜNDUNG / HERZ-KREISLAUF
  -- ═══════════════════════════════════════════════════════════════════════════════
  hs_crp NUMERIC,                  -- mg/L (< 3.0, optimal: < 1.0)
  homocysteine NUMERIC,            -- µmol/L (< 15, optimal: 7-10)
  ferritin NUMERIC,                -- ng/mL (Männer: 30-400, Frauen: 20-150, optimal: 70-150)
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- VITAMINE & MINERALSTOFFE
  -- ═══════════════════════════════════════════════════════════════════════════════
  vitamin_d NUMERIC,               -- ng/mL (30-100, optimal: 40-60)
  vitamin_b12 NUMERIC,             -- pg/mL (200-900, optimal: 500-800)
  folate NUMERIC,                  -- ng/mL (> 3.0, optimal: 10-20)
  iron NUMERIC,                    -- µg/dL (60-170, optimal: 80-120)
  magnesium NUMERIC,               -- mg/dL (1.7-2.2, optimal: 2.0-2.2)
  zinc NUMERIC,                    -- µg/dL (60-120)
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- LEBER / NIERE
  -- ═══════════════════════════════════════════════════════════════════════════════
  alt NUMERIC,                     -- U/L (7-56)
  ast NUMERIC,                     -- U/L (10-40)
  ggt NUMERIC,                     -- U/L (9-48)
  creatinine NUMERIC,              -- mg/dL (0.7-1.3)
  egfr NUMERIC,                    -- mL/min/1.73m² (> 90)
  bun NUMERIC,                     -- mg/dL (7-20)
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- BLUTBILD
  -- ═══════════════════════════════════════════════════════════════════════════════
  hemoglobin NUMERIC,              -- g/dL (Männer: 13.5-17.5, Frauen: 12.0-16.0)
  hematocrit NUMERIC,              -- % (Männer: 38.3-48.6, Frauen: 35.5-44.9)
  rbc NUMERIC,                     -- million/µL
  wbc NUMERIC,                     -- thousand/µL (4.5-11.0)
  platelets NUMERIC,               -- thousand/µL (150-400)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Index für User-spezifische Abfragen
CREATE INDEX IF NOT EXISTS idx_user_bloodwork_user_id 
ON public.user_bloodwork (user_id);

-- Index für Datum-Sortierung
CREATE INDEX IF NOT EXISTS idx_user_bloodwork_test_date 
ON public.user_bloodwork (user_id, test_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.user_bloodwork ENABLE ROW LEVEL SECURITY;

-- User kann eigene Blutwerte sehen
CREATE POLICY "Users can view their own bloodwork"
ON public.user_bloodwork
FOR SELECT
USING (auth.uid() = user_id);

-- User kann eigene Blutwerte erstellen
CREATE POLICY "Users can create their own bloodwork"
ON public.user_bloodwork
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User kann eigene Blutwerte aktualisieren
CREATE POLICY "Users can update their own bloodwork"
ON public.user_bloodwork
FOR UPDATE
USING (auth.uid() = user_id);

-- User kann eigene Blutwerte löschen
CREATE POLICY "Users can delete their own bloodwork"
ON public.user_bloodwork
FOR DELETE
USING (auth.uid() = user_id);

-- Coaches können Blutwerte für Coaching sehen
CREATE POLICY "Coaches can view bloodwork for coaching"
ON public.user_bloodwork
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM coach_conversations
    WHERE coach_conversations.user_id = user_bloodwork.user_id
  )) 
  OR (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role')
);

-- Super Admins können alle Blutwerte sehen
CREATE POLICY "Super admins can view all bloodwork"
ON public.user_bloodwork
FOR SELECT
USING (is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER für updated_at
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_user_bloodwork_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_bloodwork_updated_at
BEFORE UPDATE ON public.user_bloodwork
FOR EACH ROW
EXECUTE FUNCTION public.update_user_bloodwork_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- REFERENZBEREICH-TABELLE für Marker-Bewertung
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bloodwork_reference_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  
  -- Normal Range
  normal_min NUMERIC,
  normal_max NUMERIC,
  
  -- Optimal Range (für Performance/Longevity)
  optimal_min NUMERIC,
  optimal_max NUMERIC,
  
  -- Flags
  lower_is_better BOOLEAN DEFAULT false,
  higher_is_better BOOLEAN DEFAULT false,
  
  -- Gender-spezifische Werte (NULL = gleich für beide)
  male_normal_min NUMERIC,
  male_normal_max NUMERIC,
  male_optimal_min NUMERIC,
  male_optimal_max NUMERIC,
  female_normal_min NUMERIC,
  female_normal_max NUMERIC,
  female_optimal_min NUMERIC,
  female_optimal_max NUMERIC,
  
  -- Beschreibung für ARES
  description TEXT,
  coaching_tips TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bloodwork_reference_ranges ENABLE ROW LEVEL SECURITY;

-- Jeder kann Referenzbereiche lesen
CREATE POLICY "Anyone can view reference ranges"
ON public.bloodwork_reference_ranges
FOR SELECT
USING (true);

-- Nur Admins können Referenzbereiche verwalten
CREATE POLICY "Super admins can manage reference ranges"
ON public.bloodwork_reference_ranges
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- INITIAL REFERENCE RANGES - Die wichtigsten Marker
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.bloodwork_reference_ranges (marker_name, unit, normal_min, normal_max, optimal_min, optimal_max, male_normal_min, male_normal_max, male_optimal_min, male_optimal_max, female_normal_min, female_normal_max, female_optimal_min, female_optimal_max, lower_is_better, higher_is_better, description, coaching_tips) VALUES
-- Hormone
('total_testosterone', 'ng/dL', 300, 1000, 550, 900, 300, 1000, 550, 900, 15, 70, 30, 50, false, true, 'Primäres männliches Sexualhormon', 'Optimiere durch Schlaf, Krafttraining, Vitamin D und Zink'),
('free_testosterone', 'pg/mL', 5, 25, 12, 22, 9, 30, 15, 25, 0.3, 1.9, 0.8, 1.5, false, true, 'Bioverfügbares Testosteron', 'SHBG beeinflusst Free T - bei hohem SHBG sinkt Free T'),
('estradiol', 'pg/mL', 10, 50, 20, 35, 10, 40, 20, 35, 15, 350, 50, 200, false, false, 'Östrogen-Marker', 'Bei Männern: Balance zu T wichtig. Zu hoch = DIM, Zink; zu niedrig = mehr Körperfett'),
('cortisol', 'µg/dL', 6, 23, 10, 18, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 'Stresshormon (morgens gemessen)', 'Chronisch hoch = Stress-Management, Schlaf, Adaptogene'),
('igf1', 'ng/mL', 100, 300, 150, 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 'Wachstumsfaktor für Muskelaufbau', 'Protein-Intake und Schlafqualität beeinflussen IGF-1'),

-- Schilddrüse
('tsh', 'mIU/L', 0.4, 4.0, 1.0, 2.5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 'Schilddrüsen-Stimulierendes Hormon', 'TSH > 2.5 kann auf subklinische Hypothyreose hinweisen'),
('ft3', 'pg/mL', 2.3, 4.2, 3.0, 4.0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, true, 'Aktives Schilddrüsenhormon', 'Niedrig = Jod, Selen, Zink prüfen; Kaloriendefizit beachten'),
('ft4', 'ng/dL', 0.8, 1.8, 1.2, 1.6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 'Schilddrüsen-Speicherhormon', 'Konvertiert zu T3 - braucht Selen'),

-- Metabolisch
('fasting_glucose', 'mg/dL', 70, 100, 72, 85, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Nüchtern-Blutzucker', '> 100 = Insulinresistenz-Risiko. Kohlenhydrate timing, Bewegung nach Mahlzeiten'),
('hba1c', '%', 4.0, 5.7, 4.5, 5.3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, '3-Monats-Blutzucker-Durchschnitt', '> 5.4 = Prädiabetes-Risiko. Carb-Cycling, Kraft-Training, Berberine'),
('insulin', 'µIU/mL', 2, 25, 3, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Nüchtern-Insulin', 'Hoch = Insulinresistenz. Intervallfasten, weniger Zucker'),
('homa_ir', 'ratio', 0, 2.5, 0.5, 1.5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Insulinresistenz-Index', 'Berechnet: (Glucose × Insulin) / 405'),

-- Lipide
('ldl', 'mg/dL', 0, 100, 0, 70, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'LDL-Cholesterin', 'Für Longevity: < 70 optimal. Omega-3, Ballaststoffe, Bewegung'),
('hdl', 'mg/dL', 40, 100, 60, 100, 40, 100, 60, 100, 50, 100, 70, 100, false, true, 'HDL-Cholesterin', 'Höher = besser. Cardio, Omega-3, moderate Alkohol-Menge (optional)'),
('triglycerides', 'mg/dL', 0, 150, 0, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Blutfette', 'Hoch = Zucker & Carbs reduzieren, Omega-3 erhöhen'),
('apob', 'mg/dL', 0, 100, 0, 80, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Atherosklerose-Risiko-Marker', 'Besserer Prädiktor als LDL für Herzrisiko'),

-- Entzündung
('hs_crp', 'mg/L', 0, 3.0, 0, 1.0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Hochsensitives C-reaktives Protein', '> 1.0 = chronische Entzündung. Omega-3, Curcumin, Schlaf'),
('homocysteine', 'µmol/L', 0, 15, 7, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Methylierungs-Marker', 'Hoch = B12, Folat, B6 prüfen. MTHFR-Genvarianten beachten'),
('ferritin', 'ng/mL', 20, 400, 70, 150, 30, 400, 70, 150, 20, 150, 50, 100, false, false, 'Eisenspeicher', 'Zu niedrig = Müdigkeit. Zu hoch = Entzündung/Eisenüberladung'),

-- Vitamine
('vitamin_d', 'ng/mL', 30, 100, 40, 60, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 'Vitamin D (25-OH)', '< 40 = supplementieren. 4000-5000 IU/Tag für die meisten optimal'),
('vitamin_b12', 'pg/mL', 200, 900, 500, 800, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, true, 'Vitamin B12', 'Veganer/Vegetarier oft niedrig. Methylcobalamin supplementieren'),

-- Leber
('alt', 'U/L', 7, 56, 10, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, 'Leber-Enzym (ALT/GPT)', 'Erhöht = Leber-Stress. Alkohol, Medikamente, Fettleber prüfen'),

-- Blutbild
('hemoglobin', 'g/dL', 12, 17.5, 14, 16, 13.5, 17.5, 14.5, 16.5, 12.0, 16.0, 13.0, 15.0, false, false, 'Sauerstoff-Träger', 'Niedrig = Anämie prüfen. Eisen, B12, Folsäure'),
('hematocrit', '%', 35, 50, 40, 48, 38.3, 48.6, 42, 47, 35.5, 44.9, 38, 43, false, false, 'Anteil roter Blutkörperchen', 'Zu hoch = Dehydration oder Polyzythämie prüfen')

ON CONFLICT (marker_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- HILFSFUNKTION: Letztes Blutbild eines Users laden
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_latest_bloodwork(p_user_id UUID)
RETURNS public.user_bloodwork AS $$
BEGIN
  RETURN (
    SELECT * FROM public.user_bloodwork
    WHERE user_id = p_user_id
    ORDER BY test_date DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_latest_bloodwork TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_bloodwork TO service_role;