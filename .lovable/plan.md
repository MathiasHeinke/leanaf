
# Masterplan: Supplement & Peptide Focus Cards mit Timing-Phasen-Visualisierung

## 1. Problemanalyse

### Aktuelles Verhalten (Screenshot)
Die Supplement-Karte zeigt nur zwei Buttons:
- **Pre-Workout Button** (Hantel-Icon) - farbig
- **Später Button** (Uhr-Icon) - ausgegraut

**Probleme:**
1. **Tracking funktioniert nicht**: Der Klick auf "Abends" (Evening) loggt nichts, weil die Karte nur `morning`, `pre_workout` und `snooze` als `quickActions` hat
2. **Fehlende Transparenz**: User sieht nicht, welche Timing-Phasen (Morgens, Mittags, Abends etc.) er hat
3. **"Später" Button nutzlos**: Das Clock-Icon wird nicht mehr benötigt

## 2. Neue Architektur

### Design-Konzept: Timing-Kreise

```text
Aktuelle Phase:        Fertig:          Noch offen:
    ┌───┐              ┌───┐              ┌───┐
    │ ○ │ (weiß)       │ ✓ │ (weiß)       │   │ (grau/transparent)
    └───┘              └───┘              └───┘
    Pulsiert           Checkmark          Gedimmt
```

**Reihenfolge der Kreise:**
`morning` → `noon` → `evening` → `pre_workout` → `post_workout` → `before_bed`

**Interaktion:**
- Klick auf offenen Kreis → Loggt diese Timing-Phase
- Klick auf fertigen Kreis → Keine Aktion (oder Undo?)
- Keine "Später" Option mehr

### Zwei separate Karten

| Supplements Karte | Peptide Karte |
|-------------------|---------------|
| Pill Icon (💊) | Syringe Icon (💉) |
| Zeigt User-Timing-Phasen | Zeigt aktive Protokolle |
| Klick = Timing loggen | Klick = Peptid-Injection loggen |

## 3. Datenfluss

### Supplements Card

```text
useSupplementData()
    ↓
groupedSupplements: {
  morning: { taken: 2, total: 3 },
  evening: { taken: 0, total: 2 },
  pre_workout: { taken: 1, total: 1 }
}
    ↓
Render Kreise für jedes Timing mit Status
```

### Peptide Card

```text
useProtocols() + useIntakeLog()
    ↓
activeProtocols: [
  { id: 'abc', peptides: [{ name: 'Tirzepatide', ...}], timing: 'evening_fasted' }
]
    ↓
isPeptideTakenToday(protocolId, peptideName)
    ↓
Render Kreise für jedes aktive Peptid
```

## 4. Technische Umsetzung

### Phase 1: Neue Komponente `SupplementTimingCircles`

**Neue Datei:** `src/components/home/cards/SupplementTimingCircles.tsx`

```typescript
interface TimingCircleProps {
  timing: string;
  taken: number;
  total: number;
  isCurrent: boolean;
  onLog: (timing: string) => void;
}

// Rendert einzelne Kreise: ☀️ Morgens, 🌅 Mittags, 🌙 Abends etc.
// Aktuelle Phase: weißer Rand, pulsiert
// Fertig (taken === total): weißer Haken
// Offen: ausgegraut (opacity-40)
```

### Phase 2: Neuer Card-Typ in `useActionCards.ts`

**Änderungen in `src/hooks/useActionCards.ts`:**

```typescript
// ERSETZEN: Alte supplement-Logik (Zeilen 85-118)
// mit neuer Logik, die groupedSupplements von useSupplementData nutzt

// NEU: Peptide Card hinzufügen wenn aktive Protokolle existieren
if (hasActivePeptideProtocols && !allPeptidesTakenToday) {
  result.push({
    id: 'peptide',
    type: 'peptide',
    title: 'Peptide injizieren',
    subtitle: 'Heute fällige Injektionen',
    gradient: 'from-purple-500 to-pink-600',
    icon: Syringe,
    priority: 3,
    xp: 40,
    canSwipeComplete: false
  });
}
```

### Phase 3: Neue Komponente `SupplementsFocusCard`

**Neue Datei:** `src/components/home/cards/SupplementsFocusCard.tsx`

Diese Komponente ersetzt die generische SmartFocusCard-Logik für Supplements:

```typescript
export const SupplementsFocusCard: React.FC<Props> = ({ onComplete }) => {
  const { groupedSupplements, markTimingGroupTaken } = useSupplementData();
  
  // Sortiere Timings in chronologischer Reihenfolge
  const sortedTimings = ['morning', 'noon', 'evening', 'pre_workout', 'post_workout', 'before_bed']
    .filter(t => groupedSupplements[t]);
  
  const currentTiming = getCurrentTiming(); // morning/noon/evening
  
  return (
    <div className="gradient-card from-cyan-500 to-blue-600">
      <div className="flex gap-2">
        {sortedTimings.map(timing => {
          const group = groupedSupplements[timing];
          const isComplete = group.taken === group.total;
          const isCurrent = timing === currentTiming;
          
          return (
            <TimingCircle
              key={timing}
              timing={timing}
              isComplete={isComplete}
              isCurrent={isCurrent}
              onClick={() => handleLog(timing)}
            />
          );
        })}
      </div>
    </div>
  );
};
```

### Phase 4: Neue Komponente `PeptideFocusCard`

**Neue Datei:** `src/components/home/cards/PeptideFocusCard.tsx`

```typescript
export const PeptideFocusCard: React.FC<Props> = ({ onComplete }) => {
  const { protocols } = useProtocols();
  const { isPeptideTakenToday, logIntake } = useIntakeLog();
  
  const activeProtocols = protocols.filter(p => p.is_active);
  
  return (
    <div className="gradient-card from-purple-500 to-pink-600">
      <div className="flex gap-2">
        {activeProtocols.map(protocol => {
          const peptide = protocol.peptides[0];
          const isTaken = isPeptideTakenToday(protocol.id, peptide.name);
          
          return (
            <PeptideCircle
              key={protocol.id}
              name={peptide.name}
              isTaken={isTaken}
              onClick={() => handleInject(protocol)}
            />
          );
        })}
      </div>
    </div>
  );
};
```

### Phase 5: Integration in `SmartFocusCard.tsx`

**Änderungen in `src/components/home/SmartFocusCard.tsx`:**

```typescript
// ERSETZEN: Zeilen 360-384 (SupplementMultiActions)
// mit neuer SupplementTimingCircles-Komponente

if (task.type === 'supplement' || task.type === 'supplements') {
  return <SupplementTimingCircles onComplete={onAction} />;
}

if (task.type === 'peptide') {
  return <PeptideTimingCircles onComplete={onAction} />;
}
```

**LÖSCHEN:** `SupplementMultiActions` Komponente (Zeilen 482-547)

### Phase 6: QuickLogging-Fix

**Änderungen in `src/hooks/useQuickLogging.ts`:**

Keine Änderungen nötig - die `logSupplementsTaken(timing)` Funktion funktioniert bereits korrekt, wenn sie mit dem richtigen Timing aufgerufen wird.

Das Problem war, dass `useActionCards` nicht alle Timings als `quickActions` übergeben hat.

## 5. Visual Design

### Timing-Kreis-Zustände

```css
/* Fertig */
.timing-circle.complete {
  background: white;
  color: primary;
  /* Weißer Haken */
}

/* Aktuell (noch offen) */
.timing-circle.current {
  background: transparent;
  border: 2px solid white;
  animation: pulse 2s infinite;
}

/* Zukünftig/Offen */
.timing-circle.pending {
  background: white/20;
  opacity: 0.4;
}
```

### Timing-Icons (wiederverwendet)

| Timing | Icon | Emoji |
|--------|------|-------|
| morning | Sunrise | ☀️ |
| noon | Sun | 🌅 |
| evening | Moon | 🌙 |
| pre_workout | Dumbbell | 💪 |
| post_workout | Dumbbell | 🏃 |
| before_bed | Moon | 🛏️ |

## 6. Dateien-Übersicht

| Aktion | Datei |
|--------|-------|
| NEU | `src/components/home/cards/SupplementTimingCircles.tsx` |
| NEU | `src/components/home/cards/PeptideFocusCard.tsx` |
| ÄNDERN | `src/hooks/useActionCards.ts` - Supplement/Peptide Card Logik |
| ÄNDERN | `src/components/home/SmartFocusCard.tsx` - Rendering |
| ÄNDERN | `src/components/home/ActionCardStack.tsx` - Handler |
| LÖSCHEN | SupplementMultiActions in SmartFocusCard.tsx |

## 7. Zusammenfassung

**Vorher:**
- 2 statische Buttons (Pre-WO + Später)
- Kein Tracking möglich
- Nutzer sieht nicht, was zu tun ist

**Nachher:**
- Alle User-Timing-Phasen als Kreise sichtbar
- Aktuelle Phase visuell hervorgehoben (pulsierender weißer Kreis)
- Erledigte Phasen mit weißem Haken
- 1-Klick Logging für jede Phase
- Separate Peptide-Karte mit gleichem UX-Pattern
