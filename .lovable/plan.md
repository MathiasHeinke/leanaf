
# Plan: Cardio-Parsing für Training Logger

## Problem-Analyse

Aktueller State aus dem Screenshot:
```
Input:  "laufband 10min. bei 9-12kmh"
Output: "Laufband: 1×1×0kg (0kg)"
```

Das System versucht Cardio wie Krafttraining zu parsen (Sets × Reps × Weight), was scheitert weil:

1. **Regex erwartet** `4x10 80kg` Format
2. **Datenstruktur** ist nur für `SetEntry { reps, weight, rpe }`
3. **AI-Prompt** fragt nur nach `sets`, `reps`, `weight_kg`

Cardio hat andere Metriken:
- ⏱️ Dauer (10 min)
- 📏 Distanz (optional, z.B. 5km)
- 💨 Geschwindigkeit/Pace (9-12 km/h)
- ❤️ Herzfrequenz (optional)

---

## Lösungsarchitektur

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRAINING PARSER V2                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: "Laufband 10min bei 9-12kmh"                                        │
│                    ↓                                                        │
│         ┌─────────────────────────┐                                         │
│         │  Aktivitäts-Erkennung   │ ← Regex: laufband|joggen|radfahren|...  │
│         └───────────┬─────────────┘                                         │
│                     ↓                                                       │
│         ┌─────────────────────────┐                                         │
│         │ training_type = cardio? │                                         │
│         └───────────┬─────────────┘                                         │
│              ↙             ↘                                               │
│     ┌─────────────┐    ┌─────────────┐                                      │
│     │  Kraft-     │    │  Cardio-    │                                      │
│     │  Parser     │    │  Parser     │                                      │
│     │             │    │             │                                      │
│     │ sets×reps   │    │ duration    │                                      │
│     │ weight_kg   │    │ distance_km │                                      │
│     │ rpe         │    │ speed_kmh   │                                      │
│     └──────┬──────┘    │ avg_hr      │                                      │
│            │           └──────┬──────┘                                      │
│            ↓                  ↓                                             │
│     ┌───────────────────────────────┐                                       │
│     │     training_sessions         │                                       │
│     │     session_data: JSONB       │ ← Speichert cardio_data oder sets     │
│     └───────────────────────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technische Änderungen

### 1. Erweiterte Types (`src/types/training.ts`)

```typescript
// Cardio-spezifische Datenstruktur
export interface CardioEntry {
  activity: CardioType;          // walking | running | cycling | ...
  duration_minutes: number;      // 10
  distance_km?: number;          // 1.5
  speed_kmh?: number;           // 9
  speed_max_kmh?: number;       // 12
  pace_min_km?: number;         // 6:00 (als Dezimal: 6.0)
  avg_hr?: number;              // 145
  max_hr?: number;              // 165
  incline_percent?: number;     // 2% Steigung
  calories?: number;            // 150
  notes?: string;               // "Intervalle"
}
```

### 2. Client-seitiger Cardio-Parser (`src/tools/cardio-parser.ts`)

```typescript
export function parseCardioFromText(input: string): CardioEntry | null {
  const lower = input.toLowerCase();
  
  // Aktivitäts-Erkennung
  const activityPatterns = {
    running: /laufband|joggen|laufen|jogging|running|sprint/,
    cycling: /rad|bike|cycling|ergometer|spinning/,
    rowing: /rudern|rowing|ruderger/,
    swimming: /schwimmen|swimming|bahnen/,
    walking: /gehen|walking|spazier/,
    stairmaster: /stepper|stairmaster|treppen/
  };
  
  let activity: CardioType = 'other';
  for (const [type, pattern] of Object.entries(activityPatterns)) {
    if (pattern.test(lower)) { activity = type as CardioType; break; }
  }
  
  // Dauer extrahieren: "10min", "30 minuten", "1h", "1.5 stunden"
  const durationMatch = input.match(
    /(\d+(?:[\.,]\d+)?)\s*(min|minuten?|h|stunden?)/i
  );
  
  // Geschwindigkeit: "9-12kmh", "10 km/h", "bei 12kmh"
  const speedMatch = input.match(
    /(\d+(?:[\.,]\d+)?)\s*(?:-\s*(\d+(?:[\.,]\d+)?))?\s*(?:km\/h|kmh)/i
  );
  
  // Distanz: "5km", "3.2 kilometer"
  const distanceMatch = input.match(
    /(\d+(?:[\.,]\d+)?)\s*(km|kilometer|m|meter)/i
  );
  
  // Herzfrequenz: "HR 145", "Puls 150", "@140bpm"
  const hrMatch = input.match(
    /(?:hr|puls|bpm|herzfrequenz)\s*(\d+)/i
  );
  
  // Mindestens Aktivität + Dauer muss vorhanden sein
  if (!durationMatch) return null;
  
  const duration = parseFloat(durationMatch[1].replace(',', '.'));
  const durationMinutes = durationMatch[2].startsWith('h') 
    ? duration * 60 
    : duration;
  
  return {
    activity,
    duration_minutes: Math.round(durationMinutes),
    speed_kmh: speedMatch ? parseFloat(speedMatch[1].replace(',', '.')) : undefined,
    speed_max_kmh: speedMatch?.[2] ? parseFloat(speedMatch[2].replace(',', '.')) : undefined,
    distance_km: distanceMatch ? parseFloat(distanceMatch[1].replace(',', '.')) : undefined,
    avg_hr: hrMatch ? parseInt(hrMatch[1]) : undefined
  };
}
```

### 3. AI-Prompt Erweiterung (`training-ai-parser/index.ts`)

Der AI-Prompt braucht eine zweite Tool-Definition für Cardio:

```typescript
tools: [
  {
    type: 'function',
    function: {
      name: 'parse_strength_log',
      // ... bestehende Kraft-Tool Definition
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_cardio_log',
      description: 'Parse cardio/endurance training log',
      parameters: {
        type: 'object',
        properties: {
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                activity: { 
                  type: 'string', 
                  enum: ['running', 'cycling', 'rowing', 'swimming', 'walking', 'other'],
                  description: 'Art der Cardio-Aktivität' 
                },
                duration_minutes: { type: 'number', description: 'Dauer in Minuten' },
                distance_km: { type: 'number', description: 'Distanz in km (optional)' },
                speed_kmh: { type: 'number', description: 'Geschwindigkeit in km/h (optional)' },
                avg_hr: { type: 'number', description: 'Durchschnittliche Herzfrequenz (optional)' },
                notes: { type: 'string', description: 'Zusätzliche Notizen' }
              },
              required: ['activity', 'duration_minutes']
            }
          }
        },
        required: ['activities']
      }
    }
  }
]
```

### 4. TrainingNotesInput UI Anpassung

Preview für Cardio zeigt andere Metriken:

```typescript
// Bei Cardio-Typ
{trainingType === 'cardio' && parsedCardio && (
  <div className="flex items-center gap-2 text-sm">
    <Check className="w-3.5 h-3.5 text-emerald-500" />
    <span className="font-medium">{activityLabel}:</span>
    <span className="text-muted-foreground">
      {parsedCardio.duration_minutes} min
      {parsedCardio.speed_kmh && ` @ ${parsedCardio.speed_kmh} km/h`}
      {parsedCardio.distance_km && ` • ${parsedCardio.distance_km} km`}
    </span>
  </div>
)}
```

### 5. Datenbank-Speicherung

Cardio-Daten werden im bestehenden `session_data` JSONB-Feld gespeichert:

```typescript
// training_sessions.session_data für Cardio:
{
  training_type: 'zone2', // oder 'vo2max'
  cardio_entries: [
    {
      activity: 'running',
      duration_minutes: 10,
      speed_kmh: 9,
      speed_max_kmh: 12,
      notes: 'Intervalle auf Laufband'
    }
  ]
}
```

---

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/types/training.ts` | EDIT | `CardioEntry` Interface hinzufügen |
| `src/tools/cardio-parser.ts` | CREATE | Client-seitiger Cardio-Parser |
| `src/tools/set-parser.ts` | EDIT | Export `isCardioInput()` Detection-Helper |
| `src/components/training/TrainingNotesInput.tsx` | EDIT | Cardio-Preview und dualen Parser-Pfad |
| `supabase/functions/training-ai-parser/index.ts` | EDIT | Cardio-Tool + Parsing-Logik |

---

## Erwartetes Ergebnis

```text
VORHER:
┌─────────────────────────────────────────┐
│  Input: "laufband 10min. bei 9-12kmh"   │
│                                         │
│  📊 Erkannt:                            │
│  ✓ Laufband: 1×1×0kg (0kg)  ← FALSCH    │
│                                         │
│  Gesamt: 0 kg   1 Sets                  │
└─────────────────────────────────────────┘

NACHHER:
┌─────────────────────────────────────────┐
│  Input: "laufband 10min. bei 9-12kmh"   │
│                                         │
│  📊 Erkannt (Cardio):                   │
│  ✓ 🏃 Laufband: 10 min @ 9-12 km/h      │
│                                         │
│  Gesamt: 10 min Cardio                  │
└─────────────────────────────────────────┘
```

---

## Aufwand

| Task | Zeit |
|------|------|
| Types erweitern | 5 min |
| `cardio-parser.ts` erstellen | 20 min |
| `TrainingNotesInput` dual path | 25 min |
| Edge Function erweitern | 30 min |
| Testen | 15 min |

**Gesamt: ~1.5 Stunden**
