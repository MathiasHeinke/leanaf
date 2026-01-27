
# Erweiterter AI Nutrition Advisor mit Evaluation-Modus

## Uebersicht

Erweiterung der `ares-nutrition-advisor` Edge Function und UI um:
1. **Optionales Textfeld** fuer eigene Essensideen
2. **Lester-Style Bewertung** (kurz, wissenschaftlich, direkt - OHNE Phrasen)
3. **Blutwert-Integration** (HbA1c, Triglyceride, Glukose)
4. **2-3 Alternative Vorschlaege** bei User-Ideen
5. **Direkter Save-Flow** zum MealConfirmationDialog

---

## Aenderungen im Detail

### 1. Edge Function: `supabase/functions/ares-nutrition-advisor/index.ts`

**Neue Daten laden - Blutwerte:**
```typescript
// Parallel zu bestehenden Queries hinzufuegen:
bloodworkRes = await adminClient
  .from('user_bloodwork')
  .select('hba1c, fasting_glucose, triglycerides, insulin, test_date')
  .eq('user_id', user.id)
  .order('test_date', { ascending: false })
  .limit(1)
  .maybeSingle()
```

**Erweitertes Context-Interface:**
```typescript
interface NutritionContext {
  // ... bestehende Felder ...
  
  // NEU: Blutwerte
  bloodwork: {
    hba1c: number | null;
    fastingGlucose: number | null;
    triglycerides: number | null;
    insulinSensitivity: 'optimal' | 'normal' | 'reduced' | 'unknown';
  };
}
```

**Neuer Request-Parameter:**
```typescript
const body = await req.json().catch(() => ({}));
const userIdea = body.userIdea as string | undefined;
```

**Zwei Prompt-Pfade:**

A) **Evaluation Mode** (wenn `userIdea` vorhanden):

System-Prompt Stil:
```text
STIL:
- KURZ: 1-2 Saetze max
- Fakt + Konsequenz (z.B. "Weissmehl + Banane = Insulin-Spike. Nicht ideal bei HbA1c 5.8%.")
- KEINE Phrasen wie "Okay pass auf", "Hoer zu", "Die Wissenschaft sagt"
- Wissenschaftlich fundiert, direkt zur Sache

BLUTWERT-REGELN:
- HbA1c > 5.7%: Warne vor High-GI Carbs
- Triglyceride > 150: Weniger Fruktose, raffinierte Carbs
- Post-Workout Ausnahme: Schnelle Carbs erlaubt

AUSGABE:
{
  "type": "evaluation",
  "verdict": "ok",
  "reason": "Schnelle Energie, aber Insulin-Spike. Bei HbA1c 5.8% suboptimal.",
  "macros": { "kcal": 280, "protein": 6, "carbs": 52, "fats": 4 },
  "optimization": "+Quark = stabiler Blutzucker, +18g Protein",
  "alternatives": [...]
}
```

B) **Suggestion Mode** (ohne `userIdea`):
- Bestehender Prompt mit Blutwert-Kontext ergaenzt
- Bei erhoehtem HbA1c: Low-GI Optionen priorisieren

**Response-Typen:**
```typescript
// Suggestions (wie bisher)
{ type: 'suggestions', suggestions: [...] }

// Evaluation (neu)
{ type: 'evaluation', verdict, reason, macros, optimization, alternatives }
```

---

### 2. Hook: `src/hooks/useMealAdvisor.ts`

**Erweiterte Typen:**
```typescript
export interface MealEvaluation {
  userIdea: string;
  verdict: 'optimal' | 'ok' | 'suboptimal';
  reason: string;
  macros: { kcal: number; protein: number; carbs: number; fats: number };
  optimization: string;
  tags: string[];
  alternatives: MealSuggestion[];
}

interface MealAdvisorState {
  suggestions: MealSuggestion[];
  evaluation: MealEvaluation | null;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  mode: 'idle' | 'suggestions' | 'evaluation';
}
```

**Erweiterte Funktion:**
```typescript
const generateSuggestions = useCallback(async (userIdea?: string) => {
  // Sende userIdea an Edge Function
  const { data } = await supabase.functions.invoke('ares-nutrition-advisor', {
    body: { userIdea: userIdea?.trim() || undefined }
  });
  
  // Handle beide Response-Typen
  if (data.type === 'evaluation') {
    setState({ evaluation: data, mode: 'evaluation', ... });
  } else {
    setState({ suggestions: data.suggestions, mode: 'suggestions', ... });
  }
}, []);
```

---

### 3. UI: `src/components/nutrition/MealAdvisorSection.tsx`

**Neuer State:**
```typescript
const [userIdea, setUserIdea] = useState('');
```

**UI-Struktur (Initial State):**
```text
┌────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────┐ │
│ │ z.B. "Banane und Broetchen"                        ✕   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ✨ Was soll ich essen?  /  🔍 Check meine Idee         │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Button-Logik:**
- Leer: Icon = Sparkles, Text = "Was soll ich jetzt essen?"
- Mit Text: Icon = Search, Text = "Check meine Idee"

**Neue States im Rendering:**
- `mode === 'evaluation'`: Zeigt EvaluationCard + Alternativen-Carousel
- `mode === 'suggestions'`: Zeigt Carousel (wie bisher)

---

### 4. Neue Komponente: `src/components/nutrition/EvaluationCard.tsx`

**Design:**
```text
┌─────────────────────────────────────────────────────────────┐
│ Deine Idee: Banane und Broetchen               [👍 OK]      │
│                                                             │
│ "Schnelle Energie, aber Insulin-Spike.                      │
│  Bei HbA1c 5.8% suboptimal."                                │
│                                                             │
│ ┌────────┬────────┬────────┬────────┐                      │
│ │  280   │   6g   │   52g  │   4g   │                      │
│ │  kcal  │    P   │    C   │    F   │                      │
│ └────────┴────────┴────────┴────────┘                      │
│                                                             │
│ 💡 +Quark = stabiler Blutzucker, +18g Protein              │
│                                                             │
│ [ Als Mahlzeit speichern ]                                  │
└─────────────────────────────────────────────────────────────┘
```

**Verdict Badges:**
| Verdict | Icon | Farbe |
|---------|------|-------|
| optimal | CheckCircle | Gruen (emerald-500) |
| ok | ThumbsUp | Amber (amber-500) |
| suboptimal | AlertTriangle | Orange (orange-500) |

---

### 5. Integration: `src/components/home/sheets/NutritionDaySheet.tsx`

**Save-Flow Update:**

Wenn auf "Als Mahlzeit speichern" geklickt wird:
1. Callback `onLogMeal` wird mit Meal-Daten aufgerufen
2. NutritionDaySheet schliesst
3. Oeffnet `onAddMeal` mit pre-filled Daten

```typescript
<MealAdvisorSection 
  onLogMeal={(meal) => {
    // meal kann MealSuggestion oder EvaluationData sein
    const title = 'userIdea' in meal ? meal.userIdea : meal.title;
    
    // Pre-fill data fuer MealConfirmationDialog
    // (ueber localStorage oder Context weiterreichen)
    localStorage.setItem('prefill_meal', JSON.stringify({
      title,
      calories: meal.macros.kcal,
      protein: meal.macros.protein,
      carbs: meal.macros.carbs,
      fats: meal.macros.fats
    }));
    
    onClose();
    onAddMeal();
  }}
/>
```

---

## Dateien

| Datei | Aktion |
|-------|--------|
| `supabase/functions/ares-nutrition-advisor/index.ts` | EDIT: Blutwerte laden, Dual-Mode, Lester-Prompt |
| `src/hooks/useMealAdvisor.ts` | EDIT: MealEvaluation Type, userIdea Parameter |
| `src/components/nutrition/MealAdvisorSection.tsx` | EDIT: Input-Feld, dynamischer Button, Evaluation-Rendering |
| `src/components/nutrition/EvaluationCard.tsx` | NEU: Bewertungs-Card |
| `src/components/nutrition/MealSuggestionCard.tsx` | EDIT: Neue Tags fuer Blutwert-Kontext |
| `src/components/home/sheets/NutritionDaySheet.tsx` | EDIT: Pre-fill Logik |

---

## Beispiel-Antworten (Lester-Stil)

| Input | Antwort |
|-------|---------|
| "Toast mit Nutella" | "Weissmehl + Zucker = doppelter Glukose-Spike. Bei Triglyceriden 165 nicht empfohlen." |
| "Banane und Broetchen" | "Schnelle Carbs auf nuechternen Magen. Insulin-Spike bei HbA1c 5.8% vermeiden." |
| "Haettenkäse mit Gurke" | "Casein + Ballaststoffe = stabile Energie. Passt optimal zu deinen Makros." |

---

## Technische Details

**Insulin-Sensitivitaets-Berechnung:**
```typescript
function calculateInsulinSensitivity(glucose: number | null, insulin: number | null) {
  if (!glucose || !insulin) return 'unknown';
  const homaIr = (glucose * insulin) / 405;
  if (homaIr < 1.0) return 'optimal';
  if (homaIr < 2.5) return 'normal';
  return 'reduced';
}
```

**Fallback bei fehlenden Blutwerten:**
- Wenn keine Blutwerte vorhanden: Allgemeine Low-GI Empfehlungen
- Kein Fehler, nur weniger personalisiert
