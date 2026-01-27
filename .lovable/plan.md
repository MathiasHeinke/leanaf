

# ChatOverlay Swipe-to-Dismiss Fix

## Problem

Das ARES ChatOverlay (`ChatOverlay.tsx`) unterstuetzt im Gegensatz zu allen anderen Layer 2 Sheets (Nutrition, Hydration, Body, Training, Peptides) **kein Swipe-to-Dismiss**.

Der User muss den Chevron-Button druecken oder auf das Backdrop klicken, statt einfach am Handle nach unten zu ziehen.

---

## Ursache

Alle Layer 2 Sheets verwenden das Framer Motion `drag` Feature:

```tsx
// NutritionDaySheet (korrekt)
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={handleDragEnd}
>
```

Das ChatOverlay hat dieses Feature nicht:

```tsx
// ChatOverlay (aktuell - fehlt)
<motion.div 
  initial={{ y: "100%" }}
  animate={{ y: "5%" }}
  exit={{ y: "100%" }}
  // ← Kein drag="y"
  // ← Kein onDragEnd
>
```

---

## Loesung

### Datei: `src/components/home/ChatOverlay.tsx`

**Aenderung 1: Drag Handler hinzufuegen (vor dem return)**

```tsx
// Handle drag-to-dismiss
const handleDragEnd = useCallback(
  (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    // Close if dragged down >100px or with high velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      handleClose();
    }
  },
  [handleClose]
);
```

**Aenderung 2: Drag Props auf Sheet-Container (Zeile 230-236)**

Vorher:
```tsx
<motion.div 
  initial={{ y: "100%" }}
  animate={{ y: "5%" }}
  exit={{ y: "100%" }}
  transition={{ type: "spring", damping: 28, stiffness: 300 }}
  className="fixed inset-x-0 bottom-0 top-0 z-[51] ..."
>
```

Nachher:
```tsx
<motion.div 
  initial={{ y: "100%" }}
  animate={{ y: "5%" }}
  exit={{ y: "100%" }}
  transition={{ type: "spring", damping: 28, stiffness: 300 }}
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={handleDragEnd}
  className="fixed inset-x-0 bottom-0 top-0 z-[51] ..."
>
```

---

## Technische Details

| Parameter | Wert | Bedeutung |
|-----------|------|-----------|
| `drag="y"` | Nur vertikal | Verhindert horizontales Drag |
| `dragConstraints` | `{ top: 0, bottom: 0 }` | Sheet kann nicht ueber Ursprung hinaus gezogen werden |
| `dragElastic` | `0.2` | Leichter "Gummi"-Effekt fuer natuerliches Gefuehl |
| `onDragEnd` Threshold | `>100px` oder `velocity >500` | Bewaehrte Werte aus anderen Sheets |

---

## Ergebnis

Nach der Aenderung:
- User kann am Handle (oder ueberall auf dem Sheet) nach unten ziehen
- Bei genuegend Distanz/Geschwindigkeit schliesst sich das Overlay automatisch
- Konsistentes Verhalten mit allen anderen Layer 2 Sheets
- Natuerliche iOS/Android-like UX

