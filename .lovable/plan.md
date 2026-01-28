

# ARES Stack Architect: Phase 1 - Database Architecture

## Übersicht

Wir bauen den "Pharmacological Stack Architect" - ein Layer 3 Tool, das Chaos in Präzision verwandelt.

```text
Layer 2 (Dashboard):   "Morgens nehme ich irgendwann meine Pillen"
Layer 3 (Architect):   "Zink nüchtern 6:30, Omega-3 mit Fett 12:00, Mg Glycinat 22:00"
```

### Das Konzept: Timeline + Inventory

| Zone | Funktion | Metapher |
|------|----------|----------|
| **Timeline (links)** | "Execution View" - Wann muss ich was nehmen? | Die Tagesschau |
| **Inventory (rechts)** | "Management View" - Was habe ich im Schrank? | Das Lager |

**Das löst das größte Problem:** Mit der Timeline wird sofort klar: "Oh, ich nehme morgens 10 Pillen auf leeren Magen → Übelkeit vorprogrammiert."

---

## Aktueller Stand (Was existiert)

### Datenbank

**supplement_database** (Master-Katalog):
- `id`, `name`, `category`, `default_dosage`, `default_unit`
- `common_timing[]`, `common_brands[]`, `description`, `recognition_keywords[]`
- **Fehlt:** `timing_constraint`, `interaction_tags`, `brand_recommendation`

**user_supplements** (User-Stack):
- `id`, `user_id`, `supplement_id`, `custom_name`, `dosage`, `unit`, `timing[]`
- `goal`, `notes`, `is_active`, `frequency_days`, `schedule` (JSONB)
- **Fehlt:** `stock_count`, `schedule_type`, `preferred_timing`

**Bereits geseedet:** Creatin, Vitamin D3, Omega-3, Magnesium, B12, Ashwagandha, Zink, BCAA, NMN, Curcumin, etc.

### Code

- `useSupplementData.tsx` - Vollständig implementiert mit Timing-Gruppen, Optimistic Updates
- `SupplementsDaySheet.tsx` - Layer 2 Tages-Tracking mit Timeline-Ansatz
- `SupplementsPage.tsx` - Nur Platzhalter "Coming Soon"

---

## Phase 1: Database Architecture

### 1. Schema-Erweiterung (Migration)

**Tabelle: `supplement_database`**

| Spalte | Typ | Default | Beschreibung |
|--------|-----|---------|--------------|
| `timing_constraint` | TEXT | 'any' | Optimale Einnahmezeit: `fasted`, `with_food`, `with_fats`, `pre_workout`, `post_workout`, `bedtime`, `any` |
| `interaction_tags` | TEXT[] | '{}' | Interaktions-Hinweise: `needs_fat`, `blocks_zinc`, `blocks_copper`, `needs_piperine`, `avoid_caffeine` |
| `brand_recommendation` | TEXT | NULL | Empfohlene Marke: "Thorne", "Momentous", etc. |

**Tabelle: `user_supplements`**

| Spalte | Typ | Default | Beschreibung |
|--------|-----|---------|--------------|
| `stock_count` | INTEGER | NULL | Anzahl verbleibender Pillen/Portionen |
| `schedule_type` | TEXT | 'daily' | Einnahme-Schema: `daily`, `training_days`, `interval`, `cyclic` |
| `preferred_timing` | TEXT | 'morning' | Primäre Zeitslot für Timeline-Visualisierung |

### 2. Seed-Update (ARES Essentials)

Bestehende Supplements mit erweiterten Daten anreichern:

| Supplement | timing_constraint | interaction_tags |
|------------|-------------------|------------------|
| Vitamin D3 | `with_fats` | `['needs_fat']` |
| Omega-3 | `with_fats` | `['needs_fat']` |
| Magnesium | `bedtime` | `[]` |
| Zink | `fasted` | `['blocks_copper']` |
| Creatin | `any` | `[]` |
| Curcumin | `with_fats` | `['needs_fat', 'needs_piperine']` |
| Ashwagandha | `any` | `[]` |
| Koffein | `any` | `['avoid_evening']` |
| NMN | `fasted` | `[]` |
| Eisen | `fasted` | `['blocks_zinc', 'needs_vitamin_c']` |

### 3. TypeScript-Typen

**Neue Datei: `src/types/supplementLibrary.ts`**

```typescript
// Timing Constraints für optimale Einnahme
export type TimingConstraint = 
  | 'fasted'       // Auf nüchternen Magen
  | 'with_food'    // Mit Mahlzeit
  | 'with_fats'    // Mit Fett für Absorption
  | 'pre_workout'  // 30-60 Min vor Training
  | 'post_workout' // Nach dem Training
  | 'bedtime'      // Vor dem Schlafengehen
  | 'any';         // Flexibel

// Interaktions-Tags für Warnungen
export type InteractionTag = 
  | 'needs_fat'      // Braucht Fett für Absorption
  | 'blocks_zinc'    // Hemmt Zink-Aufnahme
  | 'blocks_copper'  // Hemmt Kupfer-Aufnahme
  | 'needs_piperine' // Braucht Piperin (schwarzer Pfeffer)
  | 'avoid_caffeine' // Nicht mit Koffein
  | 'avoid_evening'  // Nicht abends
  | 'needs_vitamin_c'; // Braucht Vitamin C

// Schedule Types für Zyklen
export type ScheduleType = 
  | 'daily'         // Jeden Tag
  | 'training_days' // Nur an Trainingstagen
  | 'interval'      // Alle X Tage
  | 'cyclic';       // X Wochen on, Y Wochen off

// Supplement Library Item (Master-Katalog)
export interface SupplementLibraryItem {
  id: string;
  name: string;
  category: string;
  default_dosage: string | null;
  default_unit: string;
  common_timing: string[];
  timing_constraint: TimingConstraint;
  interaction_tags: InteractionTag[];
  brand_recommendation: string | null;
  description: string | null;
}

// User Stack Item (persönlicher Stack)
export interface UserStackItem {
  id: string;
  user_id: string;
  supplement_id: string | null;
  name: string;
  dosage_amount: number;
  dosage_unit: string;
  timing: string[];
  schedule_type: ScheduleType;
  preferred_timing: string;
  stock_count: number | null;
  is_active: boolean;
  goal?: string;
  notes?: string;
}
```

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `supabase/migrations/XXXX_supplement_architect_schema.sql` | **CREATE** | Schema-Erweiterung + Seed-Update |
| `src/types/supplementLibrary.ts` | **CREATE** | TypeScript-Typen für Library & Stack |

---

## SQL Migration (Vollständig)

```sql
-- =====================================================
-- ARES Stack Architect: Schema-Erweiterung Phase 1
-- =====================================================

-- 1. Erweiterung supplement_database (Master-Katalog)
ALTER TABLE public.supplement_database 
  ADD COLUMN IF NOT EXISTS timing_constraint TEXT DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS interaction_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_recommendation TEXT;

-- 2. Erweiterung user_supplements (User-Stack)
ALTER TABLE public.user_supplements
  ADD COLUMN IF NOT EXISTS stock_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS preferred_timing TEXT DEFAULT 'morning';

-- 3. Seed-Update: ARES Essentials mit erweiterten Daten
UPDATE public.supplement_database SET 
  timing_constraint = 'with_fats',
  interaction_tags = ARRAY['needs_fat']
WHERE name ILIKE '%Vitamin D%' OR name ILIKE '%D3%';

UPDATE public.supplement_database SET 
  timing_constraint = 'with_fats',
  interaction_tags = ARRAY['needs_fat']
WHERE name ILIKE '%Omega%';

UPDATE public.supplement_database SET 
  timing_constraint = 'bedtime'
WHERE name ILIKE '%Magnesium%';

UPDATE public.supplement_database SET 
  timing_constraint = 'fasted',
  interaction_tags = ARRAY['blocks_copper']
WHERE name ILIKE '%Zink%' OR name ILIKE '%Zinc%';

UPDATE public.supplement_database SET 
  timing_constraint = 'any'
WHERE name ILIKE '%Creatin%' OR name ILIKE '%Creatine%';

UPDATE public.supplement_database SET 
  timing_constraint = 'with_fats',
  interaction_tags = ARRAY['needs_fat', 'needs_piperine']
WHERE name ILIKE '%Curcumin%' OR name ILIKE '%Kurkuma%';

UPDATE public.supplement_database SET 
  timing_constraint = 'any',
  interaction_tags = ARRAY['avoid_evening']
WHERE name ILIKE '%Koffein%' OR name ILIKE '%Caffeine%';

UPDATE public.supplement_database SET 
  timing_constraint = 'fasted'
WHERE name ILIKE '%NMN%';

UPDATE public.supplement_database SET 
  timing_constraint = 'fasted',
  interaction_tags = ARRAY['blocks_zinc', 'needs_vitamin_c']
WHERE name ILIKE '%Eisen%' OR name ILIKE '%Iron%';

-- 4. Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_supplement_database_timing_constraint 
ON public.supplement_database(timing_constraint);

CREATE INDEX IF NOT EXISTS idx_user_supplements_schedule_type 
ON public.user_supplements(schedule_type);
```

---

## Nächste Schritte (Phase 2)

Nach Phase 1 folgt:
1. **UI-Gerüst** - SupplementsPage mit 2-Spalten-Layout
2. **Timeline-Komponente** - Vertikaler Zeitstrahl 06:00-23:00
3. **Inventory-Komponente** - Gruppierte Liste mit Stock-Tracking
4. **Add Wizard** - Standardisierte Eingabe via Library-Suche

---

## Erwartetes Ergebnis

### Vorher (supplement_database)
```
name: "Omega-3"
category: "Fettsäuren"
default_dosage: "1000"
```

### Nachher (supplement_database)
```
name: "Omega-3"
category: "Fettsäuren"
default_dosage: "1000"
timing_constraint: "with_fats"      ← NEU
interaction_tags: ["needs_fat"]     ← NEU
brand_recommendation: null          ← NEU (später befüllbar)
```

Das Fundament für den "Pharmacological Architect" steht damit bereit.

