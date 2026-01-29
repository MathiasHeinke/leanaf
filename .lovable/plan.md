

# Plan: KI-Fallback für Training Parser

## Zusammenfassung

Implementierung eines "✨ Mit KI prüfen" Buttons, der bei fehlgeschlagenem Regex-Parsing **Gemini 3 Flash** aufruft, um natürlichsprachliche Eingaben wie `"goblet squad: 3x 8x mit 14kg Hantel"` in strukturierte Daten umzuwandeln.

---

## Architektur

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    TrainingNotesInput.tsx                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Textarea: "1. goblet squad: 3x 8x mit 14kg Hantel..."                  │
│                                                                         │
│  📊 Erkannt:                                                            │
│  ⚠️ Keine gültigen Übungen erkannt.                                     │
│                                                                         │
│  [✨ Mit KI prüfen]  ← NEU: Erscheint wenn exercises.length === 0       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                                  │ Klick
                                  ▼

┌─────────────────────────────────────────────────────────────────────────┐
│               Edge Function: training-ai-parser                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Input: { raw_text, use_ai: true }                                   │
│                                                                         │
│  2. Gemini 3 Flash via Lovable AI Gateway                               │
│     → Tool-Calling für strukturierte JSON-Ausgabe                       │
│     → parse_training_log Tool Definition                                │
│                                                                         │
│  3. Output: Strukturierte Übungsliste                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementierung

### 1. Edge Function erweitern: `training-ai-parser/index.ts`

**Neue Eingabe-Parameter:**
- `use_ai: boolean` - Erzwingt KI-Parsing

**Neue Funktion `parseWithGemini()`:**

```typescript
async function parseWithGemini(rawText: string): Promise<ParseResult | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('[TRAINING-AI-PARSER] No LOVABLE_API_KEY');
    return null;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Fitness-Experte. Parse Trainings-Logs in strukturierte Daten.

Regeln:
- Erkenne Übungsnamen auch bei Tippfehlern ("goblet squad" → "Goblet Squat")
- "3x 8x" = 3 Sets à 8 Wiederholungen
- "je Seite" / "pro Seite" = unilateral (Gewicht pro Arm/Bein)
- "KH" = Kurzhantel, "LH" = Langhantel
- Kein RPE angegeben → setze auf 7
- Gewichte immer in kg`
        },
        { role: 'user', content: `Parse diesen Trainings-Log:\n\n${rawText}` }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'parse_training_log',
          description: 'Gibt geparste Übungen als strukturierte Daten zurück',
          parameters: {
            type: 'object',
            properties: {
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Normalisierter Übungsname' },
                    sets: { type: 'number', description: 'Anzahl Sets' },
                    reps: { type: 'number', description: 'Wiederholungen pro Set' },
                    weight_kg: { type: 'number', description: 'Gewicht in kg' },
                    rpe: { type: 'number', description: 'RPE 1-10' },
                    notes: { type: 'string', description: 'Zusätzliche Notizen' }
                  },
                  required: ['name', 'sets', 'reps', 'weight_kg']
                }
              }
            },
            required: ['exercises']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'parse_training_log' } }
    })
  });

  // Parse response und konvertiere in internes Format
  // ...
}
```

**Erweiterte Hauptlogik:**

```typescript
const { raw_text, training_type = 'strength', persist = false, use_ai = false } = await req.json();

// Regex-Pass
let parseResult = parseTrainingText(raw_text);

// KI-Fallback wenn: explizit angefordert ODER keine Übungen erkannt
if (use_ai || parseResult.exercises.length === 0) {
  console.log('[TRAINING-AI-PARSER] Trying AI fallback...');
  const aiResult = await parseWithGemini(raw_text);
  
  if (aiResult && aiResult.exercises.length > 0) {
    parseResult = aiResult;
    parseResult.warnings.push('Parsing via KI durchgeführt');
    console.log(`[TRAINING-AI-PARSER] AI parsed ${aiResult.exercises.length} exercises`);
  }
}
```

---

### 2. UI-Änderungen: `TrainingNotesInput.tsx`

**Neue States:**
```typescript
const [isAiParsing, setIsAiParsing] = useState(false);
const [aiParsedData, setAiParsedData] = useState<ParsedExercise[] | null>(null);
```

**Neue Funktion `handleAiParse()`:**
```typescript
const handleAiParse = async () => {
  setIsAiParsing(true);
  try {
    const { data, error } = await supabase.functions.invoke('training-ai-parser', {
      body: {
        raw_text: rawText,
        training_type: trainingType,
        use_ai: true,
        persist: false
      }
    });
    
    if (error) throw error;
    
    if (data?.exercises?.length > 0) {
      // Konvertiere Backend-Format in Client-Format
      const clientExercises: ParsedExercise[] = data.exercises.map((ex: any) => ({
        name: ex.normalized_name || ex.name,
        sets: ex.sets,
        totalVolume: ex.total_volume_kg
      }));
      
      setAiParsedData(clientExercises);
      toast.success(`${data.exercises.length} Übungen erkannt!`, {
        description: 'KI-Parsing erfolgreich'
      });
    } else {
      toast.error('KI konnte keine Übungen erkennen');
    }
  } catch (error) {
    console.error('AI parsing failed:', error);
    toast.error('KI-Parsing fehlgeschlagen');
  } finally {
    setIsAiParsing(false);
  }
};
```

**Neuer Button im UI:**
```tsx
{/* Nach der Warnung "Keine gültigen Übungen erkannt" */}
{!hasValidExercises && hasContent && !aiParsedData && (
  <Button
    variant="outline"
    size="sm"
    onClick={handleAiParse}
    disabled={isAiParsing}
    className="mt-3 gap-2 w-full"
  >
    {isAiParsing ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        KI analysiert...
      </>
    ) : (
      <>
        <Sparkles className="w-4 h-4" />
        Mit KI prüfen
      </>
    )}
  </Button>
)}
```

**Angepasste Preview-Logik:**
```typescript
// Nutze AI-Daten wenn vorhanden, sonst Regex
const displayData = useMemo(() => {
  if (aiParsedData && aiParsedData.length > 0) {
    return {
      exercises: aiParsedData,
      totalVolume: aiParsedData.reduce((sum, ex) => sum + ex.totalVolume, 0),
      totalSets: aiParsedData.reduce((sum, ex) => sum + ex.sets.length, 0),
      isFromAi: true
    };
  }
  return { ...parsedData, isFromAi: false };
}, [parsedData, aiParsedData]);
```

---

## Erwartetes Parsing-Ergebnis

**Input:**
```
1. goblet squad: 3x 8x mit 14kg Hantel
2. kurzanhtel bankdrücken 3x 8x je 14kg pro Seite
3. einarmig KH rudern 3x 8x 18kg je Seite
4. rumänisches Kreuzheben mit 3x 10x 22kg je Seite
5. Overheadpress 3x 8x 12kg je Seite
6. und 7. am kabelturm Bizeps und trizeps mit 20kg 3x 8x
```

**Gemini Output (via Tool-Calling):**
```json
{
  "exercises": [
    { "name": "Goblet Squat", "sets": 3, "reps": 8, "weight_kg": 14 },
    { "name": "Kurzhantel Bankdrücken", "sets": 3, "reps": 8, "weight_kg": 14 },
    { "name": "Einarmiges Kurzhantel Rudern", "sets": 3, "reps": 8, "weight_kg": 18 },
    { "name": "Rumänisches Kreuzheben", "sets": 3, "reps": 10, "weight_kg": 22 },
    { "name": "Overhead Press", "sets": 3, "reps": 8, "weight_kg": 12 },
    { "name": "Bizeps Curls (Kabel)", "sets": 3, "reps": 8, "weight_kg": 20 },
    { "name": "Trizeps Pushdown", "sets": 3, "reps": 8, "weight_kg": 20 }
  ]
}
```

---

## UI-Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📝 Schnelles Training loggen                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 1. goblet squad: 3x 8x mit 14kg Hantel                          ││
│  │ 2. kurzanhtel bankdrücken 3x 8x je 14kg pro Seite               ││
│  │ ...                                                              ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  📊 Erkannt:                                                        │
│  ⚠️ Keine gültigen Übungen erkannt. Format: "Übung 3x10 80kg"       │
│                                                                     │
│  [✨ Mit KI prüfen]  ← NEU                                          │
│                                                                     │
│  [Workout speichern] (disabled)                                     │
└─────────────────────────────────────────────────────────────────────┘

                    ↓ Klick auf "Mit KI prüfen"

┌─────────────────────────────────────────────────────────────────────┐
│  📊 Erkannt (via KI ✨):                                            │
│  ✓ Goblet Squat: 3×8×14kg (336kg)                                   │
│  ✓ Kurzhantel Bankdrücken: 3×8×14kg (336kg)                         │
│  ✓ Einarmiges KH Rudern: 3×8×18kg (432kg)                           │
│  ✓ Rumänisches Kreuzheben: 3×10×22kg (660kg)                        │
│  ✓ Overhead Press: 3×8×12kg (288kg)                                 │
│  ✓ Bizeps Curls (Kabel): 3×8×20kg (480kg)                           │
│  ✓ Trizeps Pushdown: 3×8×20kg (480kg)                               │
│                                                                     │
│  Gesamt: 3.012 kg                                                   │
│                                                                     │
│  [✓ Workout speichern] (jetzt aktiv)                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `supabase/functions/training-ai-parser/index.ts` | **EDIT** | `parseWithGemini()` Funktion + `use_ai` Parameter |
| `src/components/training/TrainingNotesInput.tsx` | **EDIT** | "Mit KI prüfen" Button + State-Management |

---

## Technische Details

### Rate Limits & Error Handling

```typescript
// In parseWithGemini()
if (!response.ok) {
  if (response.status === 429) {
    console.warn('[TRAINING-AI-PARSER] Rate limited');
    return null;
  }
  if (response.status === 402) {
    console.warn('[TRAINING-AI-PARSER] Payment required');
    return null;
  }
  console.error('[TRAINING-AI-PARSER] AI gateway error:', response.status);
  return null;
}
```

### Reset bei Text-Änderung

```typescript
// In TrainingNotesInput.tsx
useEffect(() => {
  // Reset AI-Daten wenn User Text ändert
  setAiParsedData(null);
}, [rawText]);
```

---

## Aufwandsschätzung

| Komponente | Aufwand |
|------------|---------|
| Edge Function: `parseWithGemini()` | ~1.5h |
| UI: Button + State | ~45min |
| Testing & Deploy | ~30min |

**Gesamt: ~2.5-3 Stunden**

---

## Vorteile

1. **Kosteneffizient:** KI nur bei Bedarf, nicht bei jedem Keystroke
2. **Robust:** Tool-Calling garantiert valides JSON
3. **User-Kontrolle:** Button gibt explizite Kontrolle
4. **Fallback-Kette:** Regex → KI → Manuell

