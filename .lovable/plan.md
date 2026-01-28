
# Plan: 4-Schritt Supplement-Auswahl Flow

## Ziel
Strukturierte Auswahl: Tier -> Basis-Supplement -> Form/Variante -> Hersteller

## Flow-Design

```text
SCHRITT 1: Tier-Tabs
+--------------------------------------------------+
| [Essential]   [Optimizer]   [Specialist]         |
+--------------------------------------------------+

SCHRITT 2: Basis-Supplement (gruppiert)
+--------------------------------------------------+
| Magnesium                                    [>] |
| Omega-3                                      [>] |
| Vitamin D                                    [>] |
| Creatine                                     [>] |
+--------------------------------------------------+

SCHRITT 3: Form/Variante (erscheint nach Basis-Auswahl)
+--------------------------------------------------+
| Magnesium Glycinat           (Impact: 9.5)       |
| Magnesiumcitrat              (Impact: 5.0)       |
| Magnesium Komplex            (Impact: 5.0)       |
+--------------------------------------------------+

SCHRITT 4: Hersteller/Produkt
+--------------------------------------------------+
| Sunday Natural - 400mg Glycinat                  |
| MoleQlar - 500mg Bisglycinat                     |
| + Eigenes Produkt                                |
+--------------------------------------------------+
             ↓ (Auto-Fill)
| Dosierung: [400]     Einheit: [mg]               |
+--------------------------------------------------+
```

## Technische Umsetzung

### 1. Neue Hilfsfunktionen in `src/lib/supplementDeduplication.ts`

**A) Basis-Namen extrahieren:**
```typescript
function extractBaseName(name: string): string {
  // "Magnesium Glycinat" -> "Magnesium"
  // "Omega-3 (EPA/DHA)" -> "Omega-3"
  // "Vitamin D3" -> "Vitamin D"
  const patterns = [
    /^(Magnesium)/i,
    /^(Omega-3)/i,
    /^(Vitamin [A-Z])/i,
    /^(Creatine?)/i,
    /^(Ashwagandha)/i,
    /^(Curcumin)/i,
    /^(Kollagen)/i,
    /^(Probiotika?)/i,
    /^(NMN)/i,
    /^(CoQ10)/i,
    /^(HMB)/i,
    /^(Eisen)/i,
  ];
  // Fallback: erstes Wort
}
```

**B) Gruppierung nach Basis:**
```typescript
function groupByBaseName(items: SupplementLibraryItem[]): Map<string, SupplementLibraryItem[]>
```

**C) Varianten-Name extrahieren:**
```typescript
function getVariantName(fullName: string, baseName: string): string
// "Magnesium Glycinat" mit base "Magnesium" -> "Glycinat"
// Falls gleich -> "Standard"
```

### 2. Aenderungen in `SupplementTrackingModal.tsx`

**State erweitern:**
```typescript
const [selectedTier, setSelectedTier] = useState<NecessityTier>('essential');
const [selectedBase, setSelectedBase] = useState<string | null>(null);
const [selectedVariant, setSelectedVariant] = useState<SupplementLibraryItem | null>(null);
const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
```

**UI-Komponenten:**
1. Tier-Tabs oben (Essential/Optimizer/Specialist)
2. Basis-Liste (gruppiert, nur eindeutige Basis-Namen)
3. Varianten-Dropdown (erscheint nach Basis-Auswahl)
4. Hersteller-Dropdown (erscheint nach Varianten-Auswahl)
5. Auto-Fill bei Produkt-Auswahl

**Navigation:**
- Zurueck-Button um Schritt zurueck zu gehen
- Breadcrumb-Anzeige: "Essential > Magnesium > Glycinat"

### 3. Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/lib/supplementDeduplication.ts` | Basis-Extraktion, Gruppierung, Varianten-Logik |
| `src/components/SupplementTrackingModal.tsx` | 4-Schritt UI Flow mit States |

## Beispiel-Flow

1. User oeffnet Modal, sieht Tier-Tabs
2. Waehlt "Essential" Tab
3. Sieht: Magnesium, Omega-3, Vitamin D3, Creatine, Elektrolyte...
4. Klickt "Magnesium"
5. Sieht Varianten: Glycinat (9.5), Citrat (5.0), Komplex (5.0)
6. Waehlt "Glycinat"
7. Sieht Hersteller: Sunday Natural, MoleQlar, + Eigenes
8. Waehlt "Sunday Natural" -> Dosierung auto-filled
9. Bestaetigt -> Supplement hinzugefuegt

## Edge Cases

- Supplements ohne Varianten (z.B. "Creatine Monohydrat" einzige Form) -> Varianten-Schritt ueberspringen
- Keine Produkte in DB -> "Eigenes Produkt" als einzige Option
- "Eigenes Produkt" gewaehlt -> manuelle Eingabe wie bisher
