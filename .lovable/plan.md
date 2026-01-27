

# Weight Widget: Sparklines mit Linien statt Balken

## Uebersicht

Die Sparklines im Weight Widget werden von vertikalen Balken auf eine elegante **SVG-Linie** umgestellt. Dies gibt einen klareren Trend-Ueberblick und sieht professioneller aus.

## Betroffene Bereiche

Das Widget hat aktuell Sparklines an 2 Stellen:
1. **Flat-Variante** (Zeile 88-102): Mini-Sparkline in der Mitte
2. **Large/Wide-Variante** (Zeile 157-171): Groessere Sparkline unter dem Header

## Design-Konzept

### Vorher (Balken):
```text
▁ ▃ ▅ ▆ ▄ ▅ ▇
```

### Nachher (Linie):
```text
    ╱╲    ╱╲
  ╱    ╲╱    ╲
╱              ╲
```

## Technische Umsetzung

### SVG Polyline Ansatz

Wir nutzen ein `<svg>` Element mit einer `<polyline>` fuer die Linie und optional einem `<linearGradient>` fuer den Bereich unter der Linie:

```typescript
// Beispiel fuer die Flat-Variante
{history.length > 1 && (
  <div className="flex-1 h-4">
    <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
      {/* Gradient-Fill unter der Linie */}
      <defs>
        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Bereich unter der Linie (optional) */}
      <polygon 
        points={`0,20 ${points} 100,20`} 
        fill="url(#weightGradient)" 
      />
      
      {/* Die eigentliche Linie */}
      <polyline
        points={points}
        fill="none"
        stroke="rgb(139, 92, 246)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
)}
```

### Punkte-Berechnung

```typescript
// Points-String fuer SVG generieren
const generatePoints = (data: number[], width: number, height: number) => {
  if (data.length < 2) return '';
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2; // 2px padding
    return `${x},${y}`;
  }).join(' ');
};

// Verwendung
const points = generatePoints(history, 100, 20);
```

## Aenderungen

### Datei: `src/components/home/widgets/WeightWidget.tsx`

| Bereich | Zeilen | Aenderung |
|---------|--------|-----------|
| Helper-Funktion | Vor Zeile 66 | `generatePoints()` Funktion hinzufuegen |
| Flat-Sparkline | 88-102 | Balken durch SVG-Linie ersetzen |
| Large-Sparkline | 157-171 | Balken durch SVG-Linie ersetzen |

### Flat-Variante (kompakt)
- SVG mit `viewBox="0 0 100 16"` 
- Nur Linie, kein Gradient-Fill (platzsparend)
- Stroke-Width: 1.5px
- Farbe: violet-500

### Large/Wide-Variante (mehr Platz)
- SVG mit `viewBox="0 0 100 40"`
- Linie + Gradient-Fill darunter
- Stroke-Width: 2px
- Animierter Eingang mit `motion` (stroke-dasharray Trick)

## Visuelles Ergebnis

### Flat:
```text
┌────────────────────────────────────────────────────────────────────────┐
│ [⚖️]  Gewicht     ╭─╮  ╭──╮        ↓0.5              82.3 kg          │
│                  ╱   ╲╱    ╲─────╱                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Large/Wide:
```text
┌──────────────────────────────────────────────────┐
│ [⚖️] Gewicht                            ↓0.5 kg │
│      Letzte 7 Eintraege                          │
│                                                  │
│      ╭───╮                                       │
│     ╱     ╲    ╭──╮                              │
│    ╱       ╲  ╱    ╲                             │
│   ╱         ╲╱      ╲────                        │
│  ░░░░░░░░░░░░░░░░░░░░░░░░ (Gradient Fill)       │
│                                                  │
│  82.3 kg                                         │
│  Aktuell                                         │
└──────────────────────────────────────────────────┘
```

## Zusammenfassung

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/widgets/WeightWidget.tsx` | Sparklines von Balken auf SVG-Linien umstellen |

