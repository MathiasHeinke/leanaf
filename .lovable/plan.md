
# Fix: ARES Chat am unteren Rand abgeschnitten

## Problem-Diagnose

Das Chat-Interface wird am unteren Rand abgeschnitten. Die Buttons (Vorschläge, Upload, Mikrofon, Senden) sind kaum bedienbar. Dies betrifft:
- **ChatOverlay** (Layer 2 Sheet auf der Home-Seite)
- **Fullscreen Chat** (auf `/coach/ares`)

### Ursache 1: ChatOverlay
```jsx
// Zeile 242-243
animate={{ y: "5%" }}  // Schiebt das Sheet 5% nach unten

// Zeile 250  
className="fixed inset-x-0 bottom-0 top-0"  // 100vh Höhe
```
Das Sheet ist 100vh hoch und wird 5% nach unten verschoben → **5% des unteren Inhalts werden abgeschnitten**.

### Ursache 2: Mobile Safe Areas
Auf iOS/Android gibt es System-Bars (Home Indicator, Navigation Bar), die nicht berücksichtigt werden.

---

## Lösung

### Schritt 1: ChatOverlay korrigieren

**Datei:** `src/components/home/ChatOverlay.tsx`

Ändern der Sheet-Höhe von `100vh` auf `95vh`, damit es mit dem `y: 5%` Offset korrekt passt:

```jsx
// Vorher (Zeile 250):
className="fixed inset-x-0 bottom-0 top-0 z-[51] ..."

// Nachher:
className="fixed inset-x-0 bottom-0 z-[51] ..."
// + explizite Höhe statt top-0
style={{ height: "95vh" }}
```

Alternativ bessere Lösung: Das `top-0` durch `top-[5%]` ersetzen, damit sich die Animation neutral verhält.

### Schritt 2: Safe Area Insets hinzufügen

Für Mobile-Geräte brauchen wir `pb-safe` (Tailwind Plugin) oder CSS Environment Variables:

**Datei:** `src/components/EnhancedChatInput.tsx` (Button Row)

```jsx
// Zeile 198 - Button Row
<div className="input-bar flex items-center justify-between px-4 py-2 pb-[env(safe-area-inset-bottom,8px)] border-t border-border/50">
```

**Datei:** `src/components/ares/AresChat.tsx` (Embedded Input)

```jsx
// Zeile 615 - Embedded Mode Input
<div className="flex-none border-t border-border/30 bg-background/95 backdrop-blur-md px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
```

### Schritt 3: ChatLayout Safe Areas

**Datei:** `src/components/layouts/ChatLayout.tsx`

```jsx
// Zeile 31-41 - Footer Zone
<div className="flex-none z-10 bg-background/95 backdrop-blur-md border-t border-border/30 pb-[env(safe-area-inset-bottom)]">
```

---

## Technische Details

| Komponente | Änderung | Effekt |
|------------|----------|--------|
| ChatOverlay | `top-0` → `top-[5%]` | Sheet hat 95vh und passt zum y-Offset |
| EnhancedChatInput | `pb-[env(safe-area-inset-bottom,8px)]` | Berücksichtigt iOS Home Indicator |
| AresChat (embedded) | `pb-[max(12px,env(safe-area-inset-bottom))]` | Mindest-Padding + Safe Area |
| ChatLayout | `pb-[env(safe-area-inset-bottom)]` | Fullscreen-Modus Safe Area |

---

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| Buttons am unteren Rand abgeschnitten | Buttons vollständig sichtbar |
| iOS Home Indicator überdeckt Input | Respektiert Safe Area Insets |
| Chat kaum bedienbar auf Mobile | Native-feeling Touch-Targets |
