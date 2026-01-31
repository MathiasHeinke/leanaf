
# Bug-Fix: Supplement Detail Sheet schneidet Inhalt ab

## Problem

Das Sheet zeigt den Inhalt ab "Blutwert-basierte Empfehlung" nicht mehr an - **kein Scrollen möglich**.

**Ursache:** Der innere Container hat `overflow-y-auto`, aber **keine definierte Höhe**. CSS-Regel: `overflow: auto` funktioniert nur mit einer Höhenbegrenzung.

**Aktuelles Layout:**
```
SheetContent (h-[85vh], p-6)
├── SheetHeader (pb-4) ← Feste Höhe
└── div (overflow-y-auto) ← KEINE Höhenbegrenzung → kein Scroll!
    └── Inhalt wird abgeschnitten
```

---

## Lösung

Flexbox-basiertes Layout mit `flex-1 min-h-0` für den scrollbaren Bereich:

**Datei:** `src/components/supplements/SupplementDetailSheet.tsx`

### Änderung 1: SheetContent als Flex-Container

**Zeile 78** - Klasse hinzufügen:

```typescript
// Vorher:
<SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">

// Nachher:
<SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
```

### Änderung 2: Scrollbarer Container mit Flex-1

**Zeile 98** - Klasse anpassen:

```typescript
// Vorher:
<div className="space-y-5 overflow-y-auto pb-8">

// Nachher:
<div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-8">
```

---

## Technischer Hintergrund

| CSS-Eigenschaft | Funktion |
|-----------------|----------|
| `flex flex-col` | SheetContent wird vertikaler Flex-Container |
| `flex-1` | Scrollbarer Bereich füllt verbleibenden Platz |
| `min-h-0` | Überschreibt `min-height: auto` (Flexbox-Default), erlaubt Schrumpfen |
| `overflow-y-auto` | Aktiviert vertikalen Scroll bei Überlauf |

---

## Erwartetes Ergebnis

Nach dem Fix:
- Gesamter Inhalt ist scrollbar
- "Blutwert-basierte Empfehlung", Goals, Peptide-Synergien etc. sind erreichbar
- Header bleibt fixiert während des Scrollens
