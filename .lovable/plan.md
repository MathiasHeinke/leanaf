

# Fix: LiquidCarouselMenu Ghosting Bug

## Problemanalyse

Das Karussell zeigt "Ghosting" - Items wie der Journal-Button driften aus ihrer Position. Die Ursache ist ein Konflikt zwischen Framer Motion's automatischer Layout-Berechnung und unserer manuellen `x`-Transform-Logik.

### Die 3 Uebelstaeter

| Zeile | Problem | Auswirkung |
|-------|---------|------------|
| 148 | `uniqueKey: ${virtualIndex + offset}` | Key aendert sich bei jedem Scroll → neue Mount-Zyklen |
| 266 | `mode="popLayout"` | Reserviert Platz fuer exiting Items → falsche Positionen |
| 270 | `layout` Prop | Versucht Positionen zu interpolieren → kaempft mit `x` Transform |

---

## Loesung: Framer "Magie" deaktivieren

Wir vertrauen zu 100% auf unsere mathematische Positionsberechnung und entfernen alle automatischen Layout-Features.

### Aenderung 1: Stabiler Key

```typescript
// Zeile 145-149 VORHER
items.push({
  ...orderedItems[actualIndex],
  offset,
  uniqueKey: `${virtualIndex + offset}`,  // INSTABIL
});

// NACHHER
items.push({
  ...orderedItems[actualIndex],
  offset,
  uniqueKey: `${orderedItems[actualIndex].id}-${offset}`,  // STABIL: ID + Position
});
```

Der Key basiert jetzt auf der **Item-ID + Offset-Position**, nicht auf dem sich staendig aendernden `virtualIndex`.

---

### Aenderung 2: AnimatePresence mode

```typescript
// Zeile 266 VORHER
<AnimatePresence mode="popLayout">

// NACHHER
<AnimatePresence mode="sync">
```

`mode="sync"` sorgt dafuer, dass alle Items synchron animieren, ohne Platz fuer exiting Items zu reservieren.

---

### Aenderung 3: Layout Prop entfernen

```typescript
// Zeile 268-279 VORHER
<motion.div
  key={item.uniqueKey}
  layout  // <-- KONFLIKT MIT x-TRANSFORMS
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{...}}
  exit={{ opacity: 0, scale: 0.5 }}
  ...
>

// NACHHER
<motion.div
  key={item.uniqueKey}
  // layout ENTFERNT - wir kontrollieren x explizit
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{...}}
  exit={{ opacity: 0 }}  // Vereinfacht: nur Fade
  ...
>
```

---

### Aenderung 4: Exit-Animation vereinfachen

```typescript
// VORHER
exit={{ opacity: 0, scale: 0.5 }}

// NACHHER
exit={{ opacity: 0 }}
```

Nur Opacity-Fade verhindert, dass exiting Items in falsche Positionen "fliegen".

---

## Technische Details

### Datei: `src/components/home/LiquidCarouselMenu.tsx`

**Zeilen 145-149** (visibleItems Map):
```typescript
items.push({
  ...orderedItems[actualIndex],
  offset,
  uniqueKey: `${orderedItems[actualIndex].id}-${offset}`,
});
```

**Zeilen 266-289** (Carousel Render):
```typescript
<AnimatePresence mode="sync">
  {visibleItems.map((item) => (
    <motion.div
      key={item.uniqueKey}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        x: `calc(50vw - 32px + ${item.offset * ITEM_TOTAL}px)`,
        scale: item.offset === 0 ? 1.15 : 0.75,
        opacity: Math.abs(item.offset) <= 2 ? (item.offset === 0 ? 1 : 0.5) : 0.2,
      }}
      exit={{ opacity: 0 }}
      transition={springConfig}
      className="absolute top-0 left-0"
    >
      <CarouselItem
        item={item}
        isActive={item.offset === 0}
        isCompleted={completedActions?.has(item.id) ?? false}
        onClick={() => handleItemClick(item)}
      />
    </motion.div>
  ))}
</AnimatePresence>
```

---

## Warum das funktioniert

| Vorher | Nachher | Effekt |
|--------|---------|--------|
| `popLayout` | `sync` | Keine Platzreservierung fuer exiting Items |
| `layout` Prop | Entfernt | Keine automatische Position-Interpolation |
| Instabiler Key | ID-basiert | Keine unnötigen Re-Mounts bei Scroll |
| Complex Exit | Nur Fade | Keine "fliegenden" Items |

---

## Zusammenfassung

| Datei | Aenderung |
|-------|-----------|
| `LiquidCarouselMenu.tsx` Zeile 148 | Key-Strategie: `${item.id}-${offset}` |
| `LiquidCarouselMenu.tsx` Zeile 266 | `mode="popLayout"` → `mode="sync"` |
| `LiquidCarouselMenu.tsx` Zeile 270 | `layout` Prop entfernen |
| `LiquidCarouselMenu.tsx` Zeile 277 | Exit vereinfachen: `{ opacity: 0 }` |

