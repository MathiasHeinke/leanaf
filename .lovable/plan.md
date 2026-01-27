
# Ernaehrung Widget Flat-Variante mit Makros

## Uebersicht

Die flache Variante des Ernaehrung-Widgets soll zusaetzlich zu den Kalorien auch die 3 Makros (Protein, Carbs, Fett) anzeigen - kompakt und platzsparend.

## Design-Konzept

Da wir nur begrenzt Platz haben, nutzen wir **Mini-Fortschrittsbalken** mit farbigen Punkten statt Text-Labels:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [🍴]  Ernaehrung    P ███░░  C ██░░░  F ████░   850/2200 kcal       │
│ ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
└──────────────────────────────────────────────────────────────────────┘
```

**Elemente (von links nach rechts):**
1. Icon (Utensils)
2. Label "Ernaehrung"
3. **3 Mini-Makro-Bars** mit Buchstaben-Prefix (P/C/F)
4. Kalorien-Counter

---

## Technische Umsetzung

### Datei: `src/components/home/widgets/NutritionWidget.tsx`

**Aenderung im `if (size === 'flat')` Block (Zeile 72-109):**

Die flache Variante wird erweitert um eine kompakte Makro-Anzeige zwischen Label und Kalorien-Counter:

```typescript
// FLAT: Horizontaler kompakter Streifen mit Kalorien + Makros
if (size === 'flat') {
  // Helper fuer Makro-Prozent
  const proteinPercent = Math.min((protein / proteinGoal) * 100, 100);
  const carbsPercent = Math.min((carbs / carbGoal) * 100, 100);
  const fatsPercent = Math.min((fats / fatGoal) * 100, 100);
  
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => onOpenDaySheet?.()}
      className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden"
    >
      {/* Background Fill */}
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${caloriePercent}%` }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className={cn(
          "absolute inset-0",
          isOver 
            ? "bg-gradient-to-r from-destructive/20 to-destructive/10" 
            : "bg-gradient-to-r from-purple-600/20 to-violet-400/10"
        )}
      />
      
      {/* Icon */}
      <div className="relative z-10 p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
        <Utensils className="w-5 h-5" />
      </div>
      
      {/* Label */}
      <span className="relative z-10 text-sm font-medium text-foreground shrink-0">Ernaehrung</span>
      
      {/* Mini Makro Bars */}
      <div className="relative z-10 flex items-center gap-2 flex-1 justify-center">
        {/* Protein */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">P</span>
          <div className="w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${proteinPercent}%` }}
              className={cn(
                "h-full rounded-full",
                protein > proteinGoal ? "bg-destructive" : "bg-emerald-500"
              )}
            />
          </div>
        </div>
        
        {/* Carbs */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">C</span>
          <div className="w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${carbsPercent}%` }}
              className={cn(
                "h-full rounded-full",
                carbs > carbGoal ? "bg-destructive" : "bg-blue-500"
              )}
            />
          </div>
        </div>
        
        {/* Fats */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">F</span>
          <div className="w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${fatsPercent}%` }}
              className={cn(
                "h-full rounded-full",
                fats > fatGoal ? "bg-destructive" : "bg-amber-500"
              )}
            />
          </div>
        </div>
      </div>
      
      {/* Kalorien Counter */}
      <span className={cn(
        "relative z-10 text-sm font-bold shrink-0",
        isOver ? "text-destructive" : "text-purple-600 dark:text-violet-400"
      )}>
        {Math.round(calories)} / {calorieGoal} kcal
      </span>
    </motion.div>
  );
}
```

---

## Visuelles Ergebnis

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [🍴]  Ernaehrung     P ███░░  C ██░░░  F ████░      850 / 2200 kcal   │
│ ████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
└─────────────────────────────────────────────────────────────────────────┘

Legende:
- P = Protein (gruen/emerald)
- C = Carbs (blau)  
- F = Fett (orange/amber)
- Hintergrund-Fill = Kalorien-Fortschritt (lila)
```

**Bei Ueberschreitung eines Makros:** Der entsprechende Mini-Balken wird rot (`bg-destructive`).

---

## Datei die geaendert wird

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/widgets/NutritionWidget.tsx` | Flat-Variante mit Mini-Makro-Bars erweitern |
