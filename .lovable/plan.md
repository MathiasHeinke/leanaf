
# Implementation: Event-Driven Card Completion System

## Uebersicht

Dieses System implementiert das `ares-card-completed` CustomEvent-Pattern, damit Karten automatisch aus dem ActionCardStack verschwinden, sobald der User die zugehoerige Aktion (Journal schreiben, Schlaf loggen, etc.) abschliesst.

---

## Architektur-Flow

```text
User klickt "Journal schreiben"
           |
           v
   SmartFocusCard -> openJournal()
           |
           v
   QuickLogSheet oeffnet mit Journal Tab
           |
           v
   User speichert -> handleSave()
           |
           v
   trackEvent() erfolgreich
           |
           v
   dispatchEvent('ares-card-completed', { cardType: 'journal' })
           |
           v
   ActionCardStack empfaengt Event
           |
           v
   setCards(prev => prev.filter(c => c.type !== 'journal'))
           |
           v
   Card Exit-Animation + XP Award
```

---

## Aenderungen im Detail

### 1. ActionCardStack.tsx - Zentraler Event-Listener

**Wo:** Nach Zeile 63 (nach dem confetti useEffect)

**Was:** Neuer useEffect der auf `ares-card-completed` hoert und:
- Die passende Card aus dem State filtert
- `dismissCard()` aufruft fuer Session-Persistenz
- XP via `ares-xp-awarded` vergibt

```typescript
// Event-driven card completion listener
useEffect(() => {
  const handleCardCompletion = (e: CustomEvent<{ cardType: string; cardId?: string }>) => {
    const { cardType, cardId } = e.detail;
    
    // Find matching card
    const matchingCard = cards.find(c => 
      cardId ? c.id === cardId : c.type === cardType
    );
    
    if (!matchingCard) return;
    
    // Remove card from stack
    setCards(prev => prev.filter(c => c.id !== matchingCard.id));
    
    // Persist dismissal for session
    dismissCard(matchingCard.id, false);
    
    // Award XP based on card type
    const xpMap: Record<string, number> = {
      journal: 40,
      sleep: 30,
      weight: 20,
      training: 60,
      profile: 50,
      epiphany: 25,
    };
    
    window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
      detail: { amount: xpMap[cardType] || 20, reason: `${cardType} completed` }
    }));
  };
  
  window.addEventListener('ares-card-completed', handleCardCompletion as EventListener);
  return () => window.removeEventListener('ares-card-completed', handleCardCompletion as EventListener);
}, [cards, dismissCard]);
```

---

### 2. JournalLogger.tsx - Dispatch nach Save

**Datei:** `src/components/home/loggers/JournalLogger.tsx`
**Zeile:** 129-131 (im `if (success)` Block)

**Vorher:**
```typescript
if (success) {
  toast.success('Tagebuch gespeichert ✨');
  onClose();
}
```

**Nachher:**
```typescript
if (success) {
  toast.success('Tagebuch gespeichert ✨');
  window.dispatchEvent(new CustomEvent('ares-card-completed', { 
    detail: { cardType: 'journal' }
  }));
  onClose();
}
```

---

### 3. SleepLogger.tsx - Dispatch nach Save

**Datei:** `src/components/home/loggers/SleepLogger.tsx`
**Zeile:** 102-105 (im `if (success)` Block)

**Vorher:**
```typescript
if (success) {
  onClose();
}
```

**Nachher:**
```typescript
if (success) {
  window.dispatchEvent(new CustomEvent('ares-card-completed', { 
    detail: { cardType: 'sleep' }
  }));
  onClose();
}
```

---

### 4. WeightLogger.tsx - Dispatch nach Save

**Datei:** `src/components/home/loggers/WeightLogger.tsx`
**Zeile:** 100-103 (im `if (success)` Block)

**Vorher:**
```typescript
if (success) {
  onClose();
}
```

**Nachher:**
```typescript
if (success) {
  window.dispatchEvent(new CustomEvent('ares-card-completed', { 
    detail: { cardType: 'weight' }
  }));
  onClose();
}
```

---

### 5. TrainingLogger.tsx - Dispatch nach Save

**Datei:** `src/components/home/loggers/TrainingLogger.tsx`
**Zeile:** 224 (im `if (success)` Block)

**Vorher:**
```typescript
if (success) onClose();
```

**Nachher:**
```typescript
if (success) {
  window.dispatchEvent(new CustomEvent('ares-card-completed', { 
    detail: { cardType: 'training' }
  }));
  onClose();
}
```

---

### 6. EpiphanyCard.tsx - Dispatch bei Chat-Oeffnung

**Datei:** `src/components/home/EpiphanyCard.tsx`
**Zeile:** 64-68 (handleAskMore Funktion)

**Vorher:**
```typescript
const handleAskMore = () => {
  if (insight) {
    onOpenChat(`Du hast mir folgende Erkenntnis gezeigt: "${insight}". ...`);
  }
};
```

**Nachher:**
```typescript
const handleAskMore = () => {
  if (insight) {
    window.dispatchEvent(new CustomEvent('ares-card-completed', { 
      detail: { cardType: 'epiphany' }
    }));
    onOpenChat(`Du hast mir folgende Erkenntnis gezeigt: "${insight}". ...`);
  }
};
```

---

### 7. Profile.tsx - Dispatch nach Profil-Save

**Datei:** `src/pages/Profile.tsx`
**Zeile:** 631 (nach toast.success im handleSave)

**Hinzufuegen nach Zeile 631:**
```typescript
// Notify ActionCardStack that profile was completed
window.dispatchEvent(new CustomEvent('ares-card-completed', { 
  detail: { cardType: 'profile' }
}));
```

---

## Zusammenfassung aller Aenderungen

| Datei | Art | Beschreibung |
|-------|-----|--------------|
| `ActionCardStack.tsx` | Neuer useEffect | Event-Listener + XP Map + Dismiss-Logik |
| `JournalLogger.tsx` | 3 Zeilen | dispatchEvent nach success |
| `SleepLogger.tsx` | 3 Zeilen | dispatchEvent nach success |
| `WeightLogger.tsx` | 3 Zeilen | dispatchEvent nach success |
| `TrainingLogger.tsx` | 4 Zeilen | dispatchEvent nach success |
| `EpiphanyCard.tsx` | 3 Zeilen | dispatchEvent in handleAskMore |
| `Profile.tsx` | 3 Zeilen | dispatchEvent nach toast.success |

---

## Erwartetes Verhalten nach Implementation

1. **Journal Card:** User klickt "Journal schreiben" -> Sheet oeffnet -> Eintrag speichern -> Card verschwindet sofort + 40 XP Toast

2. **Epiphany Card:** User klickt "Was bedeutet das?" -> Chat oeffnet -> Card verschwindet sofort + 25 XP

3. **Sleep/Weight/Training:** Logger speichern -> Card verschwindet + jeweilige XP

4. **Profile Card:** User speichert vollstaendiges Profil -> Card verschwindet + 50 XP

---

## Naechster Schritt (Teil 2)

Nach erfolgreicher Implementation dieses Frameworks:
- Neue Card-Typen hinzufuegen (Training, Weight, Sleep_log, Nutrition)
- Trigger-Bedingungen in `useActionCards.ts` erweitern
- SmartActions fuer die neuen Typen definieren
