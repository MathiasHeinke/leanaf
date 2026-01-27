

# EpiphanyCard Layout Fix - Premium Standard

## Problem-Analyse

Die aktuelle Implementierung hat mehrere Fehler:

1. **Separates X-Icon UND Sparkles-Icon** = doppelt, verwirrend
2. **Voller `w-full` Button unten** = ueberdeckt SnoozeHint Bereich
3. **Kein morphendes DismissButton Pattern** wie bei SmartFocusCard

## Loesung: SmartFocusCard Pattern anwenden

Das Sparkles-Icon rechts oben wird zum **DismissButton** (morpht zu X bei Hover/Tap). Der Reveal-Button wird kompakter und links positioniert.

```text
VORHER (kaputt):                    NACHHER (korrekt):
+----------------------------+      +----------------------------+
| [Neues Muster]      [X]    |      | [Neues Muster]    [✨→X]   |  <- Morphing Button
|              [✨ pulsing]  |      |                            |
|                            |      |                            |
| ARES hat ein Muster...     |      | ARES hat ein Muster...     |
| Basierend auf...           |      | Basierend auf...           |
|                            |      |                            |
| [====== Aufdecken ======]  |      | [Aufdecken →]    [⏱ 2h →] |  <- Klein + Snooze
+----------------------------+      +----------------------------+
```

---

## Technische Aenderungen

### 1. EpiphanyCard.tsx - MysteryState komplett ueberarbeiten

**Header (Zeile 170-203):**

Ersetze das separate X-Button + Sparkles-Icon durch einen einzigen **DismissButton** (wie in SmartFocusCard):

```typescript
// Imports erweitern
import { DismissButton } from './SmartFocusCard'; // Oder inline

// Header - Badge links, DismissButton rechts
<div className="flex justify-between items-start">
  <motion.span className="px-3 py-1.5 bg-white/20 ...">
    Neues Muster
  </motion.span>
  
  {/* Morphing DismissButton: Sparkles → X */}
  <DismissButton icon={Sparkles} onDismiss={onDismiss} />
</div>
```

**Reveal Button (Zeile 215-226):**

Von `w-full` zu kompakter Groesse, damit SnoozeHint Platz hat:

```typescript
{/* Kompakter Reveal Button - links */}
<motion.button
  onClick={onReveal}
  className="mt-4 inline-flex py-2.5 px-5 bg-white/20 backdrop-blur-md rounded-xl 
    border border-white/30 items-center gap-2 font-semibold text-sm
    hover:bg-white/30 transition-all active:scale-[0.98]"
  whileTap={{ scale: 0.98 }}
>
  <span>Aufdecken</span>
  <ChevronRight className="w-4 h-4" />
</motion.button>
```

### 2. DismissButton exportieren aus SmartFocusCard.tsx

Der DismissButton muss exportiert werden (Zeile 55-93):

```typescript
// Von:
const DismissButton: React.FC<DismissButtonProps> = ...

// Zu:
export const DismissButton: React.FC<DismissButtonProps> = ...
```

### 3. SnoozeHint bleibt - aber jetzt sichtbar

Durch den kompakten Button bleibt rechts unten genug Platz fuer den SnoozeHint (`bottom-3 right-3`).

---

## Zusammenfassung

| Aenderung | Datei |
|-----------|-------|
| DismissButton exportieren | `SmartFocusCard.tsx` |
| DismissButton importieren + nutzen | `EpiphanyCard.tsx` |
| Separates X-Icon + Sparkles entfernen | `EpiphanyCard.tsx` |
| Reveal-Button: `w-full` zu `inline-flex px-5` | `EpiphanyCard.tsx` |

## Visuelles Ergebnis

```text
+----------------------------------------+
|  [Neues Muster]                [✨→X]  |  <- Ein Button, morpht
|                                        |
|  ARES hat ein Muster erkannt           |
|  Basierend auf deinen letzten 7 Tagen  |
|                                        |
|  [Aufdecken →]              [⏱ 2h →]  |  <- Kompakt + Snooze
+----------------------------------------+
```

