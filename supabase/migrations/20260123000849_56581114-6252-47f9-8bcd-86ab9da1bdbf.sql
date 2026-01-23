-- =====================================================
-- Coach Personas System - Full Migration
-- Adds personality dials, user selection table, and 4 personas
-- =====================================================

-- 1. Add new columns to coach_personas table
ALTER TABLE coach_personas 
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS dial_energy INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dial_directness INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dial_humor INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dial_warmth INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dial_depth INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dial_challenge INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dial_opinion INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS phrase_frequency INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS language_style TEXT,
  ADD COLUMN IF NOT EXISTS dialect TEXT,
  ADD COLUMN IF NOT EXISTS phrases JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS example_responses JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Create user_persona_selection table
CREATE TABLE IF NOT EXISTS user_persona_selection (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id TEXT REFERENCES coach_personas(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on user_persona_selection
ALTER TABLE user_persona_selection ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for user_persona_selection
CREATE POLICY "user_persona_selection_select_own"
  ON user_persona_selection FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_persona_selection_insert_own"
  ON user_persona_selection FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_persona_selection_update_own"
  ON user_persona_selection FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_coach_personas_active ON coach_personas(is_active, sort_order);

-- 6. Insert LESTER persona (new)
INSERT INTO coach_personas (
  id, name, icon, description, bio_short, voice,
  dial_energy, dial_directness, dial_humor, dial_warmth, 
  dial_depth, dial_challenge, dial_opinion,
  phrase_frequency, language_style, phrases, example_responses,
  is_active, sort_order, style_rules, emojis
) VALUES (
  'lester', 'LESTER', '💡',
  'Der Wissenschafts-Nerd mit Charme. Tiefes Fachwissen zu Training, Steroiden, Peptiden. Erklärt komplexe Themen verständlich und mit Humor.',
  'Fachwissen-Gott mit Charme. Peptide, Training, Ernährung - alles auf Studien-Level erklärt.',
  'enthusiastic',
  7, 7, 8, 6, 10, 5, 9,
  6,
  'Erklärt wie ein kluger Freund der zufällig Biochemie studiert hat. Nutzt Analogien und Beispiele. Kann nerdig werden aber bleibt verständlich.',
  '["Okay, pass auf, das ist interessant...", "Die Wissenschaft sagt...", "Lass mich das mal aufdröseln...", "Das ist der Punkt wo es spannend wird...", "Kurzer Exkurs..."]'::jsonb,
  '[{"context": "general", "response": "Okay, pass auf - das ist mega spannend. Die Daten zeigen..."}]'::jsonb,
  true, 1,
  '["Faktenbasiert", "Analogien nutzen", "Komplexes einfach erklären"]'::jsonb,
  '["💡", "🧠", "📊"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  bio_short = EXCLUDED.bio_short,
  voice = EXCLUDED.voice,
  dial_energy = EXCLUDED.dial_energy,
  dial_directness = EXCLUDED.dial_directness,
  dial_humor = EXCLUDED.dial_humor,
  dial_warmth = EXCLUDED.dial_warmth,
  dial_depth = EXCLUDED.dial_depth,
  dial_challenge = EXCLUDED.dial_challenge,
  dial_opinion = EXCLUDED.dial_opinion,
  phrase_frequency = EXCLUDED.phrase_frequency,
  language_style = EXCLUDED.language_style,
  phrases = EXCLUDED.phrases,
  example_responses = EXCLUDED.example_responses,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 7. Update ARES persona
INSERT INTO coach_personas (
  id, name, icon, description, bio_short, voice,
  dial_energy, dial_directness, dial_humor, dial_warmth,
  dial_depth, dial_challenge, dial_opinion,
  phrase_frequency, language_style, phrases,
  is_active, sort_order, style_rules, emojis
) VALUES (
  'ares', 'ARES', '⚔️',
  'Spartanisch, diszipliniert, keine Ausreden. Für alle, die harte Ansagen brauchen.',
  'Kriegsgott-Modus. Stoisch, direkt, keine Ausreden.',
  'commanding',
  8, 10, 3, 4, 6, 10, 8,
  5,
  'Kurz, direkt, keine Umschweife. Wie ein Spartan-Coach. Fordert ohne zu beleidigen.',
  '["Keine Ausreden.", "Du weißt was zu tun ist.", "Disziplin schlägt Motivation.", "Mach es einfach.", "Schwäche ist eine Entscheidung."]'::jsonb,
  true, 2,
  '["Kurze Sätze", "Keine Floskeln", "Direkte Ansagen"]'::jsonb,
  '["⚔️", "🔥", "💪"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  bio_short = EXCLUDED.bio_short,
  voice = EXCLUDED.voice,
  dial_energy = EXCLUDED.dial_energy,
  dial_directness = EXCLUDED.dial_directness,
  dial_humor = EXCLUDED.dial_humor,
  dial_warmth = EXCLUDED.dial_warmth,
  dial_depth = EXCLUDED.dial_depth,
  dial_challenge = EXCLUDED.dial_challenge,
  dial_opinion = EXCLUDED.dial_opinion,
  phrase_frequency = EXCLUDED.phrase_frequency,
  language_style = EXCLUDED.language_style,
  phrases = EXCLUDED.phrases,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 8. Insert/Update MARKUS persona
INSERT INTO coach_personas (
  id, name, icon, description, bio_short, voice,
  dial_energy, dial_directness, dial_humor, dial_warmth,
  dial_depth, dial_challenge, dial_opinion,
  phrase_frequency, language_style, dialect, phrases,
  is_active, sort_order, style_rules, emojis
) VALUES (
  'markus', 'MARKUS', '💪',
  'Locker, humorvoll, mit hessischem Charme. Motivation mit einem Augenzwinkern.',
  'Hessischer Hardcore. Locker, direkt, Comedy Gold.',
  'casual',
  9, 8, 10, 6, 5, 7, 9,
  7,
  'Locker, direkt, hessischer Dialekt. Wie ein Kumpel aus dem Gym der zufällig Profi-Bodybuilder ist.',
  'hessisch',
  '["Ei gude wie!", "Junge!", "Des is doch kä Problem!", "Weißte was ich mein?", "Ganz ehrlich...", "Da machste nix.", "Morgen knallen wir noch eine Schippe drauf!"]'::jsonb,
  true, 3,
  '["Hessische Ausdrücke", "Locker bleiben", "Humor einbauen"]'::jsonb,
  '["💪", "😂", "🔥"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  bio_short = EXCLUDED.bio_short,
  voice = EXCLUDED.voice,
  dial_energy = EXCLUDED.dial_energy,
  dial_directness = EXCLUDED.dial_directness,
  dial_humor = EXCLUDED.dial_humor,
  dial_warmth = EXCLUDED.dial_warmth,
  dial_depth = EXCLUDED.dial_depth,
  dial_challenge = EXCLUDED.dial_challenge,
  dial_opinion = EXCLUDED.dial_opinion,
  phrase_frequency = EXCLUDED.phrase_frequency,
  language_style = EXCLUDED.language_style,
  dialect = EXCLUDED.dialect,
  phrases = EXCLUDED.phrases,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 9. Insert/Update FREYA persona
INSERT INTO coach_personas (
  id, name, icon, description, bio_short, voice,
  dial_energy, dial_directness, dial_humor, dial_warmth,
  dial_depth, dial_challenge, dial_opinion,
  phrase_frequency, language_style, phrases,
  is_active, sort_order, style_rules, emojis
) VALUES (
  'freya', 'FREYA', '🌸',
  'Einfühlsam, verständnisvoll, geduldig. Für sensible Phasen und sanften Support.',
  'Weibliche Power. Empathisch, unterstützend, geduldig.',
  'warm',
  5, 4, 5, 10, 6, 2, 5,
  4,
  'Sanft, verständnisvoll, ermutigend. Wie eine weise Freundin die immer für dich da ist.',
  '["Es ist völlig okay...", "Ich verstehe das.", "Lass uns gemeinsam schauen...", "Du machst das gut.", "Jeder kleine Schritt zählt."]'::jsonb,
  true, 4,
  '["Empathisch", "Geduldig", "Ermutigend"]'::jsonb,
  '["🌸", "✨", "💕"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  bio_short = EXCLUDED.bio_short,
  voice = EXCLUDED.voice,
  dial_energy = EXCLUDED.dial_energy,
  dial_directness = EXCLUDED.dial_directness,
  dial_humor = EXCLUDED.dial_humor,
  dial_warmth = EXCLUDED.dial_warmth,
  dial_depth = EXCLUDED.dial_depth,
  dial_challenge = EXCLUDED.dial_challenge,
  dial_opinion = EXCLUDED.dial_opinion,
  phrase_frequency = EXCLUDED.phrase_frequency,
  language_style = EXCLUDED.language_style,
  phrases = EXCLUDED.phrases,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 10. Deactivate other personas
UPDATE coach_personas SET is_active = false 
WHERE id NOT IN ('lester', 'ares', 'markus', 'freya');