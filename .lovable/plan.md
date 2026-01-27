

# Wasserziel (fluid_goal_ml) Einstellungs-Feature

## Uebersicht

Aktuell gibt es keine UI um das taegliche Wasserziel einzustellen. Der Wert `fluid_goal_ml` wird an zwei Stellen hardcoded auf `2000` gesetzt und ueberschreibt dadurch jede Aenderung in der Datenbank.

**Ziel:** User kann das Wasserziel sowohl im Profil als auch direkt im HydrationDaySheet (Layer 2) aendern.

---

## Aktuelle Probleme

| Datei | Zeile | Problem |
|-------|-------|---------|
| `src/pages/Profile.tsx` | 567 | `fluid_goal_ml: 2000` hardcoded beim Save |
| `src/components/Settings.tsx` | 91 | `fluid_goal_ml: 2000` hardcoded beim Save |
| Beide | - | Kein State fuer `fluidGoalMl`, keine Eingabe |

---

## Aenderungen

### 1. Profile.tsx - Neues Eingabefeld

**State hinzufuegen (ca. Zeile 55):**
```typescript
const [fluidGoalMl, setFluidGoalMl] = useState(2500);
```

**Aus Datenbank laden (in loadProfile oder loadDailyGoals):**
- `fluid_goal_ml` aus `daily_goals` oder `profiles` lesen
- State setzen

**UI im Ziele-Bereich (nach Zeile 870, nach dem Zieldatum):**
```text
┌─────────────────────────────────────────────┐
│  Ziele                                      │
│  ┌───────────────────────────────────────┐  │
│  │ [Droplet Icon] Taegliches Wasserziel  │  │
│  │                                       │  │
│  │  ┌──────────────────────────────────┐ │  │
│  │  │  ◄──────────●───────────────►    │ │  │
│  │  │           2.5 L                  │ │  │
│  │  └──────────────────────────────────┘ │  │
│  │  1.5 L              4.0 L             │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Komponente:** Slider mit Range 1500-5000ml (Schritte: 250ml)

**Save-Logik anpassen (Zeile 567):**
```typescript
// VORHER
fluid_goal_ml: 2000,

// NACHHER  
fluid_goal_ml: fluidGoalMl,
```

**Auto-Save Dependencies ergaenzen (Zeile 159):**
```typescript
useEffect(() => {
  // ...
}, [..., fluidGoalMl]);  // <- hinzufuegen
```

---

### 2. Settings.tsx - Eingabefeld hinzufuegen

**State und Load (Zeile 32-63):**
```typescript
const [fluidGoalMl, setFluidGoalMl] = useState(2500);

// In loadHidePreference oder separater Funktion:
// fluid_goal_ml aus daily_goals laden
```

**UI hinzufuegen (nach Kalorien-Feld):**
- Label: "Wasserziel"
- Slider oder NumericInput (1.5L - 5.0L)
- Anzeige in Litern

**Save-Logik anpassen (Zeile 91):**
```typescript
fluid_goal_ml: fluidGoalMl,  // statt 2000
```

---

### 3. HydrationDaySheet.tsx - Layer 2 Quick-Edit

**Neuer Edit-Button im Header (nach Zeile 202):**
```text
┌─────────────────────────────────────────────┐
│  Wasserhaushalt                    [X]      │
│  27. Januar 2026                            │
├─────────────────────────────────────────────┤
│                                             │
│           2.5 / 3.0L    [Bearbeiten ✎]     │
│         Liter getrunken                     │
│                                             │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░ 83%            │
│                                             │
│         Noch 0.5L bis zum Ziel              │
│                                             │
└─────────────────────────────────────────────┘
```

**Inline-Edit Modal/Popover:**
```text
┌─────────────────────────────────────┐
│  Wasserziel anpassen               │
│                                     │
│  ◄───────────●─────────────────►   │
│            3.0 L                   │
│  1.5 L                    5.0 L    │
│                                     │
│  [Speichern]                        │
└─────────────────────────────────────┘
```

**Implementierung:**
1. State: `const [isEditingGoal, setIsEditingGoal] = useState(false);`
2. State: `const [editGoalValue, setEditGoalValue] = useState(target);`
3. Save-Handler: Supabase `daily_goals.upsert({ fluid_goal_ml: ... })`
4. Cache invalidieren: `queryClient.invalidateQueries(['daily-metrics'])`

**Interaktion:**
- Tap auf "3.0L" oder Pencil-Icon oeffnet Slider-Popover
- Slider aendern -> sofortiges visuelles Feedback
- "Speichern" -> Datenbank + Toast + Cache invalidieren
- Progress Bar und "Noch XL bis zum Ziel" aktualisieren sich sofort

---

## Technische Details

### Slider-Komponente (Wiederverwendbar)

Neue Komponente `src/components/ui/fluid-goal-slider.tsx`:

```typescript
interface FluidGoalSliderProps {
  value: number;           // in ml
  onChange: (ml: number) => void;
  min?: number;            // default 1500
  max?: number;            // default 5000
  step?: number;           // default 250
  disabled?: boolean;
}

// Anzeige in Litern: (value / 1000).toFixed(1) + "L"
// Interne Werte in ml fuer Konsistenz
```

### Datenbank-Schema (bereits vorhanden)

Die Spalte `fluid_goal_ml` existiert bereits in:
- `daily_goals.fluid_goal_ml` (INTEGER, default 2500)
- Wird von `useDailyMetrics` gelesen

### Cache-Synchronisation

Nach Aenderung des Ziels:
1. `supabase.from('daily_goals').upsert({ fluid_goal_ml: newValue })`
2. `queryClient.setQueryData(['daily-metrics'], ...)` fuer Optimistic Update
3. ODER `queryClient.invalidateQueries(['daily-metrics'])`

---

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/components/ui/fluid-goal-slider.tsx` | **NEU** - Wiederverwendbare Slider-Komponente |
| `src/pages/Profile.tsx` | State + UI + Save-Logik |
| `src/components/Settings.tsx` | State + UI + Save-Logik |
| `src/components/home/sheets/HydrationDaySheet.tsx` | Inline-Edit mit Slider-Popover |

---

## Benutzer-Flow

### Flow 1: Im Profil einstellen
```text
User oeffnet Profil -> scrollt zu "Ziele" -> sieht Wasserziel-Slider
-> zieht Slider auf 3.0L -> Auto-Save nach 1 Sekunde
-> Dashboard zeigt neues Ziel
```

### Flow 2: Quick-Edit im Layer 2
```text
User ist auf Dashboard -> tippt Wasser-Widget -> HydrationDaySheet oeffnet
-> tippt auf "3.0L" -> Slider-Popover erscheint
-> aendert zu 2.5L -> tippt "Speichern"
-> Sheet zeigt sofort neues Ziel, Progress Bar aktualisiert
```

---

## Erfolgskriterien

1. Wasserziel kann im Profil eingestellt werden (1.5L - 5.0L)
2. Wasserziel kann im HydrationDaySheet geaendert werden
3. Hardcoded `2000` in Profile.tsx und Settings.tsx entfernt
4. Aenderungen werden sofort im Dashboard reflektiert
5. Wert bleibt nach App-Neustart erhalten

