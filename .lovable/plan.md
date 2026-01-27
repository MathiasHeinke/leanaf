
# Fix: Wasserziel wird nicht korrekt geladen/gespeichert

## Problem-Analyse

Der User hat das Wasserziel auf 4L gesetzt, aber das Dashboard zeigt weiterhin 2.5L. Die Ursachen:

### 1. Profile.tsx - Falsches Laden der Goals

```typescript
// PROBLEM: Zeile 269-273
const { data } = await supabase
  .from('daily_goals')
  .select('*')
  .eq('user_id', user?.id)
  .maybeSingle();  // ← Holt IRGENDEINEN Eintrag, nicht den aktuellsten!
```

Da mehrere `daily_goals`-Eintraege existieren (einer pro Tag), wird ein zufaelliger geladen - oft mit dem alten 2500ml-Wert.

### 2. Profile.tsx - Ueberschreiben beim Speichern

Wenn der User das Profil speichert (`handleSave`), wird der beim Laden gesetzte `fluidGoalMl` State (oft 2500) in die Datenbank geschrieben und ueberschreibt den 4L-Wert:

```typescript
// Zeile 578
fluid_goal_ml: fluidGoalMl,  // ← Nimmt den alten/falschen State-Wert!
```

### 3. useDailyMetrics.ts - Gleicher Fehler

```typescript
// Zeile 67-73: Holt Goals ohne Datum-Filter
supabase
  .from('daily_goals')
  .select('calories, protein, carbs, fats, fluid_goal_ml')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

Das ist besser (nach `updated_at` sortiert), aber wenn das Profil mit dem falschen Wert gespeichert wird, ist der neueste Eintrag trotzdem falsch.

---

## Loesung

### Schritt 1: Profile.tsx - Korrektes Laden des aktuellsten Goals

**Alt (falsch):**
```typescript
const { data } = await supabase
  .from('daily_goals')
  .select('*')
  .eq('user_id', user?.id)
  .maybeSingle();
```

**Neu (korrekt):**
```typescript
const { data } = await supabase
  .from('daily_goals')
  .select('*')
  .eq('user_id', user?.id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

### Schritt 2: Profile.tsx - Wasserziel separat laden (falls geaendert)

Um Race Conditions zu vermeiden, sollte das Wasserziel **direkt vor dem UI-Sync** nochmal geladen werden:

```typescript
// In useEffect beim Mount: Lade aktuellsten fluid_goal_ml
useEffect(() => {
  if (!user) return;
  
  const loadLatestFluidGoal = async () => {
    const { data } = await supabase
      .from('daily_goals')
      .select('fluid_goal_ml')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data?.fluid_goal_ml) {
      setFluidGoalMl(data.fluid_goal_ml);
    }
  };
  
  loadLatestFluidGoal();
}, [user]);
```

### Schritt 3: Settings.tsx - Gleicher Fix noetig

In `loadFluidGoal` fehlt ebenfalls die Sortierung:

**Alt:**
```typescript
const { data } = await supabase
  .from('daily_goals')
  .select('fluid_goal_ml')
  .eq('user_id', user.id)
  .maybeSingle();
```

**Neu:**
```typescript
const { data } = await supabase
  .from('daily_goals')
  .select('fluid_goal_ml')
  .eq('user_id', user.id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## Zusammenfassung der Aenderungen

| Datei | Problem | Fix |
|-------|---------|-----|
| `src/pages/Profile.tsx` | `loadDailyGoals()` holt zufaelligen Eintrag | `.order('updated_at', { ascending: false }).limit(1)` |
| `src/pages/Profile.tsx` | Neuer useEffect | Laedt aktuellsten `fluid_goal_ml` separat |
| `src/components/Settings.tsx` | `loadFluidGoal()` holt zufaelligen Eintrag | `.order('updated_at', { ascending: false }).limit(1)` |

---

## Erwartetes Ergebnis

1. User setzt Wasserziel auf 4L im HydrationDaySheet → Speichert korrekt
2. User oeffnet Profile → Zeigt 4L (nicht 2.5L)
3. User speichert Profile → Behaelt 4L (ueberschreibt nicht)
4. Dashboard zeigt 4L als Ziel
