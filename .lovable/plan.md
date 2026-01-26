

# ARES Chat Header Cleanup - Legacy Collapse-System entfernen

## Problem-Analyse

Der ARES Chat im ChatOverlay zeigt aktuell zwei Header-Systeme:

```text
┌─────────────────────────────────────────┐
│ ChatOverlay Header (NEU - korrekt)      │  ← Avatar + "ARES" + ChevronDown
├─────────────────────────────────────────┤
│ CollapsibleCoachHeader (ALT - obsolet)  │  ← ArrowLeft + Avatar + Info/Clock/Trash
│    └── Collapse-Chevron Button          │  ← Trigger für Collapse-Animation
├─────────────────────────────────────────┤
│ paddingTop = var(--coach-banner-height) │  ← Extra Space wegen Collapsed-State
├─────────────────────────────────────────┤
│            Chat Messages                │
└─────────────────────────────────────────┘
```

**Was im Screenshot zu sehen ist:**
- Der Header startet tiefer als nötig (weil `paddingTop` für Banner reserviert wird)
- Der kleine Chevron-Pfeil in der Mitte triggert das Einklappen
- Der Zurück-Pfeil (ArrowLeft) links oben navigiert zu `/`, ist aber im Overlay-Kontext sinnlos

---

## Lösung: Legacy-System entfernen

### Datei 1: `src/components/ares/AresChat.tsx`

**Änderungen:**

1. **`bannerCollapsed` State entfernen** (Zeile 251)
   - Nicht mehr benötigt

2. **`CollapsibleCoachHeader` entfernen** (Zeile 518-528)
   - Import entfernen (Zeile 18)
   - Komponenten-Aufruf entfernen

3. **`ChatLayout` Props vereinfachen** (Zeile 514-516)
   - `bannerCollapsed={bannerCollapsed}` entfernen
   - Nur noch `chatInput` übergeben

---

### Datei 2: `src/components/layouts/ChatLayout.tsx`

**Änderungen:**

1. **`bannerCollapsed` Prop entfernen** (Zeile 8)
   - Interface bereinigen

2. **Dynamisches `paddingTop` entfernen** (Zeile 27-29)
   - Kein `var(--coach-banner-height)` mehr nötig
   - Stattdessen festes kleines Padding (`pt-2` oder `pt-4`)

**Vorher:**
```typescript
style={{ 
  paddingTop: bannerCollapsed ? '8px' : 'var(--coach-banner-height)',
  pointerEvents: 'auto' 
}}
```

**Nachher:**
```typescript
className="flex-1 min-h-0 flex flex-col px-4 pt-2 ..."
// Kein dynamisches style mehr
```

---

### Datei 3: `src/components/home/ChatOverlay.tsx`

**Prüfen:** Keine Änderungen nötig - der Header hier ist bereits korrekt aufgebaut.

---

## Visuelles Ergebnis

```text
┌─────────────────────────────────────────┐
│ ChatOverlay Header                      │  ← Avatar + "ARES" + ChevronDown (Close)
├─────────────────────────────────────────┤
│            Chat Messages                │  ← Direkt unter dem Header, kein Extra-Space
│                                         │
│                                         │
├─────────────────────────────────────────┤
│            Chat Input                   │
└─────────────────────────────────────────┘
```

---

## Zusammenfassung der Änderungen

| Datei | Entfernen | Ändern |
|-------|-----------|--------|
| `AresChat.tsx` | `bannerCollapsed` State | - |
| `AresChat.tsx` | `CollapsibleCoachHeader` Import + Nutzung | - |
| `AresChat.tsx` | `onCollapseChange` Callback | - |
| `ChatLayout.tsx` | `bannerCollapsed` Prop | `paddingTop` zu festem `pt-2` |

---

## Was bleibt erhalten

- **ChatOverlay Header**: Bleibt unverändert (korrekt)
- **Info/Clock/Trash Buttons**: Werden mit CollapsibleCoachHeader entfernt - falls diese Funktionen benötigt werden, müssten sie in ChatOverlay integriert werden
- **DailyReset**: Die `handleDailyReset` Funktion bleibt in AresChat, aber muss neu getriggert werden (z.B. über das Trash-Icon im ChatOverlay Header)

---

## Optionale Erweiterung: Aktionen in ChatOverlay

Falls die Funktionen aus dem alten Header noch benötigt werden:

| Funktion | Aktueller Ort | Neuer Ort |
|----------|---------------|-----------|
| Coach Info | CollapsibleCoachHeader | ChatOverlay Header (Info-Icon) |
| Chat History | CollapsibleCoachHeader | Nicht im Overlay benötigt |
| Daily Reset | CollapsibleCoachHeader | ChatOverlay Header (Trash-Icon) |

Das wäre ein optionaler nächster Schritt, falls gewünscht.

---

## Technische Details

**Warum war `var(--coach-banner-height)` ursprünglich da?**
- Die ChatLayout wurde für den Fullscreen-Chat (`/coach/ares`) entwickelt
- Dort war der CollapsibleCoachHeader eine fixed-position Komponente
- Das ChatLayout musste darunter beginnen

**Warum brauchen wir das im Overlay nicht mehr?**
- ChatOverlay hat seinen eigenen Header (flex-none, Teil des Layouts)
- AresChat sitzt direkt darunter ohne Position-Tricks
- Kein Collapse-Mechanismus = kein dynamisches Padding

