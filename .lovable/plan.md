
# Fix: Subtilerer Overlap-Rahmen

## Änderung

Der rote Rahmen bei Overlap-Warnings ist zu auffällig. Stattdessen:
- Rahmen bleibt neutral (`border-border/30`)
- Nur die Badges innen zeigen die Warnung

## Technische Anpassung

**Datei:** `src/components/supplements/SupplementGroupRow.tsx`

| Vorher | Nachher |
|--------|---------|
| `hasOverlapWarning ? "border-destructive/30"` | Rahmen immer neutral |
| Rote Border um gesamte Karte | Nur rote Badge-Chips im Content |

## Code-Änderung

```typescript
// Vorher (Line 95-98)
<div className={cn(
  "rounded-xl border overflow-hidden transition-all bg-card/50",
  hasOverlapWarning ? "border-destructive/30" : "border-border/30"
)}>

// Nachher - immer neutral
<div className="rounded-xl border border-border/30 overflow-hidden transition-all bg-card/50">
```

## Bestätigung: Logik ist global

Die Redundanz-Erkennung funktioniert für **alle** Kombi-Produkte:
- Multivitamine
- Pre-Workouts (falls ingredient_ids hinterlegt)
- Schlaf-Formeln
- Jedes Produkt mit `ingredient_ids`

Die Logik ist in `calculateComboScore()` implementiert und wird automatisch für jedes Produkt mit Inhaltsstoffen angewandt.

## Betroffene Datei

| Datei | Änderung |
|-------|----------|
| `src/components/supplements/SupplementGroupRow.tsx` | Destructive border entfernen |
