
# Action Cards 2.0: Intelligente Timing-Logik + Mehr Karten-Vielfalt

## Zusammenfassung der Probleme

### 1. Supplement-Karte bleibt obwohl Morgen-Phase erledigt
Aktuell zeigt die Karte so lange, bis **ALLE** Supplements des Tages genommen wurden. User hat Morgen-Supps erledigt, aber die Karte bleibt wegen Mittag/Abend.

### 2. Zu wenige Karten sichtbar
Die aktuellen Zeitbedingungen sind zu restriktiv:

| Karte | Aktuell | Problem |
|-------|---------|---------|
| Sleep Log | 6:00-11:00 | Nach 11 Uhr weg |
| Hydration | Ab 12:00 wenn <1L | Morgens nicht sichtbar |
| Journal | Ab 18:00 nur Abend | Kein Morgen-Journal |
| Training | Nur Mo/Di/Do/Fr | Zu wenig Trainings-Erinnerungen |
| Weight | >7 Tage + 6:00-12:00 | Nur morgens |

### 3. Fehlende Karten-Typen
- **Morgen-Journal**: Für Intention-Setting und Tagesplanung
- **Morgen-Hydration**: 500ml pures Wasser als Routine-Start
- **Bewegungs-Erinnerung**: Schritte/Aktivität auch an "Ruhetagen"

---

## Architektur: Das "Routine-Aware" System

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIMING-PHASEN                                        │
│                                                                              │
│  06:00-11:00  │  11:00-14:00  │  14:00-18:00  │  18:00-22:00  │  22:00+     │
│   MORGEN      │    MITTAG     │   NACHMITTAG  │    ABEND      │   NACHT     │
│               │               │               │               │             │
│  • Sleep Log  │  • Supp noon  │  • Supp eve   │  • Journal    │  (keine)    │
│  • Supp morn  │  • Hydration  │  • Training   │  • Supp bed   │             │
│  • Morning H₂O│  • Training   │  • Movement   │  • Weight     │             │
│  • Morn-Journ │  • Nutrition  │  • Nutrition  │  • Nutrition  │             │
│  • Weight     │               │               │               │             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Änderung 1: Timing-intelligente Supplement-Karte

### Neue Helper-Funktion
```typescript
const getCurrentRelevantSupplementTimings = (
  hour: number, 
  isTrainingDay: boolean, 
  workoutLogged: boolean
): string[] => {
  const relevant: string[] = [];
  
  // Time-based phases
  if (hour >= 6 && hour < 11) relevant.push('morning');
  if (hour >= 11 && hour < 14) relevant.push('noon');
  if (hour >= 14 && hour < 20) relevant.push('evening');
  if (hour >= 20 && hour < 24) relevant.push('before_bed');
  
  // Workout-based phases (only on training days)
  if (isTrainingDay) {
    if (!workoutLogged) relevant.push('pre_workout');
    if (workoutLogged) relevant.push('post_workout');
  }
  
  return relevant;
};
```

### Neue Supplement-Karten-Logik
```typescript
// Check if any CURRENTLY RELEVANT timing has incomplete supplements
const currentPhaseIncomplete = relevantTimings.some(timing => {
  const group = groupedSupplements[timing];
  return group && group.taken < group.total;
});

// Nur zeigen wenn aktuelle Phase noch offen
if (hasSupplements && currentPhaseIncomplete && hour >= 6 && hour < 23) {
  // Nur incomplete Phasen die JETZT relevant sind
  const incompleteRelevant = relevantTimings.filter(timing => {
    const group = groupedSupplements[timing];
    return group && group.taken < group.total;
  });
  
  // Card mit nur relevanten Phasen erstellen
}
```

**Beispiel-Flow:**
- 10:30: User hat 4/4 Morgen-Supps → Karte verschwindet
- 12:15: Mittags-Phase beginnt → Karte erscheint "Noch offen: Mittags"
- 14:00: Mittag erledigt → Karte verschwindet
- 17:00: Abend-Phase → Karte erscheint "Noch offen: Abends"

---

## Änderung 2: Morgen-Journal Karte (NEU)

```typescript
// Morning Journal - Intention Setting (6:00-10:00, before work starts)
const morningJournalDone = /* check if journal entry exists for today morning */;

if (hour >= 6 && hour < 10 && !morningJournalDone) {
  result.push({
    id: 'morning_journal',
    type: 'journal',  // Reuses existing journal type
    title: 'Morgen-Intention',
    subtitle: 'Setze deinen Fokus für den Tag.',
    gradient: 'from-amber-500 to-orange-500',
    icon: Target,  // Ziele-Icon statt PenTool
    actionContext: 'morning_journal',
    priority: 3,  // Hohe Priorität morgens
    xp: 35,
    canSwipeComplete: false
  });
}

// Evening Journal bleibt ab 17:00 (statt 18:00)
if (hour >= 17 && hour < 23 && !eveningJournalDone) {
  // ... existing evening journal card
}
```

**SmartActions Update:**
- Journal-Typ öffnet bereits `openJournal()` 
- JournalLogger erkennt automatisch TimeOfDay (morning/midday/evening)
- Prompts passen sich an: "Was ist dein Fokus für heute?"

---

## Änderung 3: Morgen-Hydration Karte (NEU)

```typescript
// Morning Hydration - First 500ml (6:00-10:00)
const morningHydrationDone = hydrationMl >= 500;

if (hour >= 6 && hour < 10 && !morningHydrationDone) {
  result.push({
    id: 'morning_hydration',
    type: 'hydration',  // Reuses existing hydration type
    title: 'Morgen-Hydration',
    subtitle: `Starte mit Wasser. Erst ${hydrationMl}ml heute.`,
    gradient: 'from-sky-400 to-blue-500',
    icon: Droplets,
    actionContext: 'morning_hydration',
    priority: 2,  // Sehr hohe Priorität morgens
    xp: 15,
    canSwipeComplete: true,
    quickActions: [
      { id: '500ml_water', label: '+500ml', icon: Droplets, primary: true }
    ]
  });
}

// Afternoon Hydration (nach 12:00 wenn <1L) bleibt
if (hour >= 12 && hydrationMl < 1000) {
  // ... existing hydration card
}
```

---

## Änderung 4: Bewegungs-Erinnerung (verbessert)

### Aktuelle Logik (zu restriktiv):
```typescript
const isTrainingDay = [1, 2, 4, 5].includes(dayOfWeek); // Nur Mo/Di/Do/Fr
```

### Neue Logik (ARES Protocol konform):
```typescript
// Training reminder - mehr Tage, unterschiedliche Aktivitäten
const isStrengthDay = [1, 3, 5].includes(dayOfWeek); // Mo/Mi/Fr = Kraft
const isMovementDay = true; // JEDEN Tag Bewegung möglich

// Differenzierte Karten je nach Tag
if (!workoutLogged && hour >= 8 && hour < 21) {
  if (isStrengthDay) {
    result.push({
      id: 'training_strength',
      type: 'training',
      title: 'Krafttraining heute',
      subtitle: 'RPT oder Strength-Session fällig.',
      gradient: 'from-emerald-500 to-teal-600',
      icon: Dumbbell,
      priority: 5,
      xp: 60,
      canSwipeComplete: false
    });
  } else {
    // Movement/Zone 2/Steps reminder on other days
    result.push({
      id: 'training_movement',
      type: 'training',
      title: 'Bewegung heute',
      subtitle: 'Zone 2, Walk, oder 6000+ Schritte.',
      gradient: 'from-green-500 to-emerald-600',
      icon: Footprints, // Neues Icon
      priority: 7,
      xp: 30,
      canSwipeComplete: false
    });
  }
}
```

---

## Änderung 5: Erweiterte Zeitfenster

| Karte | Alt | Neu | Begründung |
|-------|-----|-----|------------|
| Sleep Log | 6:00-11:00 | 6:00-**14:00** | Manche loggen später |
| Hydration | Ab 12:00 | Ab **9:00** (1L-Check) | Früher erinnern |
| Journal (Abend) | Ab 18:00 | Ab **17:00** | Feierabend-Start |
| Weight | >7d + 6-12:00 | >**5**d + 6-**14:00** | Häufiger + längeres Fenster |
| Training | Nur 4 Tage | **Jeden Tag** (differenziert) | Movement ist täglich |

---

## Änderung 6: Limit auf 6 Karten erhöhen

```typescript
// Alt: Limit to 5
return result.sort((a, b) => a.priority - b.priority).slice(0, 5);

// Neu: Limit to 6 für mehr Vielfalt
return result.sort((a, b) => a.priority - b.priority).slice(0, 6);
```

---

## Neue Card-Type Definitionen

```typescript
export interface ActionCard {
  id: string;
  type: 
    | 'insight' | 'epiphany' | 'sleep_fix' | 'journal' | 'supplement' 
    | 'profile' | 'hydration' | 'protein' | 'peptide' | 'training' 
    | 'weight' | 'sleep_log' | 'nutrition'
    | 'morning_journal'   // NEU
    | 'morning_hydration' // NEU  
    | 'movement';         // NEU
  // ...
}
```

---

## SmartActions erweitern

Für die neuen Karten-Typen:

```typescript
// MORNING JOURNAL: Same as journal, just different context
if (task.type === 'journal' || task.type === 'morning_journal') {
  return (
    <button onClick={() => openJournal()}>
      {task.type === 'morning_journal' ? (
        <>
          <Target size={16} />
          <span>Intention setzen</span>
        </>
      ) : (
        <>
          <PenTool size={16} />
          <span>Journal schreiben</span>
        </>
      )}
    </button>
  );
}

// MOVEMENT: Opens training with movement hint
if (task.type === 'movement') {
  return (
    <button onClick={() => openTraining()}>
      <Footprints size={16} />
      <span>Bewegung loggen</span>
    </button>
  );
}
```

---

## Betroffene Dateien

| Datei | Aktion | Änderungen |
|-------|--------|------------|
| `src/hooks/useActionCards.ts` | **EDIT** | Timing-Logik, neue Karten, erweiterte Fenster |
| `src/components/home/cards/SmartActions.tsx` | **EDIT** | Morning Journal + Movement Support |

---

## Erwartetes Ergebnis

**Morgens um 7:30:**
1. **Wie hast du geschlafen?** (Sleep Log)
2. **Morgen-Hydration** (500ml starten)
3. **Supplements einnehmen** (nur "Morgens" offen)
4. **Morgen-Intention** (Journal für Fokus)
5. **Weekly Weigh-In** (wenn fällig)
6. **ARES Epiphany**

**Mittags um 12:30 (nach Morgen-Routine erledigt):**
1. **Supplements einnehmen** (nur "Mittags" offen)
2. **Mehr trinken** (wenn <1L)
3. **Bewegung heute** (oder Krafttraining je nach Tag)
4. **Essens-Pause?** (wenn >4h seit Mahlzeit)
5. **ARES Epiphany**

**Abends um 18:00:**
1. **Abend-Journal** (Reflektion)
2. **Supplements einnehmen** (nur "Vor Schlaf" offen)
3. **ARES Epiphany**

---

## Zukunft: "Deine Routine" Konzept

Dieses System legt die Basis für ein späteres Feature:
- User kann eigene Routine-Karten definieren
- Timing + Trigger selbst wählen
- Karten als "tägliche Habits" speichern
- Streak-Tracking pro Routine-Item

Aktuell implementieren wir die intelligente Standard-Logik, die später durch User-Konfiguration erweiterbar ist.

---

## Implementierungsreihenfolge

1. `getCurrentRelevantSupplementTimings()` Helper erstellen
2. Supplement-Karten-Logik auf Timing-Phasen umstellen
3. Morning Hydration Karte hinzufügen
4. Morning Journal Karte hinzufügen
5. Bewegungs-Karte (täglich, differenziert) hinzufügen
6. Zeitfenster für Sleep/Hydration/Journal/Weight erweitern
7. SmartActions für neue Typen erweitern
8. Limit auf 6 Karten erhöhen
9. Testen mit verschiedenen Szenarien
