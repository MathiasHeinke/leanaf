
# Nutrition Day Sheet - "Layer 2" Implementation

## Übersicht

Wir implementieren das **"Three-Layer-Design"** für die Ernährungs-Ansicht:
- **Layer 1**: NutritionWidget (Status-Check) - bereits vorhanden
- **Layer 2**: NutritionDaySheet (Kontext) - DIESES FEATURE
- **Layer 3**: Analytics Page - zukünftig

Das Day Sheet öffnet sich beim Klick auf das NutritionWidget und zeigt die heutigen Mahlzeiten in einer Timeline-Ansicht - ohne den Homescreen zu verlassen.

---

## Architektur

```text
NutritionWidget (onClick)
       |
       v
NutritionDaySheet (Bottom Sheet, ~85% Höhe)
       |
       +-- Hero Section: Makro-Ringe + verbleibende kcal
       |
       +-- Timeline: Heutige Mahlzeiten (chronologisch)
       |
       +-- Footer: "Mahlzeit hinzufügen" + "Analyse" Link
```

---

## Neue Dateien

### 1. `src/hooks/useTodaysMeals.ts`

Hook zum Abrufen der heutigen Mahlzeiten mit optimistischer Lösch-Funktion:

```typescript
// Felder aus meals-Tabelle:
// id, text, title, calories, protein, carbs, fats, 
// ts, meal_type, created_at

interface TodayMeal {
  id: string;
  text: string;
  title: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ts: string;
  mealType: string | null;
}
```

**Features:**
- Query: `meals WHERE date = today ORDER BY ts ASC`
- `deleteMeal(id)`: Optimistisches UI-Update + Supabase Delete
- Cache-Invalidierung nach Löschung
- Integration mit `useDailyMetrics` für Totals

### 2. `src/components/home/sheets/NutritionDaySheet.tsx`

Premium Bottom Sheet im Apple-Health-Style:

**Structure:**
```text
+----------------------------------+
|  [Handle Bar]                    |
|  Heute                       [X] |
+----------------------------------+
|                                  |
|    ┌─────────────────────┐       |
|    │   1,193 / 2,200     │       |
|    │      kalorien       │       |
|    └─────────────────────┘       |
|                                  |
|  ════════════════════════════    |
|  Protein  ████████░░  142/150g   |
|  Carbs    ███░░░░░░░   51/250g   |
|  Fett     ████░░░░░░   39/65g    |
|  ════════════════════════════    |
|                                  |
|  ─── TIMELINE ───────────────    |
|                                  |
|  12:32  40g Whey Protein     🗑  |
|         160 kcal                 |
|                                  |
|  16:00  60g Whey-Protein    🗑   |
|         240 kcal                 |
|                                  |
|  18:45  30g Whey-Isolat     🗑   |
|         110 kcal                 |
|                                  |
|  19:00  Reis mit Brokkoli   🗑   |
|         205 kcal                 |
|                                  |
|  19:30  2 Hähnchen Schenkel 🗑   |
|         478 kcal                 |
|                                  |
+----------------------------------+
| [+ Mahlzeit hinzufügen]  [📊]   |
+----------------------------------+
```

**Visual Design:**
- `motion.div` mit Spring-Animation (wie QuickLogSheet)
- Drag-to-dismiss (`drag="y"`)
- Backdrop blur `bg-black/40 backdrop-blur-sm`
- Hero: Große Kalorienzahl + Makro-Bars (gleiche Farben wie Widget)
- Timeline: Vertikale Liste mit Uhrzeit links, Mahlzeit Mitte, Delete rechts
- Sticky Footer: Primary "Mahlzeit hinzufügen" + Ghost "Analyse" Button

---

## Änderungen an bestehenden Dateien

### 3. `src/components/home/widgets/NutritionWidget.tsx`

**Aktuell:** `onClick={() => navigate('/plus')}`

**Neu:** 
```typescript
interface NutritionWidgetProps {
  size: WidgetSize;
  onOpenDaySheet?: () => void; // NEU
}

// Im onClick:
onClick={() => onOpenDaySheet?.()}
```

### 4. `src/components/home/MetricWidgetGrid.tsx`

Muss `onOpenDaySheet` an NutritionWidget durchreichen:

```typescript
<NutritionWidget 
  size={config.size} 
  onOpenDaySheet={() => setNutritionSheetOpen(true)} 
/>
```

### 5. `src/pages/AresHome.tsx`

State für das Sheet hinzufügen:

```typescript
const [nutritionSheetOpen, setNutritionSheetOpen] = useState(false);

// Im JSX:
<NutritionDaySheet 
  isOpen={nutritionSheetOpen}
  onClose={() => setNutritionSheetOpen(false)}
  onAddMeal={() => {
    setNutritionSheetOpen(false);
    setMealOpen(true);
  }}
/>
```

---

## Timeline-Item Design

Jedes Mahlzeit-Item in der Timeline:

```typescript
<motion.div 
  layout
  className="flex items-center gap-3 py-3 border-b border-border/30"
>
  {/* Zeit */}
  <span className="text-xs text-muted-foreground w-12">
    {format(new Date(meal.ts), 'HH:mm')}
  </span>
  
  {/* Content */}
  <div className="flex-1 min-w-0">
    <p className="font-medium text-sm truncate">
      {meal.text || meal.title}
    </p>
    <p className="text-xs text-muted-foreground">
      {meal.calories} kcal • P{meal.protein}g
    </p>
  </div>
  
  {/* Delete */}
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={() => deleteMeal(meal.id)}
    className="p-2 text-muted-foreground hover:text-destructive"
  >
    <Trash2 className="w-4 h-4" />
  </motion.button>
</motion.div>
```

---

## Datenbankschema (meals-Tabelle)

| Column | Type | Usage |
|--------|------|-------|
| `id` | uuid | Primary Key |
| `text` | text | Mahlzeit-Beschreibung (Hauptfeld) |
| `title` | text | Alternative Beschreibung |
| `calories` | numeric | Kalorien |
| `protein` | numeric | Protein in g |
| `carbs` | numeric | Kohlenhydrate in g |
| `fats` | numeric | Fett in g |
| `ts` | timestamp | Zeitstempel (für Timeline-Sortierung) |
| `meal_type` | text | breakfast/lunch/dinner/snack/other |
| `date` | date | Datum (für Tages-Filter) |

---

## Zusammenfassung der Änderungen

| Datei | Aktion |
|-------|--------|
| `src/hooks/useTodaysMeals.ts` | NEU - Hook für heutige Mahlzeiten |
| `src/components/home/sheets/NutritionDaySheet.tsx` | NEU - Das Day Sheet |
| `src/components/home/widgets/NutritionWidget.tsx` | ÄNDERN - onClick prop |
| `src/components/home/MetricWidgetGrid.tsx` | ÄNDERN - Sheet-State durchreichen |
| `src/pages/AresHome.tsx` | ÄNDERN - Sheet-State + Komponente einbinden |

---

## User Flow

1. User sieht **NutritionWidget** auf dem Homescreen (1,193 kcal)
2. **Klick** auf Widget
3. **Sheet fährt hoch** (Spring-Animation, 85% Höhe)
4. User sieht **Makro-Übersicht** + **Timeline der Mahlzeiten**
5. Optional: **Löschen** einer Mahlzeit (optimistisch)
6. **"Mahlzeit hinzufügen"** öffnet existierendes Meal-Input-Sheet
7. **Swipe down** oder X-Button schließt das Sheet
8. User ist wieder im **Homescreen** (kein Page-Reload)

---

## Technische Details

### Animation (wie QuickLogSheet)
```typescript
const springConfig = { type: "spring", stiffness: 400, damping: 30 };

<motion.div
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={springConfig}
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }}
/>
```

### Makro-Bars (wie Widget)
```typescript
const gradients = {
  purple: 'from-purple-600 to-violet-400', // Kalorien
  emerald: 'from-emerald-600 to-teal-400', // Protein
  blue: 'from-blue-600 to-cyan-400',       // Carbs
  amber: 'from-amber-600 to-yellow-400'    // Fett
};
```

### Empty State
```typescript
{meals.length === 0 && (
  <div className="text-center py-12">
    <Utensils className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
    <p className="text-muted-foreground">Noch keine Mahlzeiten heute</p>
    <p className="text-xs text-muted-foreground/60 mt-1">
      Tippe auf "Mahlzeit hinzufügen" um zu starten
    </p>
  </div>
)}
```

---

## Erwartetes Ergebnis

- **Dashboard bleibt sauber**: Widget zeigt nur Aggregat-Daten
- **Schneller Kontext-Check**: Sheet öffnet instant (keine Page-Navigation)
- **Progressive Disclosure**: Details nur wer sie braucht
- **Apple-Health-Feeling**: Smooth Transitions, Drag-to-dismiss, Premium UI
