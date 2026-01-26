

# Ultimate Liquid Carousel - Infinite Loop & Premium UX

## Das Konzept: "Triple List Trick"

Die Illusion eines unendlichen Scrolls entsteht durch das Klonen der Liste 3x. Sobald der User an den Rand scrollt, wird er unsichtbar in die Mitte "teleportiert".

```text
SCROLL-STRUKTUR:

    ← Teleport Zone       Center Zone         Teleport Zone →
    ┌─────────────────┬─────────────────┬─────────────────┐
    │ [Set 1: Kopie]  │ [Set 2: Origin] │ [Set 3: Kopie]  │
    │ sleep weight... │ sleep weight... │ sleep weight... │
    └─────────────────┴─────────────────┴─────────────────┘
                      ↑
                  START HIER
                  (scrollLeft = scrollWidth / 3)

Wenn User nach links scrollt und Set 1 erreicht:
    → Teleport zu gleicher Position in Set 2

Wenn User nach rechts scrollt und Set 3 erreicht:
    → Teleport zu gleicher Position in Set 2
```

---

## Technische Implementierung

### 1. Datenstruktur: Triple List mit einzigartigen Keys

```typescript
// Basis: Smart ordered items (7 Stück)
const orderedItems = useMemo(() => getSmartOrderedItems(), []);
const ITEMS_COUNT = orderedItems.length; // 7

// Triple List für Infinite Scroll
const loopedItems = useMemo(() => [
  ...orderedItems.map(item => ({ ...item, key: `${item.id}-prev` })),  // Set 1
  ...orderedItems.map(item => ({ ...item, key: `${item.id}-main` })),  // Set 2 (Start)
  ...orderedItems.map(item => ({ ...item, key: `${item.id}-next` })),  // Set 3
], [orderedItems]);

// Gesamt: 21 Items (7 × 3)
```

### 2. Initiale Position: Starte in der Mitte

```typescript
useEffect(() => {
  if (isOpen && scrollRef.current) {
    const container = scrollRef.current;
    // Starte bei Set 2 (mittleres Drittel)
    const initialScroll = container.scrollWidth / 3;
    container.scrollTo({ left: initialScroll, behavior: 'instant' });
    setActiveIndex(ITEMS_COUNT); // Erstes Item von Set 2
  }
}, [isOpen, ITEMS_COUNT]);
```

### 3. Der "Teleport" Scroll Handler

```typescript
const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  const container = e.currentTarget;
  const scrollLeft = container.scrollLeft;
  const scrollWidth = container.scrollWidth;
  const clientWidth = container.clientWidth;
  
  // Breite eines kompletten Sets
  const setWidth = scrollWidth / 3;
  
  // ===== TELEPORT LOGIK =====
  // Wenn zu weit links (in Set 1) → Springe zu Set 2
  if (scrollLeft < setWidth * 0.3) {
    container.scrollLeft = scrollLeft + setWidth;
    return; // Verhindere weitere Updates bis nächster Frame
  }
  
  // Wenn zu weit rechts (in Set 3) → Springe zu Set 2
  if (scrollLeft > setWidth * 1.7) {
    container.scrollLeft = scrollLeft - setWidth;
    return;
  }
  
  // ===== ACTIVE INDEX BERECHNUNG =====
  const centerPoint = scrollLeft + (clientWidth / 2);
  const rawIndex = Math.round(centerPoint / ITEM_TOTAL);
  // Modulo um auf 0-6 (originale Items) zu mappen
  const normalizedIndex = rawIndex % ITEMS_COUNT;
  
  if (normalizedIndex !== activeIndex % ITEMS_COUNT) {
    setActiveIndex(normalizedIndex);
  }
}, [activeIndex, ITEMS_COUNT, ITEM_TOTAL]);
```

### 4. Active State über alle 3 Sets synchronisieren

Da das gleiche Item in allen 3 Sets aktiv sein soll:

```typescript
// Bei Rendering prüfen: ist dieses Item aktiv?
const isItemActive = (loopedIndex: number) => {
  return (loopedIndex % ITEMS_COUNT) === activeIndex;
};

// Im JSX:
{loopedItems.map((item, loopedIndex) => (
  <CarouselItem
    key={item.key}
    item={item}
    isActive={isItemActive(loopedIndex)}
    onClick={() => handleItemClick(item)}
  />
))}
```

---

## Vollständiger Code-Überblick

### Neue State & Refs

```typescript
const [activeIndex, setActiveIndex] = useState(0);
const scrollRef = useRef<HTMLDivElement>(null);
const isJumping = useRef(false); // Verhindert Loop während Teleport

const ITEM_WIDTH = 64;
const GAP = 16;
const ITEM_TOTAL = ITEM_WIDTH + GAP; // 80px pro Item
```

### Kompletter Scroll Handler mit Teleport

```typescript
const handleScroll = useCallback(() => {
  const container = scrollRef.current;
  if (!container || isJumping.current) return;
  
  const { scrollLeft, scrollWidth, clientWidth } = container;
  const setWidth = scrollWidth / 3;
  
  // Teleport-Schwellwerte
  const leftThreshold = setWidth * 0.4;
  const rightThreshold = setWidth * 1.6;
  
  // Teleport: Links zu weit → Springe rechts
  if (scrollLeft < leftThreshold) {
    isJumping.current = true;
    container.scrollLeft = scrollLeft + setWidth;
    requestAnimationFrame(() => { isJumping.current = false; });
    return;
  }
  
  // Teleport: Rechts zu weit → Springe links
  if (scrollLeft > rightThreshold) {
    isJumping.current = true;
    container.scrollLeft = scrollLeft - setWidth;
    requestAnimationFrame(() => { isJumping.current = false; });
    return;
  }
  
  // Active Index berechnen
  const centerPoint = scrollLeft + (clientWidth / 2);
  const rawIndex = Math.round(centerPoint / ITEM_TOTAL);
  const normalizedIndex = ((rawIndex % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT;
  
  if (normalizedIndex !== activeIndex) {
    setActiveIndex(normalizedIndex);
  }
}, [activeIndex, ITEMS_COUNT, ITEM_TOTAL]);
```

---

## Z-Index Hierarchie (unverändert)

```text
Layer-Stack (von oben nach unten):
┌────────────────────────────────┐
│  Dock Buttons        z-50    │ ← ARES, Vision, Close (immer oben)
├────────────────────────────────┤
│  Carousel Items      z-40    │ ← Die scrollbaren Icons
├────────────────────────────────┤
│  Gradient Backdrop   z-30    │ ← Visueller Effekt (pointer-events-none)
├────────────────────────────────┤
│  Click Backdrop      z-20    │ ← Zum Schließen bei Tap außerhalb
└────────────────────────────────┘
```

---

## Zusammenfassung der Änderungen

### `LiquidCarouselMenu.tsx`

| Bereich | Vorher | Nachher |
|---------|--------|---------|
| Items-Liste | `orderedItems` (7 Items) | `loopedItems` (21 Items = 3 × 7) |
| Initial Scroll | `scrollTo({ left: 0 })` | `scrollTo({ left: scrollWidth / 3 })` |
| Active Index | Index 0-6 | Normalisiert mit `% ITEMS_COUNT` |
| Scroll Handler | Einfaches Index-Update | + Teleport-Logik für nahtlose Schleife |
| Keys | `item.id` | `item.key` (`${id}-prev/main/next`) |

### Neue Hilfsvariablen

```typescript
const ITEMS_COUNT = orderedItems.length; // 7
const isJumping = useRef(false);         // Verhindert Scroll-Loop
```

---

## UX Flow

```text
START:
┌─────────────────────────────────────────────────────┐
│  [prev]  [prev]  [●]  [main]  [main]  [next]  ...  │
│                   ↑                                 │
│              CENTER (Aktiv)                         │
│           scrollLeft = scrollWidth/3                │
└─────────────────────────────────────────────────────┘

USER SCROLLT NACH RECHTS →→→

┌─────────────────────────────────────────────────────┐
│  ...  [main]  [●]  [next]  [next]  [next]  ...     │
│                ↑                                    │
│           Erreicht Set 3 Grenze                     │
│           → TELEPORT zu Set 2 (unsichtbar)          │
└─────────────────────────────────────────────────────┘

NACH TELEPORT (User merkt nichts):
┌─────────────────────────────────────────────────────┐
│  [prev]  [prev]  [●]  [main]  [main]  ...          │
│                   ↑                                 │
│           Gleiche visuelle Position                 │
│           Kann weiter nach rechts scrollen          │
└─────────────────────────────────────────────────────┘
```

---

## Vorteile

1. **Keine Wände**: Endloses Scrollen in beide Richtungen
2. **Nahtlos**: Teleport ist für das Auge unsichtbar
3. **Premium Feel**: Wie ein physisches Drehrad
4. **Performance**: Nur CSS scroll-snap, kein schwerer JS-Listener
5. **Konsistent**: Active State synchron über alle 3 Sets

---

## Dateien

| Datei | Änderungen |
|-------|------------|
| `src/components/home/LiquidCarouselMenu.tsx` | Triple List, Teleport-Logik, Initial Scroll Position |

