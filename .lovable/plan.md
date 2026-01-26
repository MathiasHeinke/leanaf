

# UI Polish: Dynamic Layout & Space Optimization

## Uebersicht

Optimierung der QuickLog-Komponenten fuer kleinere Screens mit "atmendem Interface" - dynamische Platznutzung nach Apple Health Vorbild.

```text
VORHER:                           NACHHER:
┌──────────────────────┐         ┌──────────────────────┐
│                      │         │      85.2 kg         │ ← Kompakt
│      85.2 kg         │         │   [−0.1] [+0.1]      │
│        (GROSS)       │         ├──────────────────────┤
│   [−0.1]   [+0.1]    │         │ ▼ Körperkomposition  │ ← OFFEN
│                      │         │   ┌────────────────┐ │
│ ▼ Körperkomposition  │         │   │ KFA: [__] %    │ │
│ ▼ Kontext-Tags       │ ← Beide │   │ Muskeln: [__]% │ │
│                      │  offen  │   └────────────────┘ │
│                      │  moegl. │ ▷ Kontext-Tags       │ ← Auto-Close
│ [✓ Speichern]        │         ├──────────────────────┤
└──────────────────────┘         │ [✓ Speichern]        │ ← Sticky
                                 └──────────────────────┘
```

---

## 1. Morphing Hero - Dynamische Header-Groesse

### Konzept

Wenn ein Accordion geoeffnet wird, schrumpft der obere Bereich (grosse Zahl + Stepper) animiert auf eine kompaktere Groesse.

### Implementierung

```typescript
// State fuer "ist irgendein Accordion offen?"
const isAnyExpanded = detailsOpen || tagsOpen;

// Framer Motion Varianten
const heroVariants = {
  normal: { 
    scale: 1, 
    marginTop: 24, 
    marginBottom: 24 
  },
  compact: { 
    scale: 0.75, 
    marginTop: 8, 
    marginBottom: 8 
  }
};
```

### Visuelle Aenderungen

| Zustand | Zahl-Groesse | Margins | Stepper-Groesse |
|---------|--------------|---------|-----------------|
| **Normal** | `text-6xl` | `py-6` | `w-14 h-14` |
| **Compact** | `text-4xl` | `py-2` | `w-12 h-12` |

---

## 2. Exclusive Expand - Nur ein Accordion offen

### Konzept

Statt mehrerer unabhaengiger `useState`-Booleans nutzen wir einen zentralen State.

### Implementierung

```typescript
// VORHER (Problematisch):
const [detailsOpen, setDetailsOpen] = useState(false);
const [tagsOpen, setTagsOpen] = useState(false);

// NACHHER (Exclusive):
type AccordionSection = 'details' | 'tags' | null;
const [openSection, setOpenSection] = useState<AccordionSection>(null);

// Handler:
const toggleSection = (section: AccordionSection) => {
  setOpenSection(current => current === section ? null : section);
};
```

### Auswirkung auf alle Logger

| Logger | Accordions | Neuer State |
|--------|------------|-------------|
| **Weight** | Koerperkomposition, Kontext-Tags | `'details' | 'tags' | null` |
| **Sleep** | Schlaf-Details, Morgen-Check | `'details' | 'morningCheck' | null` |
| **Training** | (Keine Accordions, nur Auto-Expand) | Keine Aenderung noetig |

---

## 3. Sleep Logger: 5-Punkt Skala & Kompaktheit

### Aktuelles Problem

Die 3 grossen quadratischen Boxen fuer Schlafqualitaet nehmen ~120px Hoehe ein und sind zu ungenau.

```text
VORHER:
┌─────────┐ ┌─────────┐ ┌─────────┐
│   😫    │ │   😐    │ │   🤩    │   ← ~100px hoch
│Schlecht │ │  Okay   │ │  Super  │
└─────────┘ └─────────┘ └─────────┘

NACHHER:
 😫   😕   😐   💪   🚀    ← ~48px hoch (5-Punkt)
 ○    ○    ●    ○    ○     (Selected: 😐)
```

### Neue Konstanten

```typescript
const QUALITY_SCALE = [
  { value: 1, emoji: '😫', label: 'Miserabel' },
  { value: 2, emoji: '😕', label: 'Schlecht' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '💪', label: 'Gut' },
  { value: 5, emoji: '🚀', label: 'Top' },
];
```

### Neues UI-Design

```typescript
<div className="flex justify-center gap-2">
  {QUALITY_SCALE.map((q) => (
    <motion.button
      key={q.value}
      whileTap={{ scale: 0.9 }}
      onClick={() => setQuality(q.value)}
      className={cn(
        "w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all",
        quality === q.value
          ? "bg-primary/20 ring-2 ring-primary scale-110"
          : "bg-muted hover:bg-muted/80 opacity-60"
      )}
    >
      {q.emoji}
    </motion.button>
  ))}
</div>
```

### Kompaktheit

- Neue Hoehe: **48px** (statt 120px)
- Runde Buttons statt Quadrate
- Nur Selected hat volle Opacity + Ring
- Label wird nur bei Selection angezeigt (optional, als Tooltip oder unter der Reihe)

---

## 4. Sticky Save Button - Safety Margin

### Konzept

Der "Speichern"-Button darf nie aus dem Viewport verschwinden.

### Implementierung

```typescript
// Wrapper mit Flex Layout
<div className="flex flex-col min-h-full">
  {/* Scrollbarer Content */}
  <div className="flex-1 space-y-4 overflow-y-auto pb-4">
    {/* Hero, Accordions, etc. */}
  </div>
  
  {/* Sticky Save Button */}
  <div className="sticky bottom-0 pt-3 pb-safe bg-gradient-to-t from-background via-background to-transparent">
    <motion.button ... />
  </div>
</div>
```

### Alternative (Falls Sheet schon scrollbar)

Falls das QuickLogSheet bereits intern scrollt, reicht ein `sticky bottom-0` mit Gradient-Overlay:

```css
.save-button-wrapper {
  position: sticky;
  bottom: 0;
  padding-top: 12px;
  background: linear-gradient(to top, var(--background) 80%, transparent);
}
```

---

## 5. Datei-Aenderungen

### WeightLogger.tsx

| Aenderung | Beschreibung |
|-----------|--------------|
| State Refactor | `detailsOpen` + `tagsOpen` → `openSection: 'details' | 'tags' | null` |
| Hero Animation | `motion.div` mit Varianten fuer Normal/Compact |
| Stepper Resize | Kleinere Buttons wenn Accordion offen |
| Sticky Save | Bottom-Position mit Gradient |

### SleepLogger.tsx

| Aenderung | Beschreibung |
|-----------|--------------|
| State Refactor | `detailsOpen` + `morningCheckOpen` → `openSection` |
| Hero Animation | `motion.div` fuer Stunden-Display |
| Quality Scale | 3 Cards → 5 runde Buttons (48px Hoehe) |
| State Type | `quality: 'low'|'med'|'high'` → `quality: number (1-5)` |
| Sticky Save | Bottom-Position |

### TrainingLogger.tsx

| Aenderung | Beschreibung |
|-----------|--------------|
| Keine Accordions | Training hat nur Auto-Expand bei Type-Selection |
| Grid Komprimierung | Optional: Grid schrumpft wenn Details sichtbar |
| Sticky Save | Bottom-Position |

---

## 6. Vollstaendiger Code: WeightLogger.tsx

```typescript
// Neuer State
type OpenSection = 'details' | 'tags' | null;
const [openSection, setOpenSection] = useState<OpenSection>(null);

const isExpanded = openSection !== null;

// Hero Varianten
const heroVariants = {
  normal: { marginTop: 24, marginBottom: 24 },
  compact: { marginTop: 8, marginBottom: 8 }
};

const numberVariants = {
  normal: { fontSize: '3.75rem' }, // text-6xl
  compact: { fontSize: '2.25rem' } // text-4xl
};

// Toggle Handler
const toggleSection = (section: OpenSection) => {
  setOpenSection(current => current === section ? null : section);
};

// JSX
<motion.div
  variants={heroVariants}
  animate={isExpanded ? 'compact' : 'normal'}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
  className="flex flex-col items-center"
>
  <motion.span
    variants={numberVariants}
    animate={isExpanded ? 'compact' : 'normal'}
    className="font-bold tabular-nums text-foreground"
  >
    {weight.toFixed(1)}
  </motion.span>
  ...
</motion.div>

// Accordion mit exklusiver Logik
<Collapsible 
  open={openSection === 'details'} 
  onOpenChange={() => toggleSection('details')}
>
  ...
</Collapsible>

<Collapsible 
  open={openSection === 'tags'} 
  onOpenChange={() => toggleSection('tags')}
>
  ...
</Collapsible>
```

---

## 7. Vollstaendiger Code: SleepLogger.tsx - Quality Scale

```typescript
// Neue Konstante (ersetzt qualityLevels)
const QUALITY_SCALE = [
  { value: 1, emoji: '😫' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '💪' },
  { value: 5, emoji: '🚀' },
];

// State aendern
const [quality, setQuality] = useState(3); // Zahl statt 'low'|'med'|'high'

// Neues UI (48px hoch)
<div className="space-y-2">
  <div className="text-sm font-medium text-muted-foreground text-center">
    Schlafqualität
  </div>
  <div className="flex justify-center gap-2">
    {QUALITY_SCALE.map((q) => (
      <motion.button
        key={q.value}
        whileTap={{ scale: 0.9 }}
        onClick={() => setQuality(q.value)}
        className={cn(
          "w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all duration-200",
          quality === q.value
            ? "bg-primary/20 ring-2 ring-primary ring-offset-2 scale-110"
            : "bg-muted hover:bg-muted/80 opacity-50"
        )}
      >
        {q.emoji}
      </motion.button>
    ))}
  </div>
</div>

// Save anpassen
sleep_quality: quality // direkt die Zahl 1-5
```

---

## 8. Zusammenfassung

| Optimierung | Platzeinsparung | UX-Verbesserung |
|-------------|-----------------|-----------------|
| Morphing Hero | ~80px wenn Accordion offen | Fokus auf Details |
| Exclusive Expand | Verhindert Scroll-Explosion | Keine Ueberwaeltigung |
| 5-Punkt Qualitaet | ~70px eingespart | Praezisere Daten |
| Sticky Save | Immer sichtbar | Kein versehentliches Scrollen |

**Ergebnis:** Das Interface "atmet" - es macht Platz wenn noetig und bleibt auf kleinen Screens bedienbar.

