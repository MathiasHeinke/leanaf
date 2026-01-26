

# Sprungfreies Infinite Scroll - Transform-basierte Lösung

## Das Problem

Die aktuelle "Teleport"-Methode (`container.scrollLeft = ...`) erzeugt einen sichtbaren Sprung, weil:
1. Der Browser den Scroll-Container neu rendert
2. Es eine kurze visuelle Unterbrechung gibt

## Die elegantere Lösung: Transform-basiertes Carousel

Statt native Scroll + Teleport nutzen wir **Framer Motion** mit einem virtuellen Index-System. Die Items werden per `transform: translateX()` positioniert - komplett ohne Browser-Scroll.

```text
KONZEPT:

Statt echtem Scroll:
┌─────────────────────────────────────┐
│  [1] [2] [3] [4] [5] [6] [7]  ←scroll→
└─────────────────────────────────────┘

Transform-basiert (kein Scroll):
┌─────────────────────────────────────┐
│        ←drag→  [●]  ←drag→          │
│  Items werden per translateX bewegt │
│  Virtueller Index: -∞ bis +∞        │
└─────────────────────────────────────┘
```

---

## Technische Implementierung

### 1. State: Virtueller Index statt Scroll-Position

```typescript
// Statt scrollRef + isJumping:
const [virtualIndex, setVirtualIndex] = useState(0);
const dragStart = useRef(0);
const dragOffset = useRef(0);
```

### 2. Framer Motion Drag statt Native Scroll

```typescript
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.1}
  onDragStart={(_, info) => {
    dragStart.current = info.point.x;
  }}
  onDrag={(_, info) => {
    dragOffset.current = info.point.x - dragStart.current;
    // Live-Update der Position
  }}
  onDragEnd={(_, info) => {
    // Berechne neue Index basierend auf Velocity + Offset
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // Schneller Swipe = mehrere Items
    const itemsToMove = Math.round(-offset / ITEM_TOTAL);
    setVirtualIndex(prev => prev + itemsToMove);
  }}
>
```

### 3. Dynamische Item-Berechnung

Nur 5-7 Items werden gerendert (die sichtbaren + Buffer):

```typescript
const visibleItems = useMemo(() => {
  const result = [];
  // Rendere nur Items im sichtbaren Bereich (-3 bis +3 vom Center)
  for (let offset = -3; offset <= 3; offset++) {
    const index = ((virtualIndex + offset) % ITEMS_COUNT + ITEMS_COUNT) % ITEMS_COUNT;
    result.push({
      ...orderedItems[index],
      offset, // Position relativ zum Center
      key: `item-${virtualIndex + offset}` // Unique key für Animation
    });
  }
  return result;
}, [virtualIndex, orderedItems, ITEMS_COUNT]);
```

### 4. Transform-basierte Positionierung

```typescript
{visibleItems.map((item) => (
  <motion.div
    key={item.key}
    animate={{
      x: item.offset * ITEM_TOTAL, // Position basierend auf Offset
      scale: item.offset === 0 ? 1.15 : 0.75,
      opacity: item.offset === 0 ? 1 : 0.5,
    }}
    transition={springConfig}
    className="absolute left-1/2 -translate-x-1/2"
  >
    <CarouselItem ... />
  </motion.div>
))}
```

---

## Vorteile dieser Lösung

| Aspekt | Teleport (Alt) | Transform (Neu) |
|--------|----------------|-----------------|
| Sprung sichtbar | Ja ❌ | Nein ✅ |
| DOM-Elemente | 21 (3×7) | 7 (nur sichtbare) |
| Performance | Mittelmäßig | Hervorragend |
| Unendlich | Ja | Ja |
| Smooth | Ruckelig | Butterweich |

---

## Vollständiger Ansatz

### Neuer State

```typescript
const [virtualIndex, setVirtualIndex] = useState(0);
const containerRef = useRef<HTMLDivElement>(null);
```

### Drag Handler

```typescript
const handleDragEnd = useCallback((
  _: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo
) => {
  const velocity = info.velocity.x;
  const offset = info.offset.x;
  
  // Threshold: Mindestens halbe Item-Breite oder hohe Velocity
  const threshold = ITEM_TOTAL / 2;
  
  let change = 0;
  if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
    // Richtung bestimmen (negative = nach rechts = nächstes Item)
    change = offset > 0 ? -1 : 1;
    
    // Bei hoher Velocity: mehrere Items überspringen
    if (Math.abs(velocity) > 1000) {
      change *= 2;
    }
  }
  
  setVirtualIndex(prev => prev + change);
  
  // Haptic Feedback
  if (change !== 0 && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}, []);
```

### Sichtbare Items berechnen

```typescript
const getVisibleItems = useCallback(() => {
  const items = [];
  // Buffer: 3 Items links und rechts vom Center
  for (let offset = -3; offset <= 3; offset++) {
    const actualIndex = ((virtualIndex + offset) % ITEMS_COUNT + ITEMS_COUNT) % ITEMS_COUNT;
    items.push({
      ...orderedItems[actualIndex],
      offset,
      uniqueKey: `${virtualIndex + offset}`, // Für AnimatePresence
    });
  }
  return items;
}, [virtualIndex, orderedItems, ITEMS_COUNT]);
```

### JSX Struktur

```typescript
<motion.div
  ref={containerRef}
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.2}
  onDragEnd={handleDragEnd}
  className="relative h-20 w-full touch-pan-y"
>
  <AnimatePresence mode="popLayout">
    {getVisibleItems().map((item) => (
      <motion.div
        key={item.uniqueKey}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          x: `calc(50% - 32px + ${item.offset * ITEM_TOTAL}px)`,
          scale: item.offset === 0 ? 1.15 : 0.75,
          opacity: Math.abs(item.offset) <= 2 ? (item.offset === 0 ? 1 : 0.5) : 0,
        }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={springConfig}
        className="absolute top-0"
        style={{ left: 0 }}
      >
        <CarouselItem
          item={item}
          isActive={item.offset === 0}
          onClick={() => handleItemClick(item)}
        />
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>
```

---

## Zusammenfassung der Änderungen

### Entfernt
- `scrollRef` und scroll-basierte Logik
- `isJumping` Ref
- `loopedItems` (21 Items)
- Native scroll + Teleport

### Hinzugefügt
- `virtualIndex` State (kann -∞ bis +∞ sein)
- `getVisibleItems()` - berechnet nur 7 sichtbare Items
- Framer Motion `drag="x"` + `onDragEnd`
- Transform-basierte Positionierung

---

## UX-Verbesserung

```text
VORHER (Teleport):
User scrollt → nähert sich Grenze → SPRUNG → weiter scrollen
                                    ↑
                              Sichtbar ruckelig

NACHHER (Transform):
User swiped → virtualIndex ändert → Items animieren smooth
              ↑
         Kein DOM-Manipulation, nur CSS transform
```

---

## Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/home/LiquidCarouselMenu.tsx` | Kompletter Refactor zu Transform-basiertem Carousel |

