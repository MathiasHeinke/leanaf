

# Premium Supplement Card Layout Redesign

## Problem-Analyse

Die TimingCircles haben aktuell eine **vertikale Struktur**: Circle oben, Label darunter (`flex-col`). Diese Labels ("Morgens", "Abends", "Pre-WO" etc.) ragen nach UNTEN aus der Card heraus.

```text
Aktuell:                          Problem:
   [○]                               [○]
 Morgens   <- Label ragt           Morgens  <- Ragt aus Card!
                                   -------- <- Card-Ende
```

---

## Premium Loesung: Labels entfernen, Tooltip on Tap

Die eleganteste Loesung: **Keine Labels unter den Circles** - stattdessen wird das Label als kurzer Tooltip/Overlay beim Tap angezeigt.

### Vorteile
- Cleaner, minimalistischer Look
- Mehr vertikaler Platz
- Kein Overflow-Problem mehr
- Premium iOS-like Aesthetic

---

## Technische Aenderungen

### 1. SupplementTimingCircles.tsx - Labels entfernen, Tooltip hinzufuegen

**TimingCircle Component (Zeile 69-141) komplett ueberarbeiten:**

```typescript
const TimingCircle: React.FC<TimingCircleProps> = ({
  timing,
  isComplete,
  isCurrent,
  supplementCount,
  takenCount,
  onLog,
  disabled,
}) => {
  const [isLogging, setIsLogging] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const config = TIMING_CONFIG[timing] || { icon: Sun, label: timing };
  const Icon = config.icon;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isComplete || disabled || isLogging) return;
    
    // Show label briefly on tap
    setShowLabel(true);
    setTimeout(() => setShowLabel(false), 1500);
    
    setIsLogging(true);
    await onLog();
    setIsLogging(false);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isComplete || disabled || isLogging}
      whileTap={{ scale: isComplete ? 1 : 0.9 }}
      className={cn(
        "relative flex items-center justify-center transition-all",
        isComplete && "cursor-default",
        !isComplete && !disabled && "cursor-pointer",
      )}
    >
      {/* Circle - jetzt ohne flex-col, kein Label darunter */}
      <div
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center transition-all border-2",
          isComplete && "bg-white border-white",
          isCurrent && !isComplete && "border-white bg-transparent animate-pulse",
          !isCurrent && !isComplete && "border-white/30 bg-white/10 opacity-50"
        )}
      >
        {/* Icon/Check/Loading wie bisher */}
      </div>

      {/* Floating Label - nur bei Tap sichtbar */}
      <AnimatePresence>
        {showLabel && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 
                       bg-black/80 backdrop-blur-sm rounded text-[9px] font-medium 
                       text-white whitespace-nowrap z-30"
          >
            {config.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count badge - bleibt */}
      {supplementCount > 1 && (
        <span className={cn(
          "absolute -top-1 -right-1 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
          isComplete ? "bg-emerald-500 text-white" : "bg-white/20 text-white/80"
        )}>
          {isComplete ? supplementCount : `${takenCount}/${supplementCount}`}
        </span>
      )}
    </motion.button>
  );
};
```

### 2. SmartFocusCard.tsx - SnoozeHint Redesign

**SnoozeHint Component (Zeile 196-212):**

```typescript
const SnoozeHint: React.FC<SnoozeHintProps> = ({ onSnooze }) => (
  <motion.button
    onClick={(e) => { e.stopPropagation(); onSnooze(); }}
    whileTap={{ scale: 0.9 }}
    className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-1 
               rounded-full bg-white/10 backdrop-blur-sm border border-white/10
               text-white/40 text-[10px] font-medium hover:bg-white/20 hover:text-white/60 
               transition-all"
  >
    <Clock size={10} />
    <span>2h</span>
    <ChevronRight size={10} className="opacity-60" />
  </motion.button>
);
```

**Imports aktualisieren**: `ChevronRight` statt `ChevronLeft`.

---

## Visuelles Ergebnis

```text
+----------------------------------------+
|  PRIORITY  +30 XP              [X]     |
|                                        |
|  Supplements einnehmen                 |
|  Noch offen: Abends, Pre-WO            |
|                                        |
|   [✓]    [🌙]    [💪]    [🛏️]         |  <- Nur Circles, keine Labels
|                                        |
|                          [🕐 2h →]     |  <- Korrekter SnoozeHint
+----------------------------------------+

       Bei Tap auf [🌙]:
       
   [✓]    [🌙]    [💪]    [🛏️]
           ↓
        [Abends]  <- Floating Label erscheint kurz
```

---

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `SupplementTimingCircles.tsx` | Labels entfernen, stattdessen Floating Tooltip bei Tap |
| `SupplementTimingCircles.tsx` | Circle-Container: `flex-col` entfernen, nur horizontal |
| `SmartFocusCard.tsx` | SnoozeHint: `ChevronLeft` zu `ChevronRight`, neue Reihenfolge |

---

## Erwartetes Verhalten

1. **Supplement Card** zeigt nur Circles ohne Labels darunter
2. **Bei Tap** auf einen Circle erscheint kurz (1.5s) das Label als Floating Tooltip
3. **SnoozeHint** zeigt jetzt logisch `🕐 2h →` (Pfeil nach rechts = Swipe-Richtung)
4. **Kein Overflow** mehr - alles bleibt sauber in der Card

