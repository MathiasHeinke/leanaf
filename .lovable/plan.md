

# Fix: Carousel Zentrierung - Die korrekte Berechnung

## Das Problem

Der Screenshot zeigt, dass das "Essen"-Icon (grün hervorgehoben) weit nach rechts verschoben ist, statt exakt in der Bildschirmmitte zu stehen.

### Ursachen:

1. **Initiale Scroll-Position falsch**: `scrollWidth / 3` berücksichtigt nicht das dynamische Padding (`calc(50vw - 32px)`)
2. **Center-Berechnung ignoriert Padding**: Die `rawIndex`-Berechnung in `handleScroll` rechnet nicht mit dem Offset, der durch das linke Padding entsteht
3. **Padding-Wert nicht konsistent**: Das Padding wird inline gesetzt, aber nicht in der Index-Berechnung verwendet

---

## Die Lösung

### 1. Padding als Konstante definieren

```typescript
// Statt inline-Berechnung: eine verwendbare Konstante
const HALF_ITEM_WIDTH = 32; // w-16 / 2 = 32px
```

### 2. Initiale Scroll-Position korrigieren

Das erste Item von Set 2 muss exakt in der Mitte starten:

```typescript
useEffect(() => {
  if (isOpen && scrollRef.current) {
    const container = scrollRef.current;
    requestAnimationFrame(() => {
      // Berechne die Position, wo das erste Item von Set 2 zentriert ist
      // Set 2 startet bei Index 7 (ITEMS_COUNT)
      // Scroll-Position = (Anzahl Items vor Set 2) * ITEM_TOTAL
      const set2StartPosition = ITEMS_COUNT * ITEM_TOTAL;
      container.scrollTo({ left: set2StartPosition, behavior: 'instant' });
      setActiveIndex(0);
    });
  }
}, [isOpen, ITEMS_COUNT]);
```

### 3. Center-Index-Berechnung mit Padding-Offset

Das Padding verschiebt den visuellen Mittelpunkt. Die Berechnung muss das berücksichtigen:

```typescript
const handleScroll = useCallback(() => {
  const container = scrollRef.current;
  if (!container || isJumping.current) return;
  
  const { scrollLeft, scrollWidth, clientWidth } = container;
  const setWidth = scrollWidth / 3;
  
  // Teleport-Logik bleibt gleich...
  
  // KORRIGIERTE Center-Berechnung:
  // Das Padding (50vw - 32px) verschiebt alles nach rechts
  // Der visuelle Center ist bei scrollLeft + padding (nicht clientWidth/2)
  const padding = (clientWidth / 2) - HALF_ITEM_WIDTH;
  const visualCenter = scrollLeft + padding + HALF_ITEM_WIDTH;
  
  // Alternativ vereinfacht: scrollLeft zeigt direkt auf das zentrierte Item
  const rawIndex = Math.round(scrollLeft / ITEM_TOTAL);
  const normalizedIndex = ((rawIndex % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT;
  
  if (normalizedIndex !== activeIndex) {
    setActiveIndex(normalizedIndex);
  }
}, [activeIndex, ITEMS_COUNT]);
```

### 4. Vereinfachte Lösung (Empfohlen)

Da wir `snap-center` und festes Padding verwenden, zeigt `scrollLeft` direkt auf das zentrierte Item:

```typescript
// scrollLeft / ITEM_TOTAL = Index des zentrierten Items
const rawIndex = Math.round(scrollLeft / ITEM_TOTAL);
```

Das funktioniert, weil:
- `paddingLeft: calc(50vw - 32px)` → Das erste Item startet zentriert bei scrollLeft=0
- `snap-center` → Jedes Item rastet exakt mittig ein
- `scrollLeft` zeigt auf den linken Rand des sichtbaren Bereichs minus Padding

---

## Vollständige Änderungen

### `LiquidCarouselMenu.tsx`

| Zeile | Was | Vorher | Nachher |
|-------|-----|--------|---------|
| 72 | Neue Konstante | - | `const HALF_ITEM_WIDTH = 32;` |
| 168-169 | Center-Berechnung | `centerPoint = scrollLeft + (clientWidth / 2)` `rawIndex = Math.round(centerPoint / ITEM_TOTAL)` | `rawIndex = Math.round(scrollLeft / ITEM_TOTAL)` |
| 183 | Initial Scroll | `scrollWidth / 3` | `ITEMS_COUNT * ITEM_TOTAL` |

---

## Technische Erklärung

```text
MIT DEM PADDING:

Viewport:
┌────────────────────────────────────────────────────┐
│          paddingLeft          │ Item │ ...        │
│     (50vw - 32px)             │ [●]  │            │
│<──────────────────────────────>│<--->│            │
│                               │ 64px │            │
└────────────────────────────────────────────────────┘

Wenn scrollLeft = 0:
  → Das erste Item (Index 0) ist zentriert
  
Wenn scrollLeft = 80 (ITEM_TOTAL):
  → Das zweite Item (Index 1) ist zentriert

Also: rawIndex = scrollLeft / ITEM_TOTAL (gerundet)
```

---

## Initiale Position für Set 2

```text
Looped Items Array:
[0] [1] [2] [3] [4] [5] [6]  |  [7] [8] [9] [10] [11] [12] [13]  |  [14] ...
         SET 1               |           SET 2 (Start)           |   SET 3

scrollLeft für Index 7 (erstes Item von Set 2):
= 7 * ITEM_TOTAL
= 7 * 80
= 560px

Normalisiert: 7 % 7 = 0 → activeIndex = 0 ✓
```

---

## Dateien

| Datei | Änderungen |
|-------|------------|
| `src/components/home/LiquidCarouselMenu.tsx` | Konstante HALF_ITEM_WIDTH, korrigierte Center-Berechnung, korrigierte initiale Scroll-Position |

