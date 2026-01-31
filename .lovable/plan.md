
# Fix: Makro-Stacking Reihenfolge

## Problem

Die Reihenfolge im Stacked Area Chart ist aktuell:
- **Unten (zuerst)**: Protein (blau)
- **Mitte**: Kohlenhydrate (gelb/orange)
- **Oben (zuletzt)**: Fette (grun)

Der Nutzer mochte:
- **Unten**: Fette
- **Mitte**: Carbs
- **Oben**: Protein

---

## Losung

In Recharts wird die Stacking-Reihenfolge durch die **Reihenfolge der Area-Komponenten** bestimmt. Die erste Area liegt unten, die letzte oben.

Aktuelle Reihenfolge (Zeilen 184-207):
```
1. Protein    → unten
2. Kohlenhydrate → mitte  
3. Fette      → oben
```

Neue Reihenfolge:
```
1. Fette      → unten
2. Kohlenhydrate → mitte
3. Protein    → oben
```

---

## Anderung

| Datei | Anderung |
|-------|----------|
| `src/components/analytics/MacroStackedChart.tsx` | Area-Komponenten Reihenfolge andern (Zeilen 184-207) |

Die Areas mussen einfach umgestellt werden:
```tsx
<Area dataKey="Fette" ... />      {/* NEU: zuerst = unten */}
<Area dataKey="Kohlenhydrate" ... />
<Area dataKey="Protein" ... />    {/* NEU: zuletzt = oben */}
```

Zusatzlich muss der CustomTooltip angepasst werden, damit die Reihenfolge dort auch stimmt (payload[0] ist dann Fette, nicht Protein).

---

## Geschatzter Aufwand

2 Minuten - Reihenfolge der Area-Komponenten andern + Tooltip-Indices anpassen.
