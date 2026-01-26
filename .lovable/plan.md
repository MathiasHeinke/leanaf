

# Layer 2 Sheets: HydrationDaySheet & BodyTrendSheet

## Übersicht

Wir implementieren zwei neue Premium-Detail-Sheets nach dem bewährten "Three-Layer-Design" Pattern, das in NutritionDaySheet etabliert wurde. Beide Sheets folgen der identischen Flex-Column-Architektur für konsistentes Scroll-Verhalten.

---

## Architektur-Blueprint (kopiert von NutritionDaySheet)

```text
┌────────────────────────────────────────┐
│ motion.div [drag="y"]                  │
│ className="flex flex-col max-h-[85vh]" │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ZONE A: Handle + Header            │ │  flex-none
│ │ (Drag Handle, Title, Date, Close)  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ZONE B: Scrollable Content         │ │  flex-1 overflow-y-auto
│ │  ├── Hero Section (Visual/Numbers) │ │
│ │  ├── Timeline/Chart                │ │
│ │  └── History List                  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ZONE C: Sticky Footer (Actions)    │ │  flex-none, gradient-fade
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## Teil A: HydrationDaySheet

### Datenquellen (bereits vorhanden)

| Hook | Zweck |
|------|-------|
| `useDailyMetrics()` | `water.current` / `water.target` |
| `useTodaysFluids()` | Timeline-Daten mit `timestamp` |
| `useAresEvents()` | `logWater(amount)` für Quick-Add |

### Komponenten-Struktur

```typescript
interface HydrationDaySheetProps {
  isOpen: boolean;
  onClose: () => void;
}
```

### Hero Section

- **Progress Ring/Bar**: Animierter Fortschrittsbalken (Cyan-Gradient)
- **Zahlen**: `1.8L / 3.0L` prominent
- **Status-Text**: "Noch 1.2L bis zum Ziel" oder "Ziel erreicht!"

### Timeline Section (Scrollbar)

Die `useTodaysFluids()` Hook liefert bereits Einträge mit `timestamp` Feld.

- **Format**: `09:15 ─ 💧 ─ 500ml`
- Sortiert nach Zeit (neueste oben)
- Empty State: "Noch kein Wasser getrackt heute"

### Footer (Sticky)

Zwei Action-Buttons nebeneinander:

- **+250ml** (Outline, Cyan Border)
- **+500ml** (Solid, Cyan Background)

**Gemini-Vorschlag integriert**: Multi-Tap UX - Buttons schliessen Sheet NICHT automatisch. Nach Klick wird Toast gezeigt und Cache optimistisch aktualisiert.

### Farben

| Element | Farbe |
|---------|-------|
| Primary | `cyan-500/600` |
| Icon | `Droplets` (lucide-react) |
| Gradient | `from-cyan-500 to-teal-400` |

---

## Teil B: BodyTrendSheet

### Datenquellen

| Quelle | Zweck |
|--------|-------|
| `useDailyMetrics()` | `weight.latest`, `weight.date` |
| Neuer `useQuery` | 30-Tage `weight_history` für Chart |
| Supabase Direct | Delete für fehlerhafte Einträge |

### Komponenten-Struktur

```typescript
interface BodyTrendSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickLog: () => void; // Öffnet QuickLogSheet tab='weight'
}
```

### Hero Section

- **Aktuelles Gewicht**: `85.2 kg` (groß, 5xl)
- **Trend-Indikator**: Berechnet Delta zu Woche vorher
  - Grün + TrendingDown bei Abnahme
  - Orange + TrendingUp bei Zunahme
  - Neutral bei Stabilität (±0.3kg)

### Chart Section (Premium-Feature)

Recharts `AreaChart` mit 30-Tage-Verlauf:

```typescript
<ResponsiveContainer width="100%" height={180}>
  <AreaChart data={chartData}>
    <defs>
      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
      </linearGradient>
    </defs>
    <Tooltip content={<CustomTooltip />} />
    <Area 
      type="monotone" 
      dataKey="weight" 
      stroke="#8b5cf6" 
      strokeWidth={2}
      fill="url(#weightGradient)"
    />
  </AreaChart>
</ResponsiveContainer>
```

**Gemini-Vorschlag integriert**: Minimalistischer Look ohne Grid-Lines und Achsen-Labels. Tooltip on hover zeigt Datum + Gewicht.

### History List (Scrollbar)

- Letzte 7 Einträge reverse chronologisch
- **Format**: `26.01.2026 (links) | 85.2 kg | Trash-Icon`
- Trash-Icon mit Lösch-Logik und Query-Invalidierung

### Footer (Sticky)

Ein primärer Button:

- **"Gewicht eintragen"** → Ruft `onOpenQuickLog()` auf

### Farben

| Element | Farbe |
|---------|-------|
| Primary | `violet-500/600` |
| Icon | `Scale` (lucide-react) |
| Chart | `#8b5cf6` (violet-500) |

---

## Teil C: Integration

### 1. AresHome.tsx - State-Erweiterung

```typescript
// Zeile ~50, nach nutritionSheetOpen:
const [hydrationSheetOpen, setHydrationSheetOpen] = useState(false);
const [bodySheetOpen, setBodySheetOpen] = useState(false);
```

### 2. MetricWidgetGrid.tsx - Props erweitern

```typescript
interface MetricWidgetGridProps {
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;  // NEU
  onOpenBodySheet?: () => void;       // NEU
}
```

### 3. WidgetRenderer.tsx - Props durchreichen

```typescript
interface WidgetRendererProps {
  config: WidgetConfig;
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;  // NEU
  onOpenBodySheet?: () => void;       // NEU
}

// In switch:
case 'hydration':
  return <HydrationWidget size={size} onOpenDaySheet={onOpenHydrationSheet} />;
case 'weight':
  return <WeightWidget size={size} onOpenDaySheet={onOpenBodySheet} />;
```

### 4. Widget-Updates

**HydrationWidget.tsx**:
- Neue Prop: `onOpenDaySheet?: () => void`
- Ersetze `onClick={() => navigate('/hydration')}` mit `onClick={() => onOpenDaySheet?.()}`

**WeightWidget.tsx**:
- Neue Prop: `onOpenDaySheet?: () => void`
- Ersetze `onClick={() => navigate('/weight')}` mit `onClick={() => onOpenDaySheet?.()}`

### 5. Sheet-Rendering in AresHome

```typescript
// Nach NutritionDaySheet (Zeile ~633):

{/* Hydration Day Sheet - Layer 2 */}
<HydrationDaySheet 
  isOpen={hydrationSheetOpen}
  onClose={() => setHydrationSheetOpen(false)}
/>

{/* Body Trend Sheet - Layer 2 */}
<BodyTrendSheet 
  isOpen={bodySheetOpen}
  onClose={() => setBodySheetOpen(false)}
  onOpenQuickLog={() => {
    setBodySheetOpen(false);
    setQuickLogConfig({ open: true, tab: 'weight' });
  }}
/>
```

---

## Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/components/home/sheets/HydrationDaySheet.tsx` | Hydration Detail Sheet mit Timeline |
| `src/components/home/sheets/BodyTrendSheet.tsx` | Weight Trend Sheet mit Recharts |

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/AresHome.tsx` | State + Sheet-Rendering |
| `src/components/home/MetricWidgetGrid.tsx` | Neue Props |
| `src/components/home/widgets/WidgetRenderer.tsx` | Props durchreichen |
| `src/components/home/widgets/HydrationWidget.tsx` | `onOpenDaySheet` prop |
| `src/components/home/widgets/WeightWidget.tsx` | `onOpenDaySheet` prop |

---

## Konsistenz mit NutritionDaySheet

Alle drei Sheets teilen:

| Element | Wert |
|---------|------|
| Spring Config | `{ stiffness: 400, damping: 30 }` |
| Max Height | `max-h-[85vh]` |
| Handle Bar | `w-10 h-1 bg-muted-foreground/30 rounded-full` |
| Header Padding | `px-5 pb-4` |
| Content | `flex-1 overflow-y-auto px-5 pb-4` |
| Backdrop | `bg-black/40 backdrop-blur-sm` |
| Z-Index | Backdrop: `z-[70]`, Sheet: `z-[71]` |
| Swipe-to-Close | `offset.y > 100 || velocity.y > 500` |

---

## Gemini-Vorschläge integriert

1. **Multi-Tap UX** (Hydration): +250ml/+500ml schliessen Sheet nicht
2. **Minimalistischer Chart** (Body): Keine Grid-Lines, smooth curve
3. **Gradient Fill** (Body): `opacity: 0.3 → 0` für Premium-Look
4. **Konsistente Spring Physics**: Identisch zu NutritionDaySheet
5. **`flex-1 overflow-y-auto`**: Robuste Scroll-Architektur

---

## Erwartetes Ergebnis

| Feature | Vorher | Nachher |
|---------|--------|---------|
| Hydration Widget Klick | Navigiert zu `/hydration` | Öffnet HydrationDaySheet |
| Weight Widget Klick | Navigiert zu `/weight` | Öffnet BodyTrendSheet |
| Hydration-Einblick | Nur Gesamtzahl | Timeline wann getrunken |
| Gewicht-Einblick | Einzelne Zahl | 30-Tage-Trend-Chart |
| Scroll-Feeling | Unterschiedlich | Identisch mit NutritionDaySheet |

