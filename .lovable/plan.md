

# KI-Ernaehrungsberater: Smart Meal Suggestions

## Uebersicht

Eine kontextbewusste "Was soll ich jetzt essen?"-Funktion im NutritionDaySheet. Auf Knopfdruck generiert die KI 3 personalisierte Mahlzeitenvorschlaege, die ALLE relevanten User-Daten beruecksichtigen - von GLP-1-Status ueber Trainingstyp bis zur aktuellen Tageszeit.

---

## Architektur-Fluss

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    NutritionDaySheet.tsx                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Hero: 1.250 / 2.200 kcal                                        │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Macro Bars (P/C/F)                                              │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ NEU: MealAdvisorSection                                         │ │
│  │ ┌──────────────────────────────────────────────────────────────┐│ │
│  │ │ [Sparkles] "Was soll ich jetzt essen?" Button               ││ │
│  │ │                                                              ││ │
│  │ │ Nach Klick: Carousel mit 3 Karten                          ││ │
│  │ │ ┌────────┐ ┌────────┐ ┌────────┐                           ││ │
│  │ │ │ Lachs  │ │ Quark  │ │ Steak  │                           ││ │
│  │ │ │ Bowl   │ │ Bowl   │ │ Salat  │                           ││ │
│  │ │ └────────┘ └────────┘ └────────┘                           ││ │
│  │ └──────────────────────────────────────────────────────────────┘│ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Heutige Mahlzeiten (Timeline)                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Teil 1: Edge Function - `ares-nutrition-advisor`

### Kontextdaten die erfasst werden

Die Edge Function sammelt alle relevanten Daten parallel:

| Kategorie | Datenquelle | Felder |
|-----------|-------------|--------|
| **Makros heute** | `useDailyMetrics` | consumed: kcal/p/c/f, remaining: kcal/p/c/f |
| **Ziele** | `daily_goals` | calories, protein, carbs, fats |
| **Profil** | `profiles` | goal, activity_level, macro_strategy, muscle_maintenance_priority, dietary_restrictions |
| **Protokoll** | `user_protocol_status` | current_phase (0-3), protocol_mode |
| **GLP-1 Status** | `reta_micro_log` | Letzte Dosis, Tage seit letzter Injektion |
| **Training heute** | `training_sessions` | training_type (RPT, Zone2, VO2max), duration |
| **Schlaf** | `sleep_tracking` | Letzte Nacht: Stunden, Qualitaet |
| **Zeit** | Server | Aktuelle Stunde, Wochentag |

### Intelligenter System Prompt

```text
Du bist der ARES Nutrition Advisor - ein Elite-Ernaehrungsberater fuer optimierte Koerperzusammensetzung.

KONTEXT-FAKTOREN (priorisiert):
1. VERBLEIBENDE MAKROS: {remaining_kcal} kcal, {remaining_protein}g Protein, {remaining_carbs}g Carbs, {remaining_fats}g Fett
2. TAGESZEIT: {hour}:00 Uhr ({meal_timing})
3. GLP-1/RETA STATUS: {glp1_status}
4. HEUTIGES TRAINING: {training_info}
5. PROTOKOLL-PHASE: Phase {phase} ({phase_description})
6. ZIEL: {goal} | Aktivitaet: {activity_level}

REGELN:
1. Vorschlaege MUESSEN die verbleibenden Makros respektieren
2. Bei GLP-1-Nutzung: Kleinere Portionen, leicht verdaulich, hohe Naehrstoffdichte
3. Post-Workout (< 2h nach Training): Schnell absorbierbares Protein + moderate Carbs
4. Abends (nach 20 Uhr): Casein-lastig, weniger Carbs, kein Voellegefuehl
5. Phase 0/1 Defizit: Hochvolumige, saettigende Optionen mit viel Protein
6. Phase 2/3 Maintenance: Mehr Flexibilitaet, darf genussvoller sein

VARIIERE die 3 Vorschlaege:
- Option 1: SCHNELL (< 10 min Zubereitung)
- Option 2: OPTIMAL (beste Makro-Verteilung)
- Option 3: KREATIV (ueberraschend, aber passend)

ANTWORTE NUR mit JSON-Array:
[
  {
    "title": "Griechische Quark-Bowl",
    "reason": "Leicht verdaulich nach Reta, trifft dein Protein-Ziel perfekt",
    "macros": { "kcal": 320, "protein": 35, "carbs": 18, "fats": 12 },
    "prepTime": "5 min",
    "tags": ["quick", "high-protein", "glp1-friendly"]
  },
  ...
]
```

### Edge Function Code-Struktur

```text
supabase/functions/ares-nutrition-advisor/index.ts

1. Auth validieren (Bearer Token)
2. Parallele Datenaggregation:
   - profiles (goal, activity_level, dietary_restrictions, muscle_maintenance_priority)
   - daily_goals (targets)
   - meals (consumed today)
   - user_protocol_status (phase)
   - reta_micro_log (last dose, days since)
   - training_sessions (today)
   - sleep_tracking (last night)
3. Kontext-Objekt bauen mit allen Faktoren
4. Gemini 3 Flash aufrufen (schnell + kostenguenstig)
5. JSON parsen mit jsonrepair Fallback
6. Antwort mit CORS zurueckgeben
```

### Kontext-Payload Interface

```typescript
interface NutritionContext {
  // Zeit
  currentHour: number;
  mealTiming: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'late_night';
  
  // Makros
  consumed: { kcal: number; protein: number; carbs: number; fats: number };
  remaining: { kcal: number; protein: number; carbs: number; fats: number };
  goals: { kcal: number; protein: number; carbs: number; fats: number };
  
  // Profil
  goal: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'recomposition';
  activityLevel: string;
  macroStrategy: string | null;
  musclePriority: boolean;
  dietaryRestrictions: string[];
  
  // Protokoll
  currentPhase: number;
  protocolMode: 'analog' | 'advanced';
  
  // GLP-1 / Reta
  glp1Active: boolean;
  daysSinceLastDose: number | null;
  lastDoseMg: number | null;
  
  // Training
  trainedToday: boolean;
  trainingType: string | null;
  trainingMinutes: number | null;
  hoursSinceTraining: number | null;
  
  // Schlaf
  lastSleepHours: number | null;
  lastSleepQuality: number | null;
}
```

---

## Teil 2: Frontend Komponenten

### A. MealSuggestionCard.tsx

Premium Card-Design fuer jeden Vorschlag:

```text
┌─────────────────────────────────────────────┐
│ 🍳 Griechische Quark-Bowl          5 min   │
│                                             │
│ "Leicht verdaulich nach Reta,               │
│  trifft dein Protein-Ziel perfekt"          │
│                                             │
│ ┌────────┬────────┬────────┬────────┐      │
│ │  320   │   35g  │   18g  │   12g  │      │
│ │  kcal  │    P   │    C   │    F   │      │
│ └────────┴────────┴────────┴────────┘      │
│                                             │
│ [quick] [high-protein] [glp1-friendly]      │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │            Als Mahlzeit loggen          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Features:**
- Gradient-Border mit Premium-Look
- Makro-Grid mit farbigen Badges (P=Gruen, C=Blau, F=Gelb)
- Tags als kleine Chips (max 3)
- "Als Mahlzeit loggen" Button oeffnet Pre-Filled Meal Input

### B. MealAdvisorSection.tsx

Wrapper-Komponente mit States:

| State | UI |
|-------|-----|
| **Initial** | Premium Button "Was soll ich jetzt essen?" mit Sparkles-Icon und Gradient-Border |
| **Loading** | 3 Skeleton-Cards mit Shimmer-Animation im Carousel |
| **Success** | Carousel mit 3 MealSuggestionCards, Dot-Indicators |
| **Error** | Inline Error Message mit Retry-Button |

**Carousel-Setup:**
```text
<Carousel opts={{ align: 'center', loop: true }}>
  <CarouselContent>
    {suggestions.map((meal, idx) => (
      <CarouselItem key={idx} className="basis-[90%] md:basis-[85%]">
        <MealSuggestionCard meal={meal} onLog={handleLogMeal} />
      </CarouselItem>
    ))}
  </CarouselContent>
</Carousel>
```

### C. useMealAdvisor.ts Hook

```typescript
interface MealSuggestion {
  title: string;
  reason: string;
  macros: { kcal: number; protein: number; carbs: number; fats: number };
  prepTime: string;
  tags: string[];
}

export function useMealAdvisor() {
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Context von bestehenden Hooks
  const { data: metrics } = useDailyMetrics();
  const { status: protocolStatus } = useProtocolStatus();
  const { lastDose, getDaysSinceLastDose } = useRetaMicro();

  const generateSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await supabase.functions.invoke('ares-nutrition-advisor', {
        body: {
          // Context wird im Hook aggregiert
          consumed: metrics?.nutrition,
          remaining: calculateRemaining(metrics),
          goals: metrics?.goals,
          currentPhase: protocolStatus?.current_phase,
          glp1Active: !!lastDose && (getDaysSinceLastDose() || 999) < 14,
          // ... weitere Felder
        }
      });
      
      if (response.error) throw response.error;
      setSuggestions(response.data.suggestions);
    } catch (err) {
      setError('Vorschlaege konnten nicht generiert werden');
    } finally {
      setIsLoading(false);
    }
  };

  return { suggestions, isLoading, error, generateSuggestions };
}
```

---

## Teil 3: Integration in NutritionDaySheet

**Position:** Zwischen Macro Bars und Timeline (nach Zeile 247, vor Zeile 249)

```tsx
{/* Macro Bars */}
<div className="space-y-4 mb-6">
  <MacroBar label="Protein" ... />
  <MacroBar label="Kohlenhydrate" ... />
  <MacroBar label="Fett" ... />
</div>

{/* NEU: AI Meal Advisor */}
<MealAdvisorSection 
  onLogMeal={(meal) => {
    // Pre-fill meal input sheet with suggestion
    onClose();
    onAddMeal(meal);
  }}
/>

{/* Timeline Section */}
<div className="mt-6">
  ...
</div>
```

---

## Dateien die erstellt/geaendert werden

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `supabase/functions/ares-nutrition-advisor/index.ts` | NEU | Edge Function mit vollem Kontext |
| `supabase/config.toml` | EDIT | Function eintragen mit `verify_jwt = false` |
| `src/hooks/useMealAdvisor.ts` | NEU | Hook fuer API-Call + State |
| `src/components/nutrition/MealAdvisorSection.tsx` | NEU | Button + Carousel + States |
| `src/components/nutrition/MealSuggestionCard.tsx` | NEU | Premium Card-Design |
| `src/components/home/sheets/NutritionDaySheet.tsx` | EDIT | MealAdvisorSection integrieren |

---

## Beispiel-Szenario

**Kontext:**
- 18:30 Uhr
- Phase 1 (Rekomposition)
- Heute morgens RPT trainiert (90 min)
- Reta-Dosis vor 3 Tagen
- Verbleibend: 750 kcal, 55g Protein, 60g Carbs, 25g Fett

**KI-Vorschlaege:**

| # | Titel | Reason | Makros | Zeit | Tags |
|---|-------|--------|--------|------|------|
| 1 | Lachs-Brokkoli Bowl | "Omega-3 fuer die Recovery, leicht nach Reta" | 480 kcal, 42g P, 20g C, 24g F | 20 min | optimal, post-workout |
| 2 | Protein-Shake mit Beeren | "Schneller Protein-Hit ohne Voellegefuehl" | 280 kcal, 35g P, 25g C, 6g F | 3 min | quick, glp1-friendly |
| 3 | Haettenkäse-Avocado Toast | "Casein + Fette fuer die Nachtregeneration" | 350 kcal, 28g P, 18g C, 20g F | 8 min | creative, evening |

---

## Rate Limit / Fallback Handling

Wie bei `ares-insight-generator` implementiert:

```typescript
if (aiResponse.status === 429 || aiResponse.status === 402) {
  // Fallback: Generische Vorschlaege basierend auf verbleibenden Makros
  return json({
    suggestions: generateStaticFallbackSuggestions(context),
    fallback: true
  });
}
```

**Static Fallback Pool:** 10 vordefinierte Mahlzeiten die nach verbleibenden Makros gefiltert werden.

