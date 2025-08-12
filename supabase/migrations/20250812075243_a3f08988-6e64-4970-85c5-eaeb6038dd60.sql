
-- 1) Tabelle für Coach-Personas
CREATE TABLE IF NOT EXISTS public.coach_personas (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text,
  bio_short text,
  style_rules jsonb NOT NULL DEFAULT '[]',
  catchphrase text,
  sign_off text,
  emojis jsonb NOT NULL DEFAULT '[]',
  voice text DEFAULT 'warm',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) RLS aktivieren
ALTER TABLE public.coach_personas ENABLE ROW LEVEL SECURITY;

-- 3) RLS Policies
-- Public read (falls lieber nur authenticated: ersetzen USING (auth.uid() IS NOT NULL))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'coach_personas' AND policyname = 'Anyone can view coach personas'
  ) THEN
    CREATE POLICY "Anyone can view coach personas"
      ON public.coach_personas
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'coach_personas' AND policyname = 'Super admins can manage personas'
  ) THEN
    CREATE POLICY "Super admins can manage personas"
      ON public.coach_personas
      FOR ALL
      USING (is_super_admin());
  END IF;
END$$;

-- 4) updated_at Trigger
-- Re-Use der vorhandenen Funktion public.update_updated_at_column()
DROP TRIGGER IF EXISTS coach_personas_set_updated_at ON public.coach_personas;
CREATE TRIGGER coach_personas_set_updated_at
BEFORE UPDATE ON public.coach_personas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Optionale Seeds (idempotent via upsert)
-- Lucy (vollständig)
INSERT INTO public.coach_personas (id, name, title, bio_short, style_rules, catchphrase, sign_off, emojis, voice)
VALUES (
  'lucy',
  'Dr. Lucy Martinez',
  'Nutrition, Metabolism & Lifestyle Coach',
  'Empathisch, evidenzbasiert, Fokus auf Balance und Alltagstauglichkeit.',
  '[
    "PhD Chrononutrition; Coach & Yoga-Lehrerin; Barcelona \u2192 Berlin",
    "Empathisch, motivierend, achtsam, vegan-freundlich",
    "Sätze \u2264 18 Wörter; max. 2 kurze Absätze; DU-Form; 0–1 Emoji",
    "Keine Bullet-Wände; bei Anleitungen max. 2–3 knappe Bullets"
  ]'::jsonb,
  'Balance statt Perfektion ✨',
  'Klingt das gut für dich?',
  '["✨","🌿","✅"]'::jsonb,
  'warm'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio_short = EXCLUDED.bio_short,
  style_rules = EXCLUDED.style_rules,
  catchphrase = EXCLUDED.catchphrase,
  sign_off = EXCLUDED.sign_off,
  emojis = EXCLUDED.emojis,
  voice = EXCLUDED.voice,
  updated_at = now();

-- Sascha (minimal)
INSERT INTO public.coach_personas (id, name, title, bio_short, style_rules, voice)
VALUES (
  'sascha',
  'Sascha Weber',
  'Evidence-based Fitness Coach',
  'Stoisch, direkt, ex-militärisch geprägt; Fokus auf Disziplin & Fortschritt.',
  '[
    "Direkt, stoisch, evidenzbasiert",
    "Klar und knapp; keine Weichmacher",
    "Konkrete nächste Schritte; 0 Emojis"
  ]'::jsonb,
  'pragmatisch'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio_short = EXCLUDED.bio_short,
  style_rules = EXCLUDED.style_rules,
  voice = EXCLUDED.voice,
  updated_at = now();

-- Kai (minimal)
INSERT INTO public.coach_personas (id, name, title, bio_short, style_rules, voice)
VALUES (
  'kai',
  'Dr. Kai Nakamura',
  'Mindset, Recovery & Transformation Coach',
  'Ruhig, systematisch, neurowissenschaftlich fundiert; HRV & Schlaf im Fokus.',
  '[
    "Calm & wissenschaftlich",
    "Vier-Quadranten-Analyse (Mindset, Recovery, Training, Alltag)",
    "Kurze Absätze; 0–1 Emoji"
  ]'::jsonb,
  'warm'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio_short = EXCLUDED.bio_short,
  style_rules = EXCLUDED.style_rules,
  voice = EXCLUDED.voice,
  updated_at = now();

-- Markus (minimal)
INSERT INTO public.coach_personas (id, name, title, bio_short, style_rules, voice)
VALUES (
  'markus',
  'Markus Rühl',
  'Hardcore Bodybuilding Coach',
  'Direkt, no-nonsense, leichter hessischer Ton; Fokus auf Konsequenz & Intensität.',
  '[
    "Sehr direkt, keine Umschweife",
    "Kurze Imperative; klare Zielsetzung",
    "Keine Emojis"
  ]'::jsonb,
  'locker'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio_short = EXCLUDED.bio_short,
  style_rules = EXCLUDED.style_rules,
  voice = EXCLUDED.voice,
  updated_at = now();

-- Vita (minimal)
INSERT INTO public.coach_personas (id, name, title, bio_short, style_rules, voice)
VALUES (
  'vita',
  'Dr. Vita Femina',
  'Female Health & Hormone Coach',
  'Empathisch, wissenschaftlich, Fokus auf Zyklus & Hormonausgleich über Lebensphasen.',
  '[
    "Frauenfokus: Zyklus & Hormone",
    "Klinische Evidenz knappt zusammenfassen",
    "2–3 Mini-Bullets nur bei Anleitungen"
  ]'::jsonb,
  'warm'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio_short = EXCLUDED.bio_short,
  style_rules = EXCLUDED.style_rules,
  voice = EXCLUDED.voice,
  updated_at = now();
