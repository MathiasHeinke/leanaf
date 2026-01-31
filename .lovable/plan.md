
# Protocol Phase Card Refactoring: Via Negativa als Overlay

## Ubersicht

Die Phase-Card oben soll kompakter und fokussierter werden. Der ausfuhrliche "Via Negativa"-Intro-Block wird in ein Overlay verschoben, das nur auf Knopfdruck angezeigt wird.

---

## Aktuelle Struktur (IST)

```text
+-----------------------------------------------+
| [Phase Icons: 0  1  2  3]                     |
|                                               |
| [Phase 0: Fundament]  7/8 Checks erfüllt      |
| Via Negativa - Entferne was schadet   [===]   |
+-----------------------------------------------+

+-----------------------------------------------+
| 💀 Via Negativa: Erst entfernen, was schadet  |
|    Das Multiplikator-Prinzip                  |
|                                               |
|    0 (Lifestyle) × 10 (Rapamycin) = 0         |
|                                               |
|    "Willst du 120+ werden..."                 |
|    "Sie können ein schlechtes Fundament..."   |
+-----------------------------------------------+

+-- Checklist Items... --+
```

---

## Neue Struktur (SOLL)

```text
+-----------------------------------------------+
| [Phase Icons: 0  1  2  3]                     |
|                                               |
| Badge: [Phase 0: Fundament]     7/8           |
|                               Checks erfüllt  |
| "Erst entfernen, was schadet"                 |
|                                   [ⓘ] [===]   |
+-----------------------------------------------+

+-- Checklist Items (direkt darunter) --+
```

**Beim Klick auf ⓘ (Info-Button):**

```text
+-----------------------------------------------+
|                 OVERLAY / SHEET               |
+-----------------------------------------------+
| [X]                                           |
|                                               |
| 💀 Via Negativa                               |
|    Das Multiplikator-Prinzip der Langlebigkeit|
|                                               |
|    0 (Lifestyle) × 10 (Rapamycin) = 0         |
|                                               |
|    "Willst du 120+ werden und die beste       |
|     Version von dir selbst?..."               |
|                                               |
|    "Sie konnen ein schlechtes Fundament       |
|     nicht wegspritzen..."                     |
+-----------------------------------------------+
```

---

## Technische Umsetzung

### 1. Neue Komponente: `ViaNegativaSheet.tsx`

Eine Sheet-Komponente (Bottom-Sheet auf Mobile), die den kompletten Via Negativa Content enthalt:

```typescript
// Inhalte aus PHASE0_INTRO in lifeImpactData.ts
- title: "Via Negativa: Erst entfernen, was schadet"
- subtitle: "Das Multiplikator-Prinzip der Langlebigkeit"
- formula: "0 (Lifestyle) × 10 (Rapamycin) = 0"
- mainQuote + warningQuote
```

Verwendet die vorhandene `Sheet` UI-Komponente fur konsistentes UX (Bottom-Sheet, Close Button).

### 2. Anderung: `Protocol.tsx`

Die "Current Phase Info" Box wird erweitert um:
- Kompaktere Darstellung mit Headline + Subheadline
- Info-Button (ⓘ) rechts neben der Beschreibung
- Sheet-State (`showViaNegativa`) fur Overlay-Kontrolle

```typescript
// Neue Phase-spezifische Headlines
const PHASE_HEADLINES = {
  0: { 
    title: "Erst entfernen, was schadet",
    cta: "Das Multiplikator-Prinzip verstehen"
  },
  1: { title: "Die aggressive Transformation", cta: "Protokoll-Details" },
  2: { title: "Feinschliff fur Langlebigkeit", cta: "Advanced Settings" },
  3: { title: "Lebenslanges Maintenance", cta: "Longevity Stack" }
}
```

### 3. Anderung: `Phase0Checklist.tsx`

Entfernen der Intro-Card (Zeilen 262-290):
- Die Skull-Icon Card mit Via Negativa Text wird komplett entfernt
- `PHASE0_INTRO` Import wird in `ViaNegativaSheet` verwendet
- Checklist startet direkt mit den Check-Items

---

## Dateistruktur

| Datei | Anderung |
|-------|----------|
| `src/components/protocol/phase-0/ViaNegativaSheet.tsx` | NEU - Sheet mit Via Negativa Content |
| `src/pages/Protocol.tsx` | Phase-Info Box umbauen + Sheet State |
| `src/components/protocol/phase-0/Phase0Checklist.tsx` | Intro Card entfernen |

---

## Vorteile

1. **Cleaner UI**: Weniger vertikaler Platz fur Intro-Text, mehr Fokus auf Checkliste
2. **Konsistente UX**: Sheet-Pattern wie in anderen Teilen der App
3. **On-Demand Info**: User sehen die Philosophie nur wenn sie es wollen
4. **Mobile-optimiert**: Bottom-Sheet ist touch-freundlich
5. **Erweiterbar**: Gleiche Pattern kann fur Phase 1, 2, 3 verwendet werden

---

## Geschatzter Aufwand

15-20 Minuten fur die Umstrukturierung.
