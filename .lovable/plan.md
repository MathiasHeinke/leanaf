
# Rewrite: Virtual Physics Carousel (True Apple Feel)

## Das Problem

Die aktuelle Implementierung nutzt React State (`virtualIndex`) für die Position. Jede Änderung triggert einen Re-Render, und es gibt keine echte Physik-Simulation. Das Ergebnis:

| Aktuell | Apple-Gefühl |
|---------|--------------|
| Diskrete Index-Änderungen | Kontinuierliche Bewegung |
| Kein Momentum nach Loslassen | Trägheit + Gleiten |
| Starre Snapping-Animation | Elastisches Einrasten |
| Trackpad fühlt sich "tot" an | 1:1 Finger-Tracking |

---

## Die Lösung: MotionValue-basierte Physik

Statt `useState(virtualIndex)` nutzen wir `useMotionValue(x)` - einen kontinuierlichen Wert, der sich mit echter Physik bewegt.

### Architektur-Vergleich

```text
AKTUELL (Diskret):
User Drag → setVirtualIndex(prev + 1) → Re-Render → Neue Positionen

NEU (Kontinuierlich):  
User Drag → x.set(newValue) → useTransform berechnet Positionen → 60fps Updates
```

---

## Technische Änderungen

### 1. Neue Imports + MotionValue Setup

```typescript
import { 
  motion, 
  AnimatePresence, 
  useMotionValue, 
  useTransform,
  animate,
  type PanInfo 
} from 'framer-motion';

// Im Component:
const x = useMotionValue(0); // Kontinuierlicher Scroll-Offset
const isDragging = useRef(false);
```

### 2. Physik-basiertes Drag + Snapping

```typescript
const handleDragEnd = useCallback((
  _: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo
) => {
  isDragging.current = false;
  
  const currentX = x.get();
  const velocity = info.velocity.x;
  
  // Predict where momentum would carry us
  const projectedX = currentX + velocity * 0.2;
  
  // Snap to nearest item
  const snapTarget = Math.round(projectedX / ITEM_TOTAL) * ITEM_TOTAL;
  
  // Animate with spring physics (the Apple feel!)
  animate(x, snapTarget, {
    type: "spring",
    stiffness: 400,
    damping: 40,
    velocity: velocity * 0.5 // Carry momentum into snap
  });
  
  // Haptic on snap
  if ('vibrate' in navigator) navigator.vibrate(10);
}, [x]);
```

### 3. Item-Positionierung via Modulo (Infinite Loop)

Jedes Item berechnet seine Position basierend auf `x` und seinem Index:

```typescript
interface PhysicsItemProps {
  item: QuickActionItem;
  index: number;
  x: MotionValue<number>;
  totalItems: number;
  onTap: () => void;
  isCompleted: boolean;
}

const PhysicsCarouselItem: React.FC<PhysicsItemProps> = ({
  item, index, x, totalItems, onTap, isCompleted
}) => {
  // Calculate position relative to x motion value
  const itemX = useTransform(x, (xVal) => {
    const totalWidth = totalItems * ITEM_TOTAL;
    const centerOffset = window.innerWidth / 2 - ITEM_WIDTH / 2;
    
    // Raw position based on index and scroll
    let pos = index * ITEM_TOTAL + xVal + centerOffset;
    
    // Modulo wrap for infinite scroll
    pos = ((pos % totalWidth) + totalWidth) % totalWidth;
    
    // Offset so items wrap around center
    if (pos > totalWidth / 2) {
      pos -= totalWidth;
    }
    
    return pos;
  });
  
  // Distance from center for scale/opacity
  const distanceFromCenter = useTransform(itemX, (posX) => {
    const center = window.innerWidth / 2 - ITEM_WIDTH / 2;
    return Math.abs(posX - center);
  });
  
  const scale = useTransform(distanceFromCenter, [0, 120], [1.15, 0.75]);
  const opacity = useTransform(distanceFromCenter, [0, 80, 200], [1, 0.5, 0.2]);
  
  return (
    <motion.button
      style={{ x: itemX, scale, opacity }}
      onTap={onTap}
      className="absolute top-0 left-0 ..."
    >
      {/* Icon + Badge */}
    </motion.button>
  );
};
```

### 4. Trackpad Support (Native Wheel → MotionValue)

```typescript
const handleWheel = useCallback((e: React.WheelEvent) => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    e.preventDefault();
    
    // Direct 1:1 mapping - THIS is the Apple feel
    x.set(x.get() - e.deltaX);
  }
}, [x]);

// Debounced snap after wheel stops
const wheelTimeout = useRef<NodeJS.Timeout>();

const handleWheelWithSnap = useCallback((e: React.WheelEvent) => {
  handleWheel(e);
  
  // Clear previous timeout
  if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
  
  // Snap after 150ms of no wheel events
  wheelTimeout.current = setTimeout(() => {
    const snapTarget = Math.round(x.get() / ITEM_TOTAL) * ITEM_TOTAL;
    animate(x, snapTarget, { type: "spring", stiffness: 400, damping: 40 });
  }, 150);
}, [x, handleWheel]);
```

### 5. Smart Start Integration

```typescript
useEffect(() => {
  if (isOpen) {
    const startIndex = completedActions?.size 
      ? getSmartStartIndex(completedActions)
      : 0;
    
    // Set x so the start item is centered
    x.set(-startIndex * ITEM_TOTAL);
  }
}, [isOpen, completedActions, getSmartStartIndex, x]);
```

### 6. Active Item Tracking (für Label)

```typescript
const activeIndex = useTransform(x, (xVal) => {
  const index = Math.round(-xVal / ITEM_TOTAL);
  return ((index % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT;
});

// Use useMotionValueEvent to track changes
useMotionValueEvent(activeIndex, "change", (latest) => {
  setCurrentActiveIndex(latest);
});
```

---

## Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `LiquidCarouselMenu.tsx` | Komplettes Rewrite mit MotionValue-Architektur |

---

## Was bleibt erhalten

- Smart Ordering (Tageszeit-basiert)
- Smart Start (erstes unvollständiges Item)
- Completion Badges (grüne Häkchen)
- Backdrop + Gradient Layer
- Z-Index Hierarchie (z-20/30/40/50)
- Item Click → Action auslösen

---

## Das Apple-Gefühl im Detail

| Feature | Implementierung |
|---------|-----------------|
| **Direktes Tracking** | `x.set(x.get() - deltaX)` - 1:1 Finger-Bewegung |
| **Momentum** | `velocity * 0.2` Projektion bei DragEnd |
| **Elastisches Snapping** | Spring mit `stiffness: 400, damping: 40` |
| **Infinite Loop** | Modulo-Mathematik in `useTransform` |
| **60fps** | MotionValue Updates bypassen React Render |

---

## Zusammenfassung

Das komplette Carousel wird auf `useMotionValue` + `useTransform` umgestellt:

1. **Ein kontinuierlicher x-Wert** statt diskreter Index
2. **Physik-basiertes Snapping** mit Spring-Animation + Velocity
3. **Modulo-Positionierung** für echtes Infinite Scrolling
4. **Native Trackpad-Unterstützung** durch direktes Wheel-to-MotionValue Mapping
5. **60fps Performance** durch MotionValue (kein React Re-Render pro Frame)

Das Ergebnis: Ein Carousel das sich "schwer" und "teuer" anfühlt - wie ein echtes physisches Rad das man anschubsen kann.
