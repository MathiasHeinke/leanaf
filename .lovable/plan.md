
# Fix: Supplement-Karte verschwindet nicht nach Completion

## Problem-Analyse

Die Karte zeigt "Erledigt!" aber bleibt sichtbar. Das passiert wegen eines Timing-Problems zwischen `SmartFocusCard` und `ActionCardStack`:

### Ablauf aktuell:
1. Alle Timing-Kreise werden angeklickt (alle Supplements erledigt)
2. `SupplementTimingCircles.onComplete()` wird aufgerufen
3. `SmartFocusCard.handleComplete()` setzt `isCompleted=true` (zeigt gruenen Checkmark)
4. Nach 800ms wird `onComplete()` an ActionCardStack weitergeleitet
5. `handleCardComplete` entfernt die Karte aus dem State
6. **Problem**: Die AnimatePresence in SmartFocusCard zeigt noch den Success-State

### Zusaetzliches Problem:
Der `return;` Statement nach dem supplement case verhindert XP-Vergabe.

## Loesung

### 1. ActionCardStack.tsx - Supplement Case fixen

**Zeilen 154-167 ersetzen:**

```typescript
case 'supplement':
case 'supplements':  // Beide Typen behandeln
  if (action === 'snooze') {
    dismissCard(card.id, true);
    setCards(prev => prev.filter(c => c.id !== card.id));
    toast.info('Supplements auf spaeter verschoben');
    return;
  }
  // All supplements completed - remove card and award XP
  if (!action) {
    toast.success('Alle Supplements erledigt!', { description: `+${card.xp} XP` });
    // XP vergeben
    window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
      detail: { amount: card.xp, reason: 'Supplements erledigt' }
    }));
    // Karte entfernen
    setCards(prev => prev.filter(c => c.id !== card.id));
  }
  return;
```

### 2. Peptide Case hinzufuegen

```typescript
case 'peptide':
  if (!action) {
    toast.success('Peptide injiziert!', { description: `+${card.xp} XP` });
    window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
      detail: { amount: card.xp, reason: 'Peptide erledigt' }
    }));
    setCards(prev => prev.filter(c => c.id !== card.id));
  }
  return;
```

### 3. SmartFocusCard.tsx - Exit-Animation beschleunigen (optional)

Die 800ms Delay ist etwas lang. Reduzieren auf 500ms fuer snappigeres Gefuehl:

**Zeile 225:**
```typescript
setTimeout(() => onComplete(specificAction), 500);  // War: 800
```

## Zusammenfassung

| Datei | Aenderung |
|-------|-----------|
| ActionCardStack.tsx | Supplement + Peptide case: XP vergeben + Karte entfernen |
| SmartFocusCard.tsx | Optional: Delay von 800ms auf 500ms reduzieren |

## Warum das funktioniert

1. Wenn `onComplete()` ohne Argument aufgerufen wird, bedeutet das "alle erledigt"
2. Der Success-State in SmartFocusCard zeigt kurz den gruenen Checkmark
3. Dann wird die Karte aus dem ActionCardStack State entfernt
4. AnimatePresence entfernt die Karte mit Exit-Animation
5. XP werden korrekt vergeben
