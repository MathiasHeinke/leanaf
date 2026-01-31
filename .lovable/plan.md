
# Wirkstoff-First Selection: Deduplizierung & 2-Schritt-Auswahl

## Problem

Aktuell zeigt die Supplement-Liste **beides** als separate Einträge:
- `CaAKG` (generischer Wirkstoff ohne Produkte)
- `Ca-AKG (Rejuvant)` (mit MoleQlar-Produkten verknüpft)

Das führt zu Verwirrung und doppelten Einträgen im User-Stack.

**Datenbank-Befund:**
- 111 Einträge in `supplement_database`
- Nur 78 davon haben verknüpfte Produkte in `supplement_products`
- 33 "Orphan"-Einträge ohne Produktverknüpfung (oft Duplikate oder generische Namen)

---

## Lösungsansatz: Zweistufige Auswahl

**Flow-Änderung:**

```text
VORHER (flach):
┌─────────────────────────────────────┐
│ [x] CaAKG                    8.5    │
│ [x] Ca-AKG (Rejuvant)        8.5    │  ← Duplikat!
│ [x] Magnesium                9.5    │
│ [x] Magnesium Glycinat       9.5    │  ← Duplikat!
└─────────────────────────────────────┘

NACHHER (gruppiert):
┌─────────────────────────────────────┐
│ Ca-AKG                       8.5    │
│   → MoleQlar Pulver   €0.45/Tag     │
│   → MoleQlar Kapseln  €0.52/Tag     │
│                                     │
│ Magnesium                    9.5    │
│   → Glycinat (Sunday)  €0.12/Tag    │
│   → Citrat (Nature Love) €0.08/Tag  │
└─────────────────────────────────────┘
```

---

## Technische Umsetzung

### Phase 1: Datenbereinigung (SQL)

Zuerst: Duplikate in der Datenbank konsolidieren.

**Beispiel Ca-AKG:**
```sql
-- 1. Alle Produkte auf den "richtigen" Wirkstoff umhängen
UPDATE supplement_products
SET supplement_id = '9e141771-56fa-497b-a437-4c55fb2c7ec1'  -- Ca-AKG (Rejuvant)
WHERE supplement_id = '977958a3-7867-4dcf-9319-36d01d776f81'; -- CaAKG

-- 2. Duplikat-Wirkstoff umbenennen/deaktivieren
UPDATE supplement_database
SET name = 'Ca-AKG'
WHERE id = '9e141771-56fa-497b-a437-4c55fb2c7ec1';

-- 3. Orphan löschen (oder soft-delete)
DELETE FROM supplement_database
WHERE id = '977958a3-7867-4dcf-9319-36d01d776f81';
```

**Systematische Duplikat-Analyse nötig** für alle 111 Einträge.

### Phase 2: Frontend-Gruppierung aktivieren

Die Utility `src/lib/supplementDeduplication.ts` existiert bereits, wird aber **nicht genutzt**!

**Änderung in `useDynamicallySortedSupplements.ts`:**

```typescript
import { groupByBaseName, getUniqueBaseNames } from '@/lib/supplementDeduplication';

// Nach dem Scoring: Gruppieren nach Base-Name
const baseGroups = getUniqueBaseNames(scoredItems);

// Statt flache Liste: Gruppierte Struktur zurückgeben
return {
  groups: baseGroups,  // { baseName, variants[], topScore }
  ...
};
```

### Phase 3: UI-Komponente für gruppierte Anzeige

**Neue/Angepasste Komponente: `SupplementGroupRow`**

```typescript
interface SupplementGroupRowProps {
  baseName: string;           // z.B. "Magnesium"
  variants: ScoredSupplementItem[];  // Glycinat, Citrat, etc.
  topScore: number;
  isAnyActive: boolean;
  onSelectVariant: (item: ScoredSupplementItem) => void;
}
```

**Interaktion:**
1. User sieht gruppierte Base-Namen mit Top-Score
2. Klick expandiert die Gruppe → zeigt Varianten
3. User wählt spezifische Variante
4. Nach Auswahl → Produkt-Selektion (wie bereits in ExpandableChip)

### Phase 4: SupplementInventory anpassen

```typescript
// Statt:
filteredSupplements.map((item) => (
  <SupplementToggleRow key={item.id} item={item} ... />
))

// Neu:
baseNameGroups.map((group) => (
  <SupplementGroupRow
    key={group.baseName}
    baseName={group.baseName}
    variants={group.variants}
    topScore={group.topScore}
    isAnyActive={group.variants.some(v => activeIds.has(v.id))}
    ...
  />
))
```

---

## Erweiterte Deduplizierungs-Patterns

Die bestehende `BASE_PATTERNS` Liste muss erweitert werden:

```typescript
// Hinzufügen:
{ pattern: /^ca[- ]?akg|calcium[- ]?alpha[- ]?ketoglutarat|rejuvant/i, baseName: 'Ca-AKG' },
{ pattern: /^nr[- ]?|niagen|nicotinamid[- ]?riboside?/i, baseName: 'NR (Niagen)' },
{ pattern: /^eaa|essential[- ]?amino/i, baseName: 'EAA' },
{ pattern: /^bcaa|branched[- ]?chain/i, baseName: 'BCAA' },
```

---

## Dateien-Übersicht

| Datei | Änderung |
|-------|----------|
| `src/lib/supplementDeduplication.ts` | Patterns erweitern (Ca-AKG, NR, etc.) |
| `src/hooks/useDynamicallySortedSupplements.ts` | Gruppierung nach Base-Name aktivieren |
| `src/components/supplements/SupplementGroupRow.tsx` | **NEU** - Expandierbare Gruppen-Komponente |
| `src/components/supplements/SupplementInventory.tsx` | Gruppierte Anzeige statt flache Liste |
| **DB Migration/Script** | Duplikate konsolidieren |

---

## Vorteile

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Einträge | 111 (mit Duplikaten) | ~60-70 Base-Wirkstoffe |
| Klarheit | Verwirrend (CaAKG + Ca-AKG Rejuvant) | Eindeutig (Ca-AKG → Produkte) |
| Produkt-Auswahl | Versteckt im Chip | Prominent bei Varianten-Wahl |
| Chip-Anzeige | "Ca-AKG (Rejuvant)" | "Ca-AKG · MoleQlar" |

---

## Reihenfolge der Implementierung

1. **Deduplizierungs-Patterns erweitern** (supplementDeduplication.ts)
2. **Hook anpassen** für gruppierte Rückgabe
3. **SupplementGroupRow** Komponente erstellen
4. **SupplementInventory** auf Gruppen umstellen
5. **(Optional) DB-Cleanup** für saubere Daten

Soll ich mit Schritt 1 starten (Patterns erweitern + Hook-Gruppierung)?
