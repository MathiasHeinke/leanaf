
# Tiefschlaf-Tracking: Widget + Layer 2 Input

## Übersicht

Das ARES Protocol definiert ≥1.5h Tiefschlaf als kritischen Marker (Phase 0 Checklist), aber aktuell gibt es:
- **Keine Datenbank-Spalte** für `deep_sleep_minutes`
- **Keine Eingabemöglichkeit** im SleepLogger
- **Keine Anzeige** im SleepWidget oder SleepDaySheet

---

## Architektur

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATENBANK MIGRATION                                  │
│                                                                              │
│     sleep_tracking                                                          │
│     ├── ... (bestehende Felder)                                             │
│     └── + deep_sleep_minutes INTEGER (NEW)  ← Tiefschlaf in Minuten         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SLEEP LOGGER (Layer 2 Input)                         │
│                                                                              │
│     SleepLogger.tsx                                                          │
│     └── Schlaf-Details Accordion                                            │
│         ├── Eingeschlafen (besteht)                                         │
│         ├── Aufgewacht (besteht)                                            │
│         ├── Unterbrechungen (besteht)                                       │
│         └── + TIEFSCHLAF SLIDER (NEU)                                       │
│             └── 0 - 180 min, Step 5, Default 60                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANZEIGE KOMPONENTEN                                  │
│                                                                              │
│  SleepWidget.tsx (flat/medium/large)                                        │
│  └── Zeigt Tiefschlaf als Secondary Value                                   │
│      z.B. "7.5h · 1.5h Tief" oder Mini-Progress zur 1.5h-Zielmarke         │
│                                                                              │
│  SleepDaySheet.tsx (Layer 2)                                                │
│  └── Hero Section erweitern um Tiefschlaf-Anzeige                          │
│  └── Neuer Badge in Einflussfaktoren: "1h 30m Tiefschlaf"                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Datenbank-Migration

Neue Spalte in `sleep_tracking`:

| Spalte | Typ | Default | Beschreibung |
|--------|-----|---------|--------------|
| `deep_sleep_minutes` | INTEGER | NULL | Tiefschlaf in Minuten (optional) |

**Migration SQL:**
```sql
ALTER TABLE sleep_tracking 
ADD COLUMN deep_sleep_minutes INTEGER;
```

---

## Phase 2: SleepLogger erweitern

### 2.1 Neuer State
```typescript
const [deepSleep, setDeepSleep] = useState<number>(0); // in Minuten
```

### 2.2 Neuer Slider im "Schlaf-Details" Accordion

Position: Nach "Unterbrechungen", vor Ende des Accordion-Contents

**Design:**
- Label: "Tiefschlaf"
- Slider: 0 - 180 min (3h max)
- Step: 5 min
- Anzeige: "X h Y min" Format
- Farbe: Indigo (passend zum Schlaf-Thema)
- Optional: Zielmarke bei 90 min (1.5h) als visueller Hinweis

### 2.3 trackEvent erweitern
```typescript
await trackEvent('sleep', { 
  // ... bestehende Felder
  deep_sleep_minutes: deepSleep > 0 ? deepSleep : undefined
});
```

---

## Phase 3: useAresEvents anpassen

In `useAresEvents.ts`, Zeile ~226, das Sleep-Payload erweitern:
```typescript
if (category === 'sleep' && payload.sleep_hours) {
  const { error } = await supabase.from('sleep_tracking').upsert({
    // ... bestehende Felder
    deep_sleep_minutes: payload.deep_sleep_minutes || null,
  });
}
```

---

## Phase 4: SleepDaySheet Anzeige

### 4.1 Query erweitern
Die Query holt bereits `*`, also alle Felder - keine Änderung nötig.

### 4.2 Hero Section erweitern

Im Hero-Bereich (nach der Qualitäts-Anzeige) optional Tiefschlaf anzeigen:
```tsx
{todayEntry?.deep_sleep_minutes > 0 && (
  <p className="text-sm text-muted-foreground mt-1">
    💤 {Math.floor(todayEntry.deep_sleep_minutes / 60)}h {todayEntry.deep_sleep_minutes % 60}m Tiefschlaf
  </p>
)}
```

### 4.3 Einflussfaktoren-Badge

Neuer Badge in der "Einflussfaktoren"-Sektion:
```tsx
{deepSleepMinutes > 0 && (
  <div className={cn(
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
    deepSleepMinutes >= 90 
      ? "bg-indigo-500/10 text-indigo-500"  // Ziel erreicht
      : "bg-orange-500/10 text-orange-500"   // Unter Ziel
  )}>
    <Moon className="w-3.5 h-3.5" />
    <span>{formatDeepSleep(deepSleepMinutes)} Tiefschlaf</span>
  </div>
)}
```

---

## Phase 5: SleepWidget erweitern

### 5.1 Query erweitern
```typescript
const { data: sleepRecords } = await supabase
  .from('sleep_tracking')
  .select('date, sleep_hours, deep_sleep_minutes')  // + deep_sleep_minutes
  .eq('user_id', user.id)
  .in('date', dates);
```

### 5.2 Flat Size Anzeige
Zeige Tiefschlaf als sekundären Wert:
```tsx
{/* Value */}
<div className="relative z-10 flex items-center gap-2 shrink-0">
  <span className="text-sm font-bold text-foreground">
    {sleepHours > 0 ? `${sleepHours.toFixed(1)}h` : '--'}
  </span>
  {deepSleep > 0 && (
    <span className="text-xs text-indigo-400">
      💤 {formatDeepSleep(deepSleep)}
    </span>
  )}
</div>
```

### 5.3 Medium/Large Size
Erweitere die Detail-Anzeige um Tiefschlaf-Info.

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| Supabase Migration | **CREATE** | Neue Spalte `deep_sleep_minutes` |
| `src/components/home/loggers/SleepLogger.tsx` | **EDIT** | +Tiefschlaf-Slider im Accordion |
| `src/hooks/useAresEvents.ts` | **EDIT** | +deep_sleep_minutes in Payload |
| `src/components/home/sheets/SleepDaySheet.tsx` | **EDIT** | +Tiefschlaf-Anzeige in Hero + Badge |
| `src/components/home/widgets/SleepWidget.tsx` | **EDIT** | +Tiefschlaf in Query + Display |

---

## UI-Design Details

### Tiefschlaf-Slider im Logger

```text
┌─────────────────────────────────────────────────────────────────┐
│  Tiefschlaf                                           1h 30min  │
│  ○━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○  │
│  0 min         ▲ Ziel: 1.5h                              3h     │
│                │                                                 │
│                └── Optionale Ziel-Markierung                     │
└─────────────────────────────────────────────────────────────────┘
```

### Widget Display (Flat)

```text
┌─────────────────────────────────────────────────────────────────┐
│  🌙  Schlaf  │▋▌▍▎▏│  7.5h  💤 1h 30m                           │
└─────────────────────────────────────────────────────────────────┘
```

### Day Sheet Badge

```text
┌─────────────────────────────────────────────────────────────────┐
│  🌙 1h 30m Tiefschlaf    (Indigo, wenn ≥90min)                  │
│  🌙 45m Tiefschlaf       (Orange, wenn <90min)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementierungsreihenfolge

1. **Datenbank-Migration** - Neue Spalte `deep_sleep_minutes`
2. **useAresEvents.ts** - Payload erweitern für deep_sleep_minutes
3. **SleepLogger.tsx** - Tiefschlaf-Slider im Accordion
4. **SleepDaySheet.tsx** - Anzeige in Hero + Einflussfaktoren
5. **SleepWidget.tsx** - Anzeige in allen Größen
6. **Testen** - Eingabe → Speicherung → Anzeige

---

## Erfolgsmetriken

| Metrik | Beschreibung |
|--------|--------------|
| **Eingabe-Rate** | Wie oft wird Tiefschlaf erfasst? |
| **Ziel-Erreichung** | % der Tage mit ≥90min Tiefschlaf |
| **Widget-Nutzung** | Wird die neue Info wahrgenommen? |
