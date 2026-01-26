

# SleepLogger: Kompaktes Grid-Layout für Morgen-Check

## Problem

Das "Morgen-Check" Accordion ist zu hoch. Bei geöffnetem Accordion wird "Motivation" vom Sticky Save-Button verdeckt.

```text
AKTUELL (Zeilen 258-300):                 NACHHER:
┌─────────────────────────────┐          ┌─────────────────────────────┐
│ Bildschirmzeit              │          │ Bildschirmzeit              │
│ [────────●────────] 30 min  │          │ [────────●────────] 30 min  │
├─────────────────────────────┤          ├──────────────┬──────────────┤
│ Libido am Morgen            │          │ Libido       │ Motivation   │
│ 😴  😐  😊  😍  🔥          │  ~70px   │ 😴😐😊😍🔥  │ 😫😕😐💪🚀  │ ~50px
├─────────────────────────────┤          │              │              │
│ Motivation                  │          └──────────────┴──────────────┘
│ 😫  😕  😐  💪  🚀          │  ~70px
└─────────────────────────────┘

Gesamt: ~200px                            Gesamt: ~110px (90px gespart!)
```

---

## Änderungen an SleepLogger.tsx

### 1. Screen Time Slider - Margin reduzieren (Zeile 244)

```typescript
// VORHER:
<div>
  <div className="flex justify-between mb-2">

// NACHHER:
<div className="mb-3">  // Reduzierter Abstand zum Grid
  <div className="flex justify-between mb-1.5">
```

### 2. Grid Layout für Libido + Motivation (Zeilen 258-300)

**VORHER** (2 separate `<div>` Blöcke vertikal):
```typescript
{/* Libido Scale */}
<div>
  <div className="text-sm mb-2">Libido am Morgen</div>
  <div className="flex gap-2 justify-center">
    {LIBIDO_SCALE.map((l) => (
      <motion.button className="w-10 h-10 ..." />
    ))}
  </div>
</div>

{/* Motivation Scale */}
<div>
  <div className="text-sm mb-2">Motivation</div>
  <div className="flex gap-2 justify-center">
    {MOTIVATION_SCALE.map((m) => (
      <motion.button className="w-10 h-10 ..." />
    ))}
  </div>
</div>
```

**NACHHER** (2-Spalten Grid):
```typescript
{/* Libido & Motivation Grid */}
<div className="grid grid-cols-2 gap-4">
  {/* Libido - Links */}
  <div>
    <div className="text-xs text-muted-foreground mb-1.5 text-center">Libido</div>
    <div className="flex gap-1 justify-center flex-wrap">
      {LIBIDO_SCALE.map((l) => (
        <motion.button
          key={l.value}
          whileTap={{ scale: 0.9 }}
          onClick={() => setLibido(l.value)}
          className={cn(
            "w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-colors",
            libido === l.value
              ? "bg-primary/20 ring-2 ring-primary"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          {l.emoji}
        </motion.button>
      ))}
    </div>
  </div>

  {/* Motivation - Rechts */}
  <div>
    <div className="text-xs text-muted-foreground mb-1.5 text-center">Motivation</div>
    <div className="flex gap-1 justify-center flex-wrap">
      {MOTIVATION_SCALE.map((m) => (
        <motion.button
          key={m.value}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMotivation(m.value)}
          className={cn(
            "w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-colors",
            motivation === m.value
              ? "bg-primary/20 ring-2 ring-primary"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          {m.emoji}
        </motion.button>
      ))}
    </div>
  </div>
</div>
```

### 3. Safety Padding für Scrollable Container (Zeile 111)

```typescript
// VORHER:
<div className="flex-1 space-y-4 overflow-y-auto">

// NACHHER:
<div className="flex-1 space-y-4 overflow-y-auto pb-24">
```

---

## Zusammenfassung der Änderungen

| Bereich | Änderung | Zeilen |
|---------|----------|--------|
| **Scrollable Container** | `pb-24` hinzufügen | 111 |
| **Screen Time** | `mb-2` → `mb-1.5`, wrapper `mb-3` | 244-246 |
| **Libido + Motivation** | Vertikales Stack → `grid grid-cols-2` | 258-300 |
| **Buttons** | `w-10 h-10` → `w-9 h-9` | 268, 289 |
| **Labels** | `text-sm` → `text-xs`, zentriert | 260, 282 |
| **Button Gap** | `gap-2` → `gap-1` + `flex-wrap` | 261, 283 |

---

## Visuelles Ergebnis

```text
┌─────────────────────────────────────┐
│          ═══ Drag ═══               │
│                                     │
│            7.5h                     │  ← Morphing Hero
│         Schlafdauer                 │
│                                     │
│  [──────────●──────────]            │  ← Slider
│  3h                    12h          │
│                                     │
│   😫  😕  😐  💪  🚀               │  ← Quality (5-Point)
│           Okay                      │
│                                     │
│  ▷ Schlaf-Details                   │
│                                     │
│  ▼ Morgen-Check                     │  ← OFFEN
│  ┌─────────────────────────────┐    │
│  │ Bildschirmzeit    [30 min]  │    │
│  │ [──────●──────]             │    │
│  ├──────────────┬──────────────┤    │
│  │   Libido     │  Motivation  │    │  ← GRID (2 Spalten)
│  │  😴😐😊😍🔥  │  😫😕😐💪🚀  │    │
│  └──────────────┴──────────────┘    │
│                                     │
│                                     │  ← pb-24 Safety Space
│                                     │
├─────────────────────────────────────┤
│        [✓ Schlaf speichern]         │  ← Sticky, nie überlappt
└─────────────────────────────────────┘
```

---

## Technische Details

| Optimierung | Platzeinsparung |
|-------------|-----------------|
| Grid statt Stack | ~90px |
| Kleinere Buttons (36px statt 40px) | ~8px |
| Reduzierte Margins | ~10px |
| **Gesamt** | **~108px** |

**Ergebnis**: Das "Morgen-Check" Accordion ist nun kompakt genug, dass alle Elemente sichtbar sind ohne vom Save-Button verdeckt zu werden.

