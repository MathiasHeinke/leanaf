
# Enhanced Supplement Chip: Bearbeiten-Modus Redesign

## Zusammenfassung

Komplette Neugestaltung des Expanded-Modus im `ExpandableSupplementChip` mit drei neuen Subkomponenten und einem optimierten ARES-Prompt, der kurze, kontextbezogene Antworten liefert.

---

## Änderungsübersicht

| Komponente | Status | Beschreibung |
|------------|--------|--------------|
| `TimingCircleSelector.tsx` | **NEU** | Timing-Auswahl als Kreise (Layer 0 Design) |
| `BrandSelector.tsx` | **NEU** | Dropdown mit [Brand, Quality, Preis] |
| `SelectedProductCard.tsx` | **NEU** | Kompakte Produktkarte mit Info-Button |
| `ExpandableSupplementChip.tsx` | **ÄNDERN** | Integration + neuer ARES-Prompt |

---

## 1. TimingCircleSelector (NEU)

**Datei:** `src/components/supplements/TimingCircleSelector.tsx`

Design basiert auf `SupplementTimingCircles` von Layer 0 (Home Dashboard):

- **Layout:** Horizontale Kreisreihe
- **Timings:** Morning, Noon, Evening, Bedtime, Pre-WO, Post-WO
- **Aktiver Zustand:** Weißer Rand + Icon (ausgefüllt)
- **Inaktiver Zustand:** Grauer transparenter Rand
- **Single-Select:** Nur ein Timing gleichzeitig auswählbar

```text
┌─────────────────────────────────────────────────────────┐
│  Einnahmezeitpunkt                                      │
│                                                         │
│    ○      ○      ●      ○      ○      ○                 │
│   🌅     ☀️     🌙     🛏️     🏋️     💪                │
│  Morgens Mittags Abends Bett  Pre-WO Post-WO           │
│                    ↑                                    │
│              (ausgewählt)                               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. BrandSelector (NEU)

**Datei:** `src/components/supplements/BrandSelector.tsx`

Dropdown-Komponente für Hersteller-Auswahl:

**Features:**
- Gruppiert verfügbare Produkte nach Marke
- Zeigt pro Option: `[Marke] · [★★★★☆] · [€0.12/Tag]`
- Quality-Index basiert auf `price_tier`:
  - `luxury` → ★★★★★ (5)
  - `premium` → ★★★★☆ (4)
  - `mid` → ★★★☆☆ (3)
  - `budget` → ★★☆☆☆ (2)
- Bei mehreren Produkten pro Marke: Empfohlenes oder günstigstes anzeigen

```text
┌─────────────────────────────────────────────────────────┐
│  Hersteller wählen                                      │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ▼  Sunday Natural  ·  ★★★★☆  ·  €0.12/Tag        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Dropdown-Options:                                      │
│  ├─ MoleQlar · ★★★★★ · €0.18/Tag                       │
│  ├─ Sunday Natural · ★★★★☆ · €0.12/Tag  ✓ Empfohlen    │
│  ├─ Now Foods · ★★★☆☆ · €0.06/Tag                      │
│  └─ Bulk · ★★☆☆☆ · €0.04/Tag                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. SelectedProductCard (NEU)

**Datei:** `src/components/supplements/SelectedProductCard.tsx`

Kompakte Produktkarte nach Hersteller-Auswahl:

**Features:**
- Zeigt gewähltes Produkt: Name, Dosis, Form, Preis/Tag
- Quality-Zertifikate als kleine Badges (GMP, Vegan, Creapure)
- **"i"-Button** (Info-Circle) öffnet `SupplementDetailSheet`
- "Empfohlen"-Badge wenn `is_recommended`

```text
┌─────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────┐  │
│  │  Sunday Natural Magnesium-Glycinat            (i) │  │
│  │  ─────────────────────────────────────────────────│  │
│  │  400mg · 120 Kapseln · €0.12/Tag                  │  │
│  │                                                   │  │
│  │  🏅 GMP   🌱 Vegan   ✓ Empfohlen                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 4. ARES-Prompt Update

**Kern-Änderung:** Kurze, fokussierte Bewertung statt ausführlicher Analyse.

**Neuer Prompt-Template:**

```
QUICK CHECK: [Supplement Name] ([Hersteller])
- Dosis: [X] [Einheit]
- Timing: [Gewähltes Timing]

TASK:
1. Timing optimal für mein Ziel?
2. Interaktionen mit meinem Stack?
3. Hersteller-Qualität/Preis-Bewertung?

CONSTRAINT: Halte dich extrem kurz (max 3 Sätze). Nur auf Nachfrage tiefer!
```

**Beispiel-Antwort von ARES:**

> "Dein Magnesium-Glycinat abends ist perfekt für Schlafqualität. Nicht gleichzeitig mit dem Zink am Morgen nehmen - mindestens 4h Abstand. Sunday Natural ist solide Qualität für den Preis. 👍"

---

## 5. Kompletter Edit-Mode Flow

```text
┌─────────────────────────────────────────────────────────┐
│  💊 Magnesium bearbeiten                           [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ── Dosierung ──                                        │
│  Menge: [400    ]  Einheit: [mg ▼]                      │
│                                                         │
│  ── Einnahmezeitpunkt ──                                │
│    ○ ○ ○ ● ○ ○                                         │
│   🌅☀️🌙🛏️🏋️💪   → Abends ausgewählt                    │
│                                                         │
│  ── Hersteller ──                                       │
│  [▼ Sunday Natural · ★★★★☆ · €0.12/Tag              ]   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Sunday Natural Magnesium-Glycinat            (i) │  │
│  │  400mg · Kapseln · Vegan                          │  │
│  │  🏅 GMP  🌱 Vegan  ✓ Empfohlen    €0.12/Tag       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ── Zyklen (falls erforderlich) ──                      │
│  [5] Tage an, [2] Tage Pause                            │
│                                                         │
│  ── Notizen ──                                          │
│  [_________________________________]                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [💾 Speichern]              [ARES fragen] [🗑️]         │
└─────────────────────────────────────────────────────────┘
```

---

## Technische Details

### Props-Interfaces

**TimingCircleSelector:**
```typescript
interface TimingCircleSelectorProps {
  value: PreferredTiming;
  onChange: (timing: PreferredTiming) => void;
  size?: 'sm' | 'md';
  className?: string;
}
```

**BrandSelector:**
```typescript
interface BrandSelectorProps {
  products: SupplementProduct[];
  selectedBrandId: string | null;
  onSelect: (brandId: string, product: SupplementProduct) => void;
  loading?: boolean;
  className?: string;
}
```

**SelectedProductCard:**
```typescript
interface SelectedProductCardProps {
  product: SupplementProduct;
  supplementItem: SupplementLibraryItem | null;
  onInfoClick: () => void;
  className?: string;
}
```

### Daten-Flow

1. **Products laden:** `useSupplementProducts(item.supplement_id)` - bereits implementiert
2. **Brand-Gruppierung:** Produkte nach `brand_id` gruppieren, günstigstes/empfohlenes pro Brand
3. **State Management:** Neuer State `selectedProduct` im Chip
4. **ARES Navigation:** `navigate('/coach/ares', { state: { autoStartPrompt: prompt } })`

### Entfernte Elemente

- **Pill-Buttons** für Timing → ersetzt durch Timing-Kreise
- **Produkt-Liste** (5 inline Karten) → ersetzt durch Dropdown + Einzelkarte
- **Impact Score Badge** → bleibt unverändert (gut für Kontext)

---

## Dateien die erstellt/geändert werden

| Datei | Aktion | LOC (ca.) |
|-------|--------|-----------|
| `src/components/supplements/TimingCircleSelector.tsx` | NEU | ~120 |
| `src/components/supplements/BrandSelector.tsx` | NEU | ~100 |
| `src/components/supplements/SelectedProductCard.tsx` | NEU | ~80 |
| `src/components/supplements/ExpandableSupplementChip.tsx` | ÄNDERN | ~50 Zeilen geändert |

---

## Erwartetes Ergebnis

- **Visuelle Konsistenz:** Layer 3 Edit-Mode nutzt dasselbe Timing-Design wie Layer 0 Dashboard
- **Professionelles UX:** Supplement-Konfiguration fühlt sich an wie "Stack programmieren"
- **Smarte ARES-Integration:** Kurze, knackige Antworten die Kompetenz zeigen
- **Elefantengedächtnis-Synergie:** ARES kennt den Stack und gibt relevante Querverbindungen
