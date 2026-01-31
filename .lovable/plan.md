
# Entfernung von Kalorien/Makros Charts aus /analyse/more

## Ubersicht

Die Charts "Kalorien Verlauf" und "Makros" mussen aus dem "More" Tab entfernt werden. Nur "Gewicht & Body Composition" und "Korpermasze Verlauf" sollen bestehen bleiben.

---

## Aktuelle Situation

Im `Analysis.tsx` wird der "More" Tab so aufgerufen:

```typescript
<HistoryCharts 
  data={[]} // Empty nutrition data for more tab
  weightHistory={weightHistory}
  bodyMeasurementsHistory={bodyMeasurementsHistory}
  timeRange="month"
  loading={loading}
/>
```

**Problem:** Der `showNutritionCharts` Parameter wird nicht gesetzt und hat den Default-Wert `true`. Dadurch werden die Kalorien- und Makros-Charts trotzdem gerendert (wenn auch leer).

---

## Losung

Eine einfache Anderung in `src/pages/Analysis.tsx`:

```typescript
// Zeile 303-309 im "More" Tab
<HistoryCharts 
  data={[]}
  weightHistory={weightHistory}
  bodyMeasurementsHistory={bodyMeasurementsHistory}
  timeRange="month"
  loading={loading}
  showNutritionCharts={false}  // ← HINZUFUGEN
/>
```

---

## Technische Details

| Datei | Anderung |
|-------|----------|
| `src/pages/Analysis.tsx` | Zeile ~303: `showNutritionCharts={false}` hinzufugen |

---

## Ergebnis

Der "More" Tab zeigt nur noch:
- **Gewicht und Body Composition** (ComposedChart mit Weight/BodyFat/Muscle)
- **Korpermasze Verlauf** (LineChart mit Hals/Brust/Taille/etc.)

"Kalorien Verlauf" und "Makros" werden nicht mehr angezeigt.

---

## Geschatzter Aufwand

1 Minute - eine Zeile andern.
