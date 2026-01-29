
# Plan: AI-Powered Quick Training Logger (Phase 1)

## Zusammenfassung

Implementierung eines Freitext-Notizfeldes in Layer 2 (TrainingDaySheet), das per KI in strukturierte Daten umgewandelt und sowohl in `training_sessions` (Layer 2) als auch `exercise_sessions`/`exercise_sets` (Layer 3) gespeichert wird.

---

## Vorhandene Infrastruktur (Wiederverwendung)

| Komponente | Status | Wiederverwendung |
|------------|--------|------------------|
| `src/tools/set-parser.ts` | ✅ Vorhanden | Client-seitiges Live-Preview |
| `supabase/functions/training-log-parser` | ✅ Vorhanden | Regex-Parser (erweitern mit AI-Fallback) |
| `exercise_sessions` Tabelle | ✅ Vorhanden | Layer 3 Session-Container |
| `exercise_sets` Tabelle | ✅ Vorhanden | Layer 3 Set-Einträge |
| `exercises` Tabelle | ✅ Vorhanden | Übungs-Katalog mit Fuzzy-Matching |
| `training_sessions` Tabelle | ✅ Vorhanden | Layer 2 Quick-Log |

---

## Implementierung

### 1. Neue UI-Komponente: `TrainingNotesInput.tsx`

**Datei:** `src/components/training/TrainingNotesInput.tsx`

**Features:**
- Mehrzeiliges Textarea mit Placeholder-Beispielen
- Quick-Typ-Buttons (Kraft, Cardio, Hybrid)
- Live-Preview mit `parseSetsMulti()` aus `set-parser.ts`
- Volumen-Berechnung in Echtzeit

**Struktur:**
```text
┌─────────────────────────────────────────────────────┐
│  📝 Schnelles Training loggen                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ Bankdrücken 4x10 80kg @7                        ││
│  │ Rudern 3x12 60kg @8                             ││
│  │ Schulterdrücken 3x10 40kg @7                    ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  [Kraft 💪] [Cardio ❤️] [Hybrid ⚡]                 │
│                                                     │
│  📊 Erkannt:                                        │
│  ├─ Bankdrücken: 4×10×80kg (3.200kg) ✓             │
│  ├─ Rudern: 3×12×60kg (2.160kg) ✓                  │
│  └─ Schulterdrücken: 3×10×40kg (1.200kg) ✓         │
│                                                     │
│  Gesamt: 6.560 kg Volumen                           │
│                                                     │
│  [✓ Workout speichern]                              │
└─────────────────────────────────────────────────────┘
```

**Code-Struktur:**
```typescript
interface TrainingNotesInputProps {
  onSubmit: (result: ParsedTrainingResult) => Promise<void>;
  isLoading: boolean;
}

// Verwendet:
// - parseSetsMulti() für Live-Preview
// - parseExercisesFromText() (neu) für Übungs-Erkennung
// - Lokale Volumen-Berechnung
```

---

### 2. Erweiterte Edge Function: `training-ai-parser`

**Datei:** `supabase/functions/training-ai-parser/index.ts`

**Hybrid-Strategie:**
1. Regex-Pass zuerst (schnell, lokal) - bestehender Code aus `training-log-parser`
2. Falls Warnungen → Gemini 3 Flash Fallback für Übungsnamen-Normalisierung

**Input:**
```typescript
{
  raw_text: string;
  training_type?: 'strength' | 'cardio' | 'hybrid';
  user_id: string;
  persist?: boolean;  // Wenn true: Dual-Write
}
```

**Output:**
```typescript
{
  exercises: Array<{
    name: string;
    normalized_name: string;
    sets: Array<{ reps: number; weight: number; rpe?: number }>;
    total_volume_kg: number;
    matched_exercise_id?: string;  // Falls DB-Match gefunden
  }>;
  session_meta: {
    split_type: string;
    total_volume_kg: number;
    total_sets: number;
    estimated_duration_minutes: number;
  };
  warnings: string[];
}
```

**AI-Fallback (Gemini 3 Flash):**
```typescript
// Wird nur aufgerufen wenn:
// 1. Übungsname nicht erkannt ("Unbekannte Übung")
// 2. Set-Format nicht parsbar
// 3. Ambiguität (z.B. "Bank" könnte Bankdrücken oder Schrägbank sein)

const aiPrompt = `
Du bist ein Fitness-Trainer-Assistent. Parse den folgenden Trainingslog.

Regeln:
- Normalisiere Übungsnamen (z.B. "Bank" → "Bankdrücken")
- Inferiere fehlende Daten (Standard-RPE 7 wenn nicht angegeben)
- Ordne Muscle-Groups zu

Input: "${rawText}"
`;
```

---

### 3. Integration in TrainingDaySheet

**Datei:** `src/components/home/sheets/TrainingDaySheet.tsx`

**Änderungen:**
1. Neues Collapsible-Panel unter dem Hero-Section
2. Toggle zwischen "Schnell loggen" und "Details"
3. TrainingNotesInput einbinden
4. Submit-Handler mit Dual-Write

**Submit-Flow:**
```typescript
const handleQuickLog = async (rawText: string, trainingType: string) => {
  // 1. Edge Function aufrufen
  const parseResult = await supabase.functions.invoke('training-ai-parser', {
    body: { raw_text: rawText, training_type: trainingType, persist: true }
  });

  // 2. Bei Erfolg: Queries invalidieren
  queryClient.invalidateQueries({ queryKey: ['training-session-today'] });
  queryClient.invalidateQueries({ queryKey: ['training-week-overview'] });
  
  // 3. Toast mit Zusammenfassung
  toast.success(`${parseResult.exercises.length} Übungen gespeichert`, {
    description: `${parseResult.session_meta.total_volume_kg.toLocaleString()} kg Volumen`
  });
};
```

---

### 4. Dual-Write Logik (Backend)

**In Edge Function `training-ai-parser`:**

```typescript
// SCHRITT 1: training_sessions (Layer 2)
const { data: trainingSession } = await supabase
  .from('training_sessions')
  .insert({
    user_id,
    session_date: todayStr,
    training_type: 'rpt',
    split_type: parsedResult.session_meta.split_type,
    total_duration_minutes: parsedResult.session_meta.estimated_duration_minutes,
    total_volume_kg: parsedResult.session_meta.total_volume_kg,
    session_data: {
      raw_text: inputText,
      parsed_exercises: parsedResult.exercises,
      source: 'layer2_notes'
    }
  })
  .select()
  .single();

// SCHRITT 2: exercise_sessions (Layer 3 Container)
const { data: exerciseSession } = await supabase
  .from('exercise_sessions')
  .insert({
    user_id,
    date: todayStr,
    session_name: `Training ${format(new Date(), 'dd.MM.yyyy')}`,
    workout_type: 'strength',
    metadata: { source: 'layer2_notes', training_session_id: trainingSession.id }
  })
  .select()
  .single();

// SCHRITT 3: exercise_sets (Layer 3 Sets)
for (const exercise of parsedResult.exercises) {
  const exerciseId = await findOrCreateExercise(exercise.name, user_id);
  
  for (let i = 0; i < exercise.sets.length; i++) {
    await supabase.from('exercise_sets').insert({
      session_id: exerciseSession.id,
      user_id,
      exercise_id: exerciseId,
      set_number: i + 1,
      weight_kg: exercise.sets[i].weight,
      reps: exercise.sets[i].reps,
      rpe: exercise.sets[i].rpe || 7,
      date: todayStr,
      origin: 'layer2_notes'
    });
  }
}
```

---

### 5. Exercise Matching Helper

**In Edge Function:**

```typescript
async function findOrCreateExercise(name: string, userId: string): Promise<string> {
  const normalizedName = name.trim();
  
  // 1. Exakter Match (case-insensitive)
  const { data: exact } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();
  
  if (exact) return exact.id;
  
  // 2. Fuzzy Match (erstes Wort)
  const firstWord = normalizedName.split(' ')[0];
  const { data: fuzzy } = await supabase
    .from('exercises')
    .select('id, name')
    .ilike('name', `%${firstWord}%`)
    .limit(1)
    .maybeSingle();
  
  if (fuzzy) return fuzzy.id;
  
  // 3. Neue Custom-Übung erstellen
  const { data: newExercise } = await supabase
    .from('exercises')
    .insert({
      name: normalizedName,
      category: 'Custom',
      muscle_groups: inferMuscleGroups(normalizedName),
      is_compound: false,
      created_by: userId,
      is_public: false
    })
    .select('id')
    .single();
  
  return newExercise?.id || crypto.randomUUID();
}

// Nutzt bestehende muscle-map.ts Logik
function inferMuscleGroups(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('bank') || n.includes('bench')) return ['chest', 'triceps', 'front_delts'];
  if (n.includes('ruder') || n.includes('row')) return ['lats', 'mid_back', 'biceps'];
  if (n.includes('kniebeu') || n.includes('squat')) return ['quads', 'glutes', 'hamstrings'];
  // ... weitere Mappings
  return ['other'];
}
```

---

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/training/TrainingNotesInput.tsx` | **NEU** | UI-Komponente mit Textarea + Live-Preview |
| `src/components/home/sheets/TrainingDaySheet.tsx` | **EDIT** | TrainingNotesInput einbinden, Submit-Handler |
| `supabase/functions/training-ai-parser/index.ts` | **NEU** | Hybrid Parser mit Dual-Write |
| `src/tools/set-parser.ts` | **EDIT** | `parseExercisesFromText()` Funktion hinzufügen |
| `supabase/config.toml` | **EDIT** | Neue Function registrieren |

---

## Technische Details

### Live-Preview Parser (Client-seitig)

```typescript
// src/tools/set-parser.ts erweitern

interface ParsedExercise {
  name: string;
  sets: SetEntry[];
  totalVolume: number;
}

export function parseExercisesFromText(input: string): ParsedExercise[] {
  const lines = input.split('\n').filter(l => l.trim());
  const exercises: ParsedExercise[] = [];
  let currentExercise: ParsedExercise | null = null;

  for (const line of lines) {
    // Übungsname erkennen (erstes Wort das nicht Zahl ist)
    const exerciseMatch = line.match(/^([a-zA-ZäöüÄÖÜß\s-]+)/);
    if (exerciseMatch) {
      const name = exerciseMatch[1].trim();
      
      // Rest der Zeile für Sets parsen
      const restOfLine = line.slice(name.length);
      const sets = parseSetsMulti(restOfLine);
      
      if (sets.length > 0) {
        const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
        exercises.push({ name, sets, totalVolume });
      }
    }
  }

  return exercises;
}
```

### Edge Function Request/Response

```typescript
// Request
POST /functions/v1/training-ai-parser
{
  "raw_text": "Bankdrücken 4x10 80kg @7\nRudern 3x12 60kg @8",
  "training_type": "strength",
  "persist": true
}

// Response
{
  "success": true,
  "training_session_id": "uuid",
  "exercise_session_id": "uuid",
  "exercises": [
    {
      "name": "Bankdrücken",
      "sets": [{ "reps": 10, "weight": 80, "rpe": 7 }],
      "total_volume_kg": 3200,
      "matched_exercise_id": "uuid"
    }
  ],
  "session_meta": {
    "split_type": "push",
    "total_volume_kg": 5360,
    "total_sets": 7
  }
}
```

---

## Phase 2 (Später): ARES-Integration

Nach Phase 1 kann ARES mit einem neuen Tool Trainingspläne erstellen:

```typescript
// Tool-Definition für aresUltimateWorkoutPlan.ts
{
  type: "function",
  function: {
    name: "create_training_session",
    description: "Erstellt eine vollständige Trainings-Session mit Übungen und Sets",
    parameters: {
      type: "object",
      properties: {
        session_name: { type: "string" },
        training_type: { enum: ["strength", "zone2", "vo2max"] },
        exercises: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              sets: { type: "array" }
            }
          }
        }
      }
    }
  }
}
```

---

## Zusammenfassung

| Schritt | Komponente | Aufwand |
|---------|------------|---------|
| 1 | TrainingNotesInput.tsx (UI) | ~2h |
| 2 | set-parser.ts erweitern | ~30min |
| 3 | training-ai-parser Edge Function | ~3h |
| 4 | TrainingDaySheet Integration | ~1h |
| 5 | Testing & Feinschliff | ~1h |

**Gesamt: ~7-8 Stunden**

Das Ergebnis: Du kannst dein gesamtes Workout in 30 Sekunden in ein Textfeld tippen, und ARES erstellt automatisch sowohl die Quick-Stats (Layer 2) als auch die detaillierte Volumen-Analyse (Layer 3).
