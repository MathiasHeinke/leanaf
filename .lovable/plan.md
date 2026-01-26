

# Liquid Carousel Dock - Premium Quick Actions Redesign

## Die Vision

Die aktuellen "bunten Smarties"-Buttons werden durch einen eleganten, horizontal scrollbaren **Liquid Carousel** ersetzt. Dieser bietet:

1. **Glassmorphismus statt Regenbogen** - Fokus auf das aktive Element
2. **Snap-Scroll mit Cover Flow Effect** - iOS-inspirierte Interaktion
3. **Smart Ordering** - Zeitbasierte Sortierung (Morgens: Schlaf/Waage, Abends: Journal)
4. **Adaptive Backdrop** - Light/Dark Mode optimiert
5. **Erweiterbar** - Platz für Supplements und zukünftige Aktionen

---

## Visueller Vergleich

```text
VORHER (Statische bunte Buttons):
   ┌─────────────────────────────────┐
   │  (🟡)  (🟠)  (🟢)  (🟣)  (🔵)   │  ← Alle gleich groß, bunt
   └─────────────────────────────────┘

NACHHER (Liquid Carousel mit Fokus):
   ┌─────────────────────────────────────────┐
   │                                         │
   │   ◌       ◌       ●       ◌       ◌    │
   │  0.75   0.85    1.15    0.85    0.75   │  ← Scale
   │  30%    50%    100%     50%     30%    │  ← Opacity
   │  ───     ──     ███      ──     ───    │  ← Glow nur in Mitte
   │                                         │
   │  ← ─ ─ ─ ─ SWIPE ─ ─ ─ ─ →            │
   └─────────────────────────────────────────┘
```

---

## Technische Architektur

### Neue Komponente: `LiquidCarouselMenu.tsx`

```text
src/components/home/
├── LiquidDock.tsx              ← Behält 3 Hauptbuttons (Vision, ARES, Plus)
├── LiquidCarouselMenu.tsx      ← NEU: Das Carousel-Menü
└── ...
```

### Komponenten-Struktur

```text
┌─────────────────────────────────────────────────────────┐
│  LiquidCarouselMenu                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Backdrop Gradient (adaptive light/dark)          │  │
│  │  from-background via-background/95 to-transparent │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Horizontal Scroll Container                      │  │
│  │  snap-x snap-mandatory overflow-x-auto            │  │
│  │  ┌───────────────────────────────────────────┐    │  │
│  │  │  CarouselItem × 7                         │    │  │
│  │  │  (Sleep, Weight, Supps, Workout, etc.)    │    │  │
│  │  └───────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Action Items Definition

### Alle Quick Actions (7 Items)

| ID | Icon | Label | Farbe (Glow) | Aktion |
|----|------|-------|--------------|--------|
| `sleep` | Moon | Schlaf | Indigo | → QuickLogSheet (sleep tab) |
| `weight` | Scale | Gewicht | Teal | → QuickLogSheet (weight tab) |
| `supplements` | Pill | Supps | Purple | → ChemistryStackSheet |
| `workout` | Dumbbell | Training | Orange | → QuickLogSheet (training tab) |
| `hydration` | Droplet | Wasser | Blue | → Direct water log action |
| `nutrition` | Utensils | Essen | Green | → MealSheet öffnen |
| `journal` | BookOpen | Journal | Amber | → QuickLogSheet (journal tab) |

---

## 2. Smart Ordering (Zeitbasiert)

### Logik für `getSmartOrderedItems()`

```typescript
const getSmartOrderedItems = () => {
  const hour = new Date().getHours();
  
  // MORGEN-ROUTINE (vor 10:00)
  if (hour < 10) {
    return [
      'sleep',        // 1. Schlaf loggen (gerade aufgewacht)
      'weight',       // 2. Wiegen (nüchtern)
      'supplements',  // 3. Morning Stack nehmen
      'workout',      // 4. Morning Workout
      'hydration',    // 5. Wasser
      'nutrition',    // 6. Frühstück
      'journal',      // 7. Morgen-Reflektion
    ];
  }
  
  // TAG/ABEND (ab 10:00)
  return [
    'nutrition',    // 1. Mahlzeiten loggen
    'hydration',    // 2. Hydration tracken
    'workout',      // 3. Training
    'supplements',  // 4. Abend-Stack
    'journal',      // 5. Tages-Reflektion
    'weight',       // 6. Optional wiegen
    'sleep',        // 7. Schlafenszeit
  ];
};
```

---

## 3. Visuelle Styles

### Inaktive Items (Seite des Carousels)

```typescript
// Glass Style - Dezent und elegant
const inactiveStyle = {
  scale: 0.75,
  opacity: 0.5,
  background: "bg-slate-200/40 dark:bg-white/10",  // Milchglas
  iconColor: "text-slate-500 dark:text-white/60",
  shadow: "none",
  border: "border border-white/10",
};
```

### Aktives Item (Mitte/Fokus)

```typescript
// Glow Style - Prominent und leuchtend
const activeStyle = {
  scale: 1.15,
  opacity: 1.0,
  background: itemColor,  // z.B. "bg-indigo-500" für Sleep
  iconColor: "text-white",
  shadow: "shadow-lg shadow-${color}-500/40",  // Farbiger Glow
  border: "border border-white/20",
};
```

### Interpolation zwischen Zuständen

```typescript
// Framer Motion useTransform für smoothe Übergänge
const getItemStyle = (distanceFromCenter: number) => {
  // 0 = Mitte, 1 = direkt daneben, 2+ = weit weg
  const scale = Math.max(0.75, 1.15 - distanceFromCenter * 0.2);
  const opacity = Math.max(0.5, 1 - distanceFromCenter * 0.25);
  const isActive = distanceFromCenter < 0.5;
  
  return { scale, opacity, isActive };
};
```

---

## 4. Adaptive Backdrop

### Light Mode

```css
.carousel-backdrop-light {
  background: linear-gradient(
    to top,
    hsl(var(--background)) 0%,
    hsl(var(--background) / 0.95) 40%,
    transparent 100%
  );
}
```

### Dark Mode

```css
.carousel-backdrop-dark {
  background: linear-gradient(
    to top,
    hsl(0 0% 0%) 0%,
    hsl(0 0% 0% / 0.95) 40%,
    transparent 100%
  );
}
```

### Animation beim Öffnen

```typescript
<motion.div
  initial={{ opacity: 0, y: 100 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 50 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="fixed bottom-0 left-0 right-0 h-[45vh] pointer-events-none"
  style={{ background: "..." }}
/>
```

---

## 5. Interaktions-Mechanik

### Scroll Snapping

```typescript
// Container
<div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar px-[40%]">
  {items.map((item, index) => (
    <CarouselItem 
      key={item.id}
      item={item}
      index={index}
    />
  ))}
</div>

// Items
<div className="snap-center shrink-0 w-20">
  {/* ... */}
</div>
```

### Touch & Click Handling

```typescript
const handleItemClick = (item: QuickActionItem) => {
  // Haptic Feedback (wenn verfügbar)
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
  
  // Aktion ausführen
  switch (item.id) {
    case 'sleep':
    case 'weight':
    case 'workout':
    case 'journal':
      setQuickLogConfig({ open: true, tab: mapToTab(item.id) });
      break;
    case 'supplements':
      setChemistrySheetOpen(true);
      break;
    case 'nutrition':
      setMealSheetOpen(true);
      break;
    case 'hydration':
      logWater(500);
      break;
  }
  
  // Menü schließen
  onClose();
};
```

---

## 6. Scroll-Position Tracking

### Mit IntersectionObserver

```typescript
const [activeIndex, setActiveIndex] = useState(0);
const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const index = itemRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1) setActiveIndex(index);
        }
      });
    },
    { threshold: 0.5, root: scrollContainerRef.current }
  );
  
  itemRefs.current.forEach((ref) => ref && observer.observe(ref));
  return () => observer.disconnect();
}, []);
```

### Alternative: Scroll Position

```typescript
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const container = e.currentTarget;
  const scrollPosition = container.scrollLeft;
  const itemWidth = 80 + 16; // w-20 + gap-4
  const centerOffset = container.clientWidth / 2;
  
  const activeIdx = Math.round((scrollPosition + centerOffset) / itemWidth);
  setActiveIndex(activeIdx);
};
```

---

## 7. Komponenten-Code Struktur

### `LiquidCarouselMenu.tsx`

```typescript
interface QuickActionItem {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;          // bg-indigo-500
  glowColor: string;      // shadow-indigo-500/40
}

interface LiquidCarouselMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export const LiquidCarouselMenu: React.FC<LiquidCarouselMenuProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Smart ordered items based on time of day
  const orderedItems = useMemo(() => getSmartOrderedItems(), []);
  
  // Initial scroll to center first item
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Scroll to first item in center
      scrollRef.current.scrollTo({ left: 0, behavior: 'instant' });
    }
  }, [isOpen]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Gradient Mask */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 h-[45vh] z-41 pointer-events-none
                       bg-gradient-to-t from-background via-background/95 to-transparent"
          />
          
          {/* Carousel Container */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="fixed bottom-28 left-0 right-0 z-42"
          >
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory 
                         scroll-smooth hide-scrollbar px-[40%] py-4"
            >
              {orderedItems.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  item={item}
                  index={index}
                  isActive={index === activeIndex}
                  onClick={() => {
                    onAction(item.id);
                    onClose();
                  }}
                />
              ))}
            </div>
            
            {/* Active Label */}
            <motion.div 
              key={orderedItems[activeIndex]?.label}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm font-medium text-foreground mt-2"
            >
              {orderedItems[activeIndex]?.label}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

### `CarouselItem` Sub-Component

```typescript
const CarouselItem: React.FC<{
  item: QuickActionItem;
  index: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ item, index, isActive, onClick }) => {
  const Icon = item.icon;
  
  return (
    <motion.button
      animate={{
        scale: isActive ? 1.15 : 0.75,
        opacity: isActive ? 1 : 0.5,
      }}
      whileTap={{ scale: isActive ? 1.05 : 0.7 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={cn(
        "snap-center shrink-0 w-16 h-16 rounded-full",
        "flex items-center justify-center",
        "transition-shadow duration-300",
        isActive 
          ? `${item.color} shadow-lg ${item.glowColor} border border-white/20`
          : "bg-slate-200/40 dark:bg-white/10 border border-white/5"
      )}
    >
      <Icon className={cn(
        "transition-colors",
        isActive ? "w-7 h-7 text-white" : "w-5 h-5 text-slate-500 dark:text-white/60"
      )} />
    </motion.button>
  );
};
```

---

## 8. Integration in LiquidDock

### Änderungen an `LiquidDock.tsx`

```typescript
// VORHER: Statische Button-Reihe
<motion.div className="flex gap-3 mb-4">
  {quickActions.map((item) => (
    <motion.button>...</motion.button>
  ))}
</motion.div>

// NACHHER: LiquidCarouselMenu
<LiquidCarouselMenu 
  isOpen={isMenuOpen}
  onClose={() => setIsMenuOpen(false)}
  onAction={handleQuickAction}
/>
```

---

## 9. Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/home/LiquidCarouselMenu.tsx` | **NEU** - Carousel-Komponente |
| `src/components/home/LiquidDock.tsx` | Ersetze statische Buttons durch Carousel |
| `src/pages/AresHome.tsx` | Erweitere `handleQuickAction` für neue Actions |
| `src/components/quick/quickAddBus.ts` | Ergänze `hydration` Action |

---

## 10. UX Flow

```text
┌─────────────────────────────────────────┐
│                                         │
│         [App Content / Widgets]         │
│                                         │
├─────────────────────────────────────────┤  ← User tippt "+"
│                                         │
│     ████████████████████████████████    │  ← Gradient steigt auf
│                                         │
│        ◌    ◌    ●    ◌    ◌           │  ← Carousel erscheint
│                  ▲                      │
│              [Schlaf]                   │  ← Label unter Fokus
│                                         │
│      [🍴]    [⚔️]    [+]               │  ← Dock bleibt sichtbar
│                                         │
└─────────────────────────────────────────┘

→ User wischt nach rechts →

│        ◌    ●    ◌    ◌    ◌           │
│             ▲                           │
│          [Gewicht]                      │

→ User tippt auf aktives Item →

│  [Sheet öffnet sich mit WeightLogger]   │
```

---

## Vorteile

1. **Skalierbar**: Beliebig viele Actions ohne UI-Bruch
2. **Premium Feel**: Cover-Flow Animation wie iOS Fotos
3. **Intelligent**: Zeigt relevante Actions zuerst
4. **Platzsparend**: Versteckt Komplexität hinter elegantem Scroll
5. **Barrierefrei**: Keyboard-navigierbar (Pfeiltasten)
6. **Performance**: CSS scroll-snap statt JS-Animation

