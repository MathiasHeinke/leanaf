
# Fix: Liquid Carousel - Z-Index & Centering

## Die beiden Probleme

### Problem 1: Z-Index Stacking
Der Backdrop und Gradient des Carousels (`z-40`) überdecken die Dock-Buttons (`z-30`). Die Buttons müssen **immer sichtbar** und klickbar bleiben.

```text
AKTUELL (Fehlerhaft):
┌────────────────────────────────┐
│  Carousel Container   z-50    │ ← Höchste Ebene
├────────────────────────────────┤
│  Gradient + Backdrop  z-40    │ ← Verdeckt Dock!
├────────────────────────────────┤
│  Dock Buttons        z-30    │ ← Wird verdeckt
└────────────────────────────────┘

KORRIGIERT:
┌────────────────────────────────┐
│  Dock Buttons        z-50    │ ← Höchste Ebene (immer sichtbar)
├────────────────────────────────┤
│  Carousel Items      z-40    │ ← Darunter
├────────────────────────────────┤
│  Gradient Backdrop   z-30    │ ← Nur visueller Effekt
└────────────────────────────────┘
```

### Problem 2: First/Last Item Centering
Mit `paddingLeft: '40%'` kann das erste Element nicht exakt in die Bildschirmmitte scrollen. 

**Lösung**: Dynamisches Padding basierend auf Viewport-Breite und Item-Breite.

```text
Formel: padding = 50vw - (itemWidth / 2)
Bei w-16 (64px): padding = calc(50vw - 32px)
```

---

## Technische Umsetzung

### 1. LiquidDock.tsx - Z-Index erhöhen

```typescript
// VORHER (Zeile 61):
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">

// NACHHER:
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
```

### 2. LiquidCarouselMenu.tsx - Z-Index Hierarchie korrigieren

```typescript
// Backdrop (Click to close) - Niedrigster Layer
<motion.div className="fixed inset-0 z-20" ... />  // War z-40

// Gradient Mask - Visueller Layer
<motion.div className="fixed ... z-30 pointer-events-none" ... />  // War z-40

// Carousel Container - Interaktiver Layer (aber unter Dock)
<motion.div className="fixed bottom-28 left-0 right-0 z-40" ... />  // War z-50
```

### 3. LiquidCarouselMenu.tsx - Center Snap Fix

```typescript
// VORHER (Zeilen 197-200):
style={{ 
  paddingLeft: '40%', 
  paddingRight: '40%' 
}}

// NACHHER - Exakte Zentrierung:
style={{ 
  paddingLeft: 'calc(50vw - 32px)',   // 50% viewport - halbe Item-Breite
  paddingRight: 'calc(50vw - 32px)' 
}}
```

### 4. Scroll-Handler Logik anpassen

```typescript
// VORHER (Zeile 128):
const centerPoint = scrollPosition + (containerWidth * 0.4);

// NACHHER - Viewport-Center:
const centerPoint = scrollPosition + (containerWidth / 2);
```

---

## Zusammenfassung der Änderungen

| Datei | Zeile | Was | Vorher | Nachher |
|-------|-------|-----|--------|---------|
| `LiquidDock.tsx` | 61 | Dock z-index | `z-30` | `z-50` |
| `LiquidCarouselMenu.tsx` | 164 | Backdrop z-index | `z-40` | `z-20` |
| `LiquidCarouselMenu.tsx` | 178 | Gradient z-index | `z-40` | `z-30` |
| `LiquidCarouselMenu.tsx` | 190 | Carousel z-index | `z-50` | `z-40` |
| `LiquidCarouselMenu.tsx` | 197-200 | Padding | `40%` | `calc(50vw - 32px)` |
| `LiquidCarouselMenu.tsx` | 128 | Center calculation | `* 0.4` | `/ 2` |

---

## Visuelles Ergebnis

```text
VORHER:                          NACHHER:
┌─────────────────────┐          ┌─────────────────────┐
│                     │          │                     │
│   ◌  ◌  ●  ◌  ◌    │          │   ◌  ◌  ●  ◌  ◌    │
│   ↑ Kann nicht      │          │   ↑ Jedes Item kann │
│     links scrollen  │          │     zentriert werden│
│                     │          │                     │
│  ████████████████   │ ← Deckt  │  ████████████████   │
│  [🍴] [⚔️] [+]      │   ab!    │                     │
│                     │          │  [🍴] [⚔️] [+]      │ ← Immer sichtbar!
└─────────────────────┘          └─────────────────────┘
```

---

## Dateien

| Datei | Änderungen |
|-------|------------|
| `src/components/home/LiquidDock.tsx` | Z-Index von `z-30` auf `z-50` |
| `src/components/home/LiquidCarouselMenu.tsx` | Z-Index Hierarchie + Padding-Fix |
