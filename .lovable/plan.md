
# Analyse-Seite Redesign: Supplements Analytics + Makro-Visualisierung

## Übersicht

Das alte `SupplementComplianceWidget` mit der Lucy-Analyse wird komplett ersetzt durch ein modernes Analytics-Widget mit Heatmap und Ranking. Die Makro-Darstellung bekommt ein Stacked-Area-Chart Upgrade.

---

## Aktuelle Struktur (wird ersetzt)

```text
/analyse → Intake Tab
├── Overview
├── HydrationWidget  
├── SupplementComplianceWidget ← ERSETZEN
│   ├── Heute eingenommen (Progress)
│   ├── Supplement-Liste  
│   └── Lucy's Supplement-Analyse ← WEG!
└── HistoryCharts
    ├── Kalorien Verlauf (Area)
    └── Makros (Bar Chart) ← UPGRADE
```

---

## Neue Struktur

```text
/analyse → Intake Tab
├── Overview
├── HydrationWidget (unverändert)
├── SupplementAnalyticsWidget ← NEU
│   ├── Header mit Period-Toggle [7T][30T]
│   ├── Compliance Heatmap (Calendar-Grid)
│   ├── Top 5 Supplements Ranking
│   └── Insights-Stats
└── HistoryCharts
    ├── Kalorien Verlauf (unverändert)
    └── MacroStackedChart ← NEU
```

---

## 1. Neues SupplementAnalyticsWidget

### A) Compliance Heatmap

GitHub-Style Calendar-Grid das Einnahme-Konsistenz visualisiert:

```text
┌────────────────────────────────────────────┐
│ 💊 Supplement Analytics    [7 Tage][30 Tage]│
├────────────────────────────────────────────┤
│                                            │
│  Compliance Heatmap                        │
│  ┌──┬──┬──┬──┬──┬──┬──┐                   │
│  │Mo│Di│Mi│Do│Fr│Sa│So│  KW 4            │
│  │██│██│▓▓│██│░░│██│██│                   │
│  └──┴──┴──┴──┴──┴──┴──┘                   │
│                                            │
│  ██ 100%  ▓▓ 50-99%  ░░ <50%  □ Keine     │
└────────────────────────────────────────────┘
```

- Farbintensität = Compliance-Rate des Tages
- Hover-Tooltip: "Mo 27.01: 5/6 (83%)"
- Responsive: Bei 7 Tagen 1 Zeile, bei 30 Tagen 4-5 Zeilen

### B) Top Supplements Ranking

Horizontale Fortschrittsbalken sortiert nach Einnahme-Häufigkeit:

```text
┌────────────────────────────────────────────┐
│ Regelmäßigkeit                             │
├────────────────────────────────────────────┤
│ Vitamin D3   ████████████████  100% (7/7)  │
│ Omega-3      ██████████████░░   85% (6/7)  │
│ Magnesium    ████████████░░░░   71% (5/7)  │
│ Zink         ██████████░░░░░░   57% (4/7)  │
│ Ashwagandha  ████████░░░░░░░░   43% (3/7)  │
└────────────────────────────────────────────┘
```

- Farbkodierung: Grün >80%, Gelb 50-80%, Rot <50%
- Max 5 Supplements anzeigen

### C) Insights-Stats

```text
┌─────────────┬─────────────┬─────────────┐
│ Ø Compliance│ Beste Serie │ Konsistent  │
│    78%      │   5 Tage    │ Vitamin D3  │
└─────────────┴─────────────┴─────────────┘
```

---

## 2. MacroStackedChart (ersetzt Bar Chart)

Stacked Area Chart mit Summary-Cards:

```text
┌────────────────────────────────────────────┐
│ Makro-Verteilung                           │
├────────────────────────────────────────────┤
│                                            │
│     ████████████████████████████           │ 
│     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │ Protein
│     ░░░░░░░░░░░░░░░░░░░░░░░░░░░           │ Carbs
│     ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒           │ Fette
│     Mo   Di   Mi   Do   Fr   Sa   So      │
│                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Protein │ │  Carbs  │ │  Fette  │      │
│  │ Ø 142g  │ │ Ø 185g  │ │  Ø 62g  │      │
│  │  +12%↑  │ │   -5%↓  │ │  stabil │      │
│  └─────────┘ └─────────┘ └─────────┘      │
└────────────────────────────────────────────┘
```

**Vorteile:**
- Zeigt Gesamtkalorien UND Makro-Verteilung
- Trend-Indikatoren vs. Vorwoche
- Kompaktere Darstellung als grouped bars

---

## Technische Umsetzung

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/components/analytics/SupplementAnalyticsWidget.tsx` | Hauptkomponente mit Period-Toggle |
| `src/components/analytics/SupplementHeatmap.tsx` | Calendar-Grid Visualisierung |
| `src/components/analytics/SupplementRanking.tsx` | Horizontale Bar-Charts |
| `src/components/analytics/MacroStackedChart.tsx` | Stacked Area + Summary Cards |

### Zu bearbeitende Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/Analysis.tsx` | Import SupplementAnalyticsWidget statt SupplementComplianceWidget |
| `src/components/HistoryCharts.tsx` | Bar Chart durch MacroStackedChart ersetzen |

---

## Datenabfrage

```typescript
// Hook: useSupplementAnalytics.ts
// Lädt Supplement-Intake-Daten für Heatmap + Ranking

const { data } = await supabase
  .from('supplement_intake_log')
  .select(`
    date,
    user_supplement_id,
    taken,
    timing,
    user_supplements!inner(
      id,
      custom_name,
      name,
      supplement_database(name)
    )
  `)
  .eq('user_id', userId)
  .gte('date', startDate)
  .order('date', { ascending: true });

// Berechnung:
// 1. dailyCompliance: { date, rate, taken, total }[]
// 2. supplementRanking: { name, compliance, days }[]  
// 3. averageCompliance, bestStreak, mostConsistent
```

---

## UI/UX Details

### Heatmap-Farbskala

| Compliance | Farbe | Tailwind |
|------------|-------|----------|
| 100% | Dunkelgrün | `bg-green-500` |
| 80-99% | Hellgrün | `bg-green-400` |
| 50-79% | Gelb | `bg-yellow-400` |
| 1-49% | Rot | `bg-red-400` |
| 0% / Keine | Grau | `bg-muted` |

### Responsive Verhalten

- **Mobile**: Heatmap horizontal scrollbar
- **Desktop**: Alle Elemente sichtbar

### Dark Mode

Alle Farben mit `dark:` Varianten für konsistentes Theme.

---

## Komponenten-Struktur

```typescript
// SupplementAnalyticsWidget.tsx
interface SupplementAnalyticsData {
  dailyCompliance: {
    date: string;
    rate: number;
    taken: number;
    total: number;
  }[];
  supplementRanking: {
    id: string;
    name: string;
    compliance: number;
    daysCount: number;
    totalDays: number;
  }[];
  stats: {
    averageCompliance: number;
    bestStreak: number;
    mostConsistent: string;
  };
}

// MacroStackedChart.tsx  
interface MacroData {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
  total: number;
}

interface MacroSummary {
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  proteinTrend: number; // % change
  carbsTrend: number;
  fatsTrend: number;
}
```

---

## Zu entfernende Elemente

1. **SupplementComplianceWidget.tsx** - Wird nicht mehr importiert (Datei bleibt, falls benötigt)
2. **Lucy's Supplement-Analyse** - Komplett entfernt
3. **Grouped Bar Chart** in HistoryCharts - Ersetzt durch Stacked Area

---

## Geschätzter Aufwand

- SupplementAnalyticsWidget + Heatmap + Ranking: ~20 Minuten
- MacroStackedChart: ~10 Minuten  
- Integration in Analysis.tsx: ~5 Minuten

**Gesamt: ~35 Minuten**
