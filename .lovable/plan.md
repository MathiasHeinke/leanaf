

# Plan: Mehrere Sessions pro Tag mit Icon-Overlay

## Status: ✅ IMPLEMENTIERT

## Kontext

Im Screenshot siehst du die "Letzte Sessions" Liste, wo jeder Tag als eigene Zeile erscheint. Das Problem:
- Wenn man an einem Tag **Krafttraining + Sauna + Zone2** macht, gibt es 3 separate Zeilen
- Das wird schnell unübersichtlich

## Design-Lösung

Statt separater Zeilen pro Session → **gruppieren nach Datum** mit Icons:

```text
VORHER (viele Zeilen):
┌─────────────────────────────────────────────────────────┐
│  29.01  🏋️  Krafttraining    42min  3.012kg     ✓      │
│  29.01  🔥  Sauna (≥80°C)    20min              ✓      │
│  29.01  🚶  Zone 2           35min              ✓      │
│  28.01  🚶  Bewegung                            ✓      │
└─────────────────────────────────────────────────────────┘

NACHHER (gruppiert mit Icons):
┌─────────────────────────────────────────────────────────┐
│  29.01  🏋️ 🔥 🚶   ← Icons klickbar/hoverbar           │
│         └→ Popover zeigt Details bei Interaktion       │
│  28.01  🚶                                              │
│  27.01  🏋️                                              │
└─────────────────────────────────────────────────────────┘
```

## Technische Umsetzung

### 1. Query anpassen: Sessions nach Datum gruppieren

```typescript
// Statt einzelne Sessions, nach Datum gruppiert laden
const { data } = await supabase
  .from('training_sessions')
  .select('*')
  .eq('user_id', user.id)
  .gte('session_date', startDate)
  .order('session_date', { ascending: false });

// Gruppieren in der Komponente
const groupedByDate = data.reduce((acc, session) => {
  const date = session.session_date;
  if (!acc[date]) acc[date] = [];
  acc[date].push(session);
  return acc;
}, {});
```

### 2. Neue Komponente: `SessionIconGroup`

Eine Zeile pro Tag mit allen Session-Icons:

```typescript
interface SessionIconGroupProps {
  date: string;
  sessions: TrainingSession[];
}

const SessionIconGroup = ({ date, sessions }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Datum */}
      <span className="text-xs text-muted-foreground w-12">
        {format(new Date(date), 'dd.MM')}
      </span>
      
      {/* Icon-Reihe mit Popovers */}
      <div className="flex gap-2">
        {sessions.map((session) => (
          <SessionIconPopover key={session.id} session={session} />
        ))}
      </div>
      
      {/* Aggregierte Daten */}
      <div className="flex-1 text-right text-xs text-muted-foreground">
        {totalMinutes}min • {totalVolumeKg}kg
      </div>
    </div>
  );
};
```

### 3. Popover für Session-Details

Beim **Klick oder Hover** auf ein Icon erscheint ein Overlay:

```typescript
const SessionIconPopover = ({ session }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
          <span className="text-lg">{getTypeIcon(session.training_type)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{getTypeIcon(session.training_type)}</span>
          <span className="font-semibold">{getTypeLabel(session)}</span>
        </div>
        
        {/* Metrics */}
        <div className="space-y-1 text-sm text-muted-foreground">
          {session.total_duration_minutes && (
            <div className="flex justify-between">
              <span>Dauer:</span>
              <span>{session.total_duration_minutes} min</span>
            </div>
          )}
          {session.total_volume_kg && (
            <div className="flex justify-between">
              <span>Volumen:</span>
              <span>{session.total_volume_kg.toLocaleString('de-DE')} kg</span>
            </div>
          )}
        </div>
        
        {/* Notizen falls vorhanden */}
        {session.notes && (
          <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
            {session.notes}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
```

## Visual Design

```text
┌─────────────────────────────────────────────────────────────┐
│  Letzte Sessions                                            │
├─────────────────────────────────────────────────────────────┤
│  29.01   (🏋️) (🔥) (🚶)           42min • 3.012kg    ✓    │
│             ↓                                               │
│  ┌─────────────────────────┐                                │
│  │ 🏋️ Krafttraining (RPT) │  ← Popover bei Klick/Hover   │
│  │ ─────────────────────── │                                │
│  │ Dauer:    42 min        │                                │
│  │ Volumen:  3.012 kg      │                                │
│  │ Split:    Push          │                                │
│  └─────────────────────────┘                                │
│                                                              │
│  28.01   (🚶)                      35min             ✓      │
│  27.01   (🏋️)                      55min • 2.800kg  ✓      │
│  26.01   (🔥)                      20min             ✓      │
└─────────────────────────────────────────────────────────────┘
```

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/training/SessionIconPopover.tsx` | CREATE | Icon mit Popover-Details Komponente |
| `src/components/training/SessionDayRow.tsx` | CREATE | Gruppierte Tageszeile mit Icons |
| `src/components/home/sheets/TrainingDaySheet.tsx` | EDIT | Query ändern + neue Komponenten nutzen |
| `src/components/home/sheets/TrainingDaySheet.tsx` | EDIT | "Letzte Sessions" Section refactoren |

## Mobile-Optimierung

- Auf **Desktop**: Hover zeigt Popover (HoverCard)
- Auf **Mobile**: Tap öffnet Popover (regulärer Click)
- Icons sind groß genug (w-8 h-8) für Touch-Targets

## Erwartetes Ergebnis

- **Kompaktere Übersicht**: 1 Zeile pro Tag statt 3
- **Alle Infos verfügbar**: Details bei Interaktion
- **Schneller Überblick**: Icons zeigen sofort welche Aktivitäten
- **Aggregierte Metriken**: Gesamtdauer/Volumen pro Tag sichtbar

## Aufwand

| Task | Zeit |
|------|------|
| `SessionIconPopover` Komponente | 20 min |
| `SessionDayRow` Komponente | 15 min |
| TrainingDaySheet Query refactoring | 15 min |
| Integration + Styling | 15 min |
| Mobile Testing | 10 min |

**Gesamt: ~1.25 Stunden**
