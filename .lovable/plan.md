

# UX Refactor: Swipe-Logik vereinfachen

## Zusammenfassung

Wir vereinfachen die Gestures auf ein intuitives 2-Aktionen-System:
- **Swipe RECHTS** = 2h Standby (Snooze)
- **X-Button oben** = Permanent fuer heute schliessen

Swipe nach links wird entfernt - es macht semantisch keinen Sinn mehr.

---

## Neue UX-Logik

| Aktion | Verhalten | Feedback |
|--------|-----------|----------|
| Swipe Rechts | 2h Snooze | Gelbe/Orange Overlay + "⏸️ 2h" Animation |
| X-Button oben | Permanent dismiss | Card verschwindet (kein Comeback) |
| Swipe Links | Deaktiviert | Kein visuelles Feedback, Card snappt zurueck |

---

## Technische Aenderungen

### 1. SmartFocusCard.tsx - Swipe-Handler anpassen

**handleDragEnd Funktion (Zeile 213-221):**

```typescript
// VORHER:
const handleDragEnd = (_: any, info: PanInfo) => {
  if (info.offset.x > 100 && task.canSwipeComplete !== false) {
    // SWIPE RIGHT -> COMPLETE (default action)
    handleComplete();
  } else if (info.offset.x < -100) {
    // SWIPE LEFT -> DISMISS
    onDismiss();
  }
};

// NACHHER:
const handleDragEnd = (_: any, info: PanInfo) => {
  if (info.offset.x > 100) {
    // SWIPE RIGHT -> 2H SNOOZE (Standby)
    onSnooze();
  }
  // Swipe links deaktiviert - Card snappt zurueck
};
```

### 2. Props erweitern

**SmartFocusCardProps Interface (Zeile 37-46):**

```typescript
interface SmartFocusCardProps {
  task: SmartTask;
  onComplete: (action?: string) => void;
  onDismiss: () => void;           // Permanent dismiss (X-Button)
  onSnooze: () => void;            // NEU: 2h Snooze (Swipe Right)
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
  onHydrationAction?: (action: string) => void;
  style?: React.CSSProperties;
  className?: string;
}
```

### 3. Swipe Feedback Farben anpassen

**bgOverlayColor Transform (Zeile 208-209):**

```typescript
// VORHER: Rot links, Gruen rechts
const bgOverlayOpacity = useTransform(x, [-150, 0, 150], [0.5, 0, 0.5]);
const bgOverlayColor = useTransform(x, [-150, 0, 150], ["#ef4444", "transparent", "#22c55e"]);

// NACHHER: Nur Orange/Amber rechts fuer Snooze-Feedback
const bgOverlayOpacity = useTransform(x, [0, 100, 150], [0, 0.3, 0.5]);
const bgOverlayColor = useTransform(x, [0, 100, 150], ["transparent", "#f59e0b", "#f59e0b"]);
```

### 4. Drag Constraints anpassen

**drag Constraints (Zeile 251-252):**

```typescript
// VORHER: Kann nach links und rechts gezogen werden
dragConstraints={{ left: 0, right: 0 }}

// NACHHER: Nur nach rechts erlaubt, links blockiert
dragConstraints={{ left: 0, right: 0 }}
// Plus: Negative X-Werte ignorieren
```

Alternative: Elasticity nur fuer positive Werte:
```typescript
dragElastic={{ left: 0, right: 0.7 }}
```

### 5. Snooze-Indicator unten rechts hinzufuegen

Ein dezentes visuelles Cue das die Swipe-Richtung andeutet:

```typescript
// Neue Komponente nach SmartActions
const SnoozeHint: React.FC = () => (
  <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white/40 text-[10px]">
    <Clock size={10} />
    <span>Swipe → 2h</span>
  </div>
);
```

---

### 6. ActionCardStack.tsx - Handler anpassen

**handleDismissCard Funktion splitten:**

```typescript
// Snooze Handler (2h - fuer Swipe Rechts)
const handleSnoozeCard = useCallback((card: ActionCard) => {
  dismissCard(card.id, true); // true = 2h snooze
  setCards(prev => prev.filter(c => c.id !== card.id));
  
  toast('Auf Standby', { 
    description: 'Kommt in 2h wieder',
    icon: '⏸️'
  });
}, [dismissCard]);

// Permanent Dismiss Handler (fuer X-Button)
const handleDismissCard = useCallback((card: ActionCard) => {
  dismissCard(card.id, false); // false = permanent fuer heute
  setCards(prev => prev.filter(c => c.id !== card.id));
}, [dismissCard]);
```

**SmartFocusCard Aufruf anpassen:**

```typescript
<SmartFocusCard
  key={card.id}
  task={mapCardToTask(card)}
  onComplete={(action) => handleCompleteCard(card, action)}
  onDismiss={() => handleDismissCard(card)}   // X-Button = permanent
  onSnooze={() => handleSnoozeCard(card)}     // NEU: Swipe = 2h
  onOpenChat={onTriggerChat}
  // ...
/>
```

---

## Visuelles Ergebnis

```text
+----------------------------------------+
|  PRIORITY  +30 XP              [X]     |  <- X = Permanent weg fuer heute
|                                        |
|  Training anstehend                    |
|  Montag ist Trainingstag. Bereit?      |
|                                        |
|   [ Workout starten ]                  |
|                                        |
|                        [🕐 Swipe → 2h] |  <- Dezenter Hint
+----------------------------------------+

        -----> Swipe RECHTS ----->
              Orange Overlay
            Card verschwindet
          "Auf Standby" Toast
         Kommt in 2h wieder
```

---

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `SmartFocusCard.tsx` | Props + `onSnooze`, Swipe-Handler, Feedback-Farben, Snooze-Hint |
| `ActionCardStack.tsx` | Neue `handleSnoozeCard` Funktion, Props durchreichen |

---

## Erwartetes Verhalten

1. **User sieht Card** → Snooze-Hint unten rechts sichtbar
2. **Swipe nach rechts** → Orange Overlay, Card verschwindet, Toast "Auf Standby"
3. **Nach 2 Stunden** → Card erscheint wieder im Stack
4. **X-Button klicken** → Card verschwindet permanent fuer heute (kein Comeback)
5. **Swipe nach links** → Nichts passiert, Card snappt zurueck

