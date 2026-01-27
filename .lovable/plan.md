
# Fix: Protein Anchor Makros werden nicht korrekt gespeichert

## Problem-Zusammenfassung

Die WARRIOR-Strategie zeigt in der Kachel **202g/120g/77g**, aber:
1. Die "Tägliche Makros" Card zeigt **248g/99g/66g** (falsch)
2. Die Datenbank speichert die falschen Werte (248g statt 202g)
3. Das NutritionWidget auf dem Homescreen zeigt die falschen Ziele

**Root Cause:** Die Funktion `calculateMacroGrams()` (Zeile 378-385) nutzt noch die alte Prozent-Logik statt das Protein Anchor System.

---

## Lösungsplan

### Schritt 1: `calculateMacroGrams()` durch `currentMacros` ersetzen

**Datei:** `src/pages/Profile.tsx`

**Zeile 378-385 - ERSETZEN:**

```typescript
// ALT (Prozent-basiert):
const calculateMacroGrams = () => {
  const targetCalories = calculateTargetCalories();
  return {
    protein: Math.round((targetCalories * dailyGoals.protein / 100) / 4),
    carbs: Math.round((targetCalories * dailyGoals.carbs / 100) / 4),
    fats: Math.round((targetCalories * dailyGoals.fats / 100) / 9),
  };
};

// NEU (Protein Anchor System):
const calculateMacroGrams = () => {
  // Nutze das bereits berechnete Protein Anchor System
  return {
    protein: currentMacros.proteinGrams,
    carbs: currentMacros.carbGrams,
    fats: currentMacros.fatGrams,
  };
};
```

Das sorgt dafür, dass:
- Die "Tägliche Makros" Card die korrekten Werte zeigt
- `performSave()` die korrekten Werte in die DB schreibt
- Das NutritionWidget die korrekten Ziele bekommt

### Schritt 2: NutritionWidget um Strategie-Anzeige erweitern

**Datei:** `src/components/home/widgets/NutritionWidget.tsx`

Füge einen kompakten Strategie-Badge hinzu (z.B. "⚔️ 2.0g/kg"):

**Import hinzufügen:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
```

**Neuen Query für Strategie hinzufügen:**
```typescript
const { data: profile } = useQuery({
  queryKey: ['user-profile-strategy'],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('macro_strategy, weight')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    return data;
  },
  staleTime: 1000 * 60 * 5,
});

// Strategie-Info ableiten
const getStrategyBadge = () => {
  const strategy = profile?.macro_strategy;
  if (strategy === 'elite') return { emoji: '🏆', label: '2.5g/kg' };
  if (strategy === 'rookie') return { emoji: '🌱', label: '1.2g/kg' };
  return { emoji: '⚔️', label: '2.0g/kg' }; // Default: Warrior
};
const strategyBadge = getStrategyBadge();
```

**UI-Änderung im WIDE/LARGE Layout (Zeile 177-188):**

```tsx
<div className="flex justify-between items-center mb-3">
  <div className="flex items-center gap-2">
    <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
      <Utensils className="w-5 h-5" />
    </div>
    <div className="flex flex-col">
      <span className="font-semibold text-foreground">Ernährung</span>
      {/* NEU: Strategie-Badge */}
      <span className="text-[10px] text-amber-500 font-medium">
        {strategyBadge.emoji} {strategyBadge.label} Protein
      </span>
    </div>
  </div>
  <div className="text-right">
    <span className="text-lg font-bold text-foreground">{Math.round(calories)}</span>
    <span className="text-sm text-muted-foreground">/{calorieGoal} kcal</span>
  </div>
</div>
```

---

## Datei-Übersicht

| Datei | Zeilen | Änderung |
|-------|--------|----------|
| `src/pages/Profile.tsx` | 378-385 | `calculateMacroGrams()` auf `currentMacros` umstellen |
| `src/components/home/widgets/NutritionWidget.tsx` | ~55-60, 177-188 | Strategie-Query + Badge-Anzeige |

---

## Erwartetes Ergebnis

### Vorher
- Kachel: 202g/120g/77g (korrekt)
- "Tägliche Makros" Card: 248g/99g/66g (falsch)
- DB: protein=248 (falsch)
- NutritionWidget: 122/248g (falsch)

### Nachher
- Kachel: 202g/120g/77g (korrekt)
- "Tägliche Makros" Card: 202g/120g/77g (korrekt)
- DB: protein=202 (korrekt)
- NutritionWidget: 122/202g + "⚔️ 2.0g/kg Protein" Badge

### Visuelle Änderung am Widget

```text
┌─────────────────────────────────────────┐
│  🍽  Ernährung           1335/1984 kcal │
│      ⚔️ 2.0g/kg Protein                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Protein  ████████████░░░░░░  122/202g  │
│  Carbs    ██████████░░░░░░░░   74/120g  │
│  Fett     ██████████████████   65/77g   │
└─────────────────────────────────────────┘
```
