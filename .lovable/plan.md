

# ARES Protokoll Widget - Flat View + Reihenfolge

## Uebersicht

Basierend auf dem Screenshot soll:
1. Das ARES Protokoll Widget eine flache, horizontale Variante bekommen (wie das Wasser-Widget)
2. Das Protokoll Widget an erster Stelle stehen, Ernaehrung darunter
3. Die neue "flat" Groesse im Widget-Editor auswaehlbar sein

---

## Aenderungen

### 1. ProtocolWidget.tsx - Neue "flat" Variante

Die neue "flat"-Ansicht folgt dem Design des HydrationWidget:

```text
┌──────────────────────────────────────────────────────────────┐
│  [Brain]  ARES Protokoll               Phase 0    5/9  ▸   │
│  ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
└──────────────────────────────────────────────────────────────┘
```

**Eigenschaften:**
- Volle Breite (col-span-2)
- Minimale Hoehe (~60px wie Wasser)
- Hintergrund-Fill-Effekt basierend auf Progress (56% = halbe Fuellung)
- Icon links, Text Mitte, Progress rechts
- Progress-Balken unten integriert (subtil)
- Klick navigiert zu `/protocol`

**Implementierung in ProtocolWidget.tsx:**

Neuer Block VOR dem "large/wide" Check:

```typescript
// FLAT: Horizontaler kompakter Streifen
if (size === 'flat') {
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/protocol')}
      className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-primary/20 rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden"
    >
      {/* Background Fill basierend auf Fortschritt */}
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${protocolPercent}%` }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5"
      />
      
      {/* Icon */}
      <div className="relative z-10 p-2 rounded-xl bg-primary/20 text-primary">
        <Brain className="w-5 h-5" />
      </div>
      
      {/* Text */}
      <div className="relative z-10 flex-1">
        <span className="text-sm font-medium text-foreground">ARES Protokoll</span>
        <span className="ml-2 text-xs text-muted-foreground">Phase {protocolPhase}</span>
      </div>
      
      {/* Progress Counter + Chevron */}
      <div className="relative z-10 flex items-center gap-2">
        <span className="text-sm font-bold text-primary">{progress}/9</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
}
```

---

### 2. src/types/widgets.ts - Definition aktualisieren

**Protocol Widget Definition (Zeile 52-59):**

```typescript
// VORHER
{ 
  type: 'protocol', 
  label: 'ARES Protokoll', 
  description: 'Phase & Fortschritt', 
  availableSizes: ['small', 'medium', 'large', 'wide'],  // <- kein 'flat'
  defaultSize: 'medium', 
  icon: Brain 
},

// NACHHER
{ 
  type: 'protocol', 
  label: 'ARES Protokoll', 
  description: 'Phase & Fortschritt', 
  availableSizes: ['small', 'medium', 'large', 'wide', 'flat'],  // <- 'flat' hinzu
  defaultSize: 'flat',  // <- Default auf flat
  icon: Brain 
},
```

---

### 3. src/types/widgets.ts - Reihenfolge aendern

**DEFAULT_WIDGETS Array (Zeile 111-121):**

```typescript
// VORHER: nutrition (order 0), hydration (1), protocol (2)
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: '1', type: 'nutrition', size: 'wide', enabled: true, order: 0 },
  { id: '2', type: 'hydration', size: 'flat', enabled: true, order: 1 },
  { id: '3', type: 'protocol', size: 'medium', enabled: true, order: 2 },
  // ...
];

// NACHHER: protocol (order 0), nutrition (1), hydration (2)
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: '3', type: 'protocol', size: 'flat', enabled: true, order: 0 },   // <- Erste Stelle, flat
  { id: '1', type: 'nutrition', size: 'wide', enabled: true, order: 1 },  // <- Zweite Stelle
  { id: '2', type: 'hydration', size: 'flat', enabled: true, order: 2 },  // <- Dritte Stelle
  { id: '4', type: 'training', size: 'medium', enabled: true, order: 3 },
  { id: '5', type: 'sleep', size: 'medium', enabled: true, order: 4 },
  { id: '6', type: 'weight', size: 'small', enabled: true, order: 5 },
  { id: '7', type: 'hrv', size: 'small', enabled: false, order: 6 },
  { id: '8', type: 'supplements', size: 'small', enabled: false, order: 7 },
  { id: '9', type: 'bio_age', size: 'small', enabled: false, order: 8 },
];
```

---

## Visuelles Ergebnis

Nach der Aenderung sieht das Dashboard so aus:

```text
┌─────────────────────────────────────────────────────┐
│ LIVE METRIKEN                                       │
├─────────────────────────────────────────────────────┤
│ [Brain] ARES Protokoll  Phase 0       5/9  ▸       │  <- NEU: Flat Protocol (oben)
│ ████████████████████████░░░░░░░░░░░░░░░░░░         │
├─────────────────────────────────────────────────────┤
│ [Fork] Ernaehrung                   0/1963 kcal    │  <- Nutrition (darunter)
│ Protein ████████████████████░░░░░░░░    0/245g     │
│ Carbs   ████████████████████░░░░░░░░    0/98g      │
│ Fett    ████████████████████░░░░░░░░    0/65g      │
├─────────────────────────────────────────────────────┤
│ [Drop] Wasser                       0.0L / 4.0L    │  <- Hydration
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
└─────────────────────────────────────────────────────┘
```

---

## Wichtig: Bestehende User

Fuer User die bereits Widget-Preferences gespeichert haben:
- Die `ensureAllWidgets` Funktion in `useWidgetConfig.ts` fuegt automatisch fehlende Widgets hinzu
- Bestehende Reihenfolgen bleiben erhalten (nur neue Installationen bekommen die neue Default-Reihenfolge)
- User koennen im Widget-Editor die "Flat"-Groesse fuer das Protocol Widget manuell auswaehlen

---

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/widgets/ProtocolWidget.tsx` | Neue "flat" Variante hinzufuegen |
| `src/types/widgets.ts` | `availableSizes` + Default-Reihenfolge aendern |

