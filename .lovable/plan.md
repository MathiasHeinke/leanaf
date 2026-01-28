

# Protokoll-Tab Ueberarbeitung: Wirkebenen, Info-Sheet & bessere Labels

## Zusammenfassung

Der Protokoll-Tab wird von einer flachen Liste zu einem strukturierten, kategorisierten System umgebaut mit:
1. **Meta-Kategorien-System** - 29 DB-Kategorien werden in 7 logische Wirkebenen gruppiert
2. **Info-Sheet** - Klick auf Info-Icon oeffnet Detail-Sheet mit allen Supplement-Informationen
3. **Bessere Labels** - "Empfohlen: 600" wird zu "600mg | Morgens | Starke Evidenz"

---

## 1. Meta-Kategorien (Wirkebenen-Mapping)

Statt 29 technischer Kategorien sieht der User 7 verstaendliche Wirkebenen:

| Meta-Kategorie | Icon | DB-Kategorien |
|----------------|------|---------------|
| Basis & Gesundheit | Shield | Vitamine, Mineralien, Wellness |
| Longevity & Zellschutz | Dna | Longevity, Anti-Aging, NAD+, Antioxidantien |
| Mental & Fokus | Brain | Nootropics, Adaptogene, Schlaf, Stress |
| Performance & Sport | Zap | Aminosaeuren, Muskelaufbau, Muskelerhalt, Performance, Proteine, Energie, Stimulanzien |
| Hormone & Balance | Scale | Hormone, Testosteron, TRT-Support, GLP-1 Support |
| Darm & Verdauung | Heart | Darm, Darmgesundheit, Entzuendung |
| Spezial & Sonstiges | Sparkles | Fettsaeuren, Beauty, Superfoods, Peptid-Synergie |

### Neue Datei: `src/lib/categoryMapping.ts`

```typescript
export const META_CATEGORIES = {
  health: {
    id: 'health',
    label: 'Basis & Gesundheit',
    icon: 'Shield',
    color: 'blue',
    categories: ['Vitamine', 'Mineralien', 'Wellness']
  },
  longevity: {
    id: 'longevity',
    label: 'Longevity',
    icon: 'Dna',
    color: 'purple',
    categories: ['Longevity', 'Anti-Aging', 'NAD+', 'Antioxidantien']
  },
  mental: {
    id: 'mental',
    label: 'Mental & Fokus',
    icon: 'Brain',
    color: 'cyan',
    categories: ['Nootropics', 'Adaptogene', 'Schlaf', 'Stress']
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    icon: 'Zap',
    color: 'yellow',
    categories: ['Aminosäuren', 'Muskelaufbau', 'Muskelerhalt', 
                 'Performance', 'Proteine', 'Energie', 'Stimulanzien']
  },
  hormones: {
    id: 'hormones',
    label: 'Hormone',
    icon: 'Scale',
    color: 'pink',
    categories: ['Hormone', 'Testosteron', 'TRT-Support', 'GLP-1 Support']
  },
  gut: {
    id: 'gut',
    label: 'Verdauung',
    icon: 'Heart',
    color: 'green',
    categories: ['Darm', 'Darmgesundheit', 'Entzündung']
  },
  other: {
    id: 'other',
    label: 'Sonstiges',
    icon: 'Sparkles',
    color: 'gray',
    categories: ['Fettsäuren', 'Beauty', 'Superfoods', 'Peptid-Synergie']
  }
} as const;

// Helper: Finde Meta-Kategorie fuer eine DB-Kategorie
export function getMetaCategory(dbCategory: string): keyof typeof META_CATEGORIES {
  for (const [key, meta] of Object.entries(META_CATEGORIES)) {
    if (meta.categories.includes(dbCategory)) {
      return key as keyof typeof META_CATEGORIES;
    }
  }
  return 'other';
}
```

---

## 2. Supplement Detail Sheet

Neue Komponente die beim Klick auf das Info-Icon erscheint.

### Neue Datei: `src/components/supplements/SupplementDetailSheet.tsx`

Zeigt:
- **Header**: Name + Kategorie-Badge
- **Beschreibung**: Aus DB (`description`)
- **Empfohlene Dosis**: `default_dosage` + `default_unit` (z.B. "600 mg")
- **Optimales Timing**: Aus `common_timing` / `timing_constraint`
- **Evidenz-Level**: Badge mit Farbe (stark/moderat/anekdotisch)
- **Zyklus**: Falls `cycling_protocol` vorhanden
- **Synergien**: Liste falls vorhanden
- **Blocker**: Liste falls vorhanden
- **Warnung**: Rot hervorgehoben falls vorhanden

```text
+------------------------------------------+
|  X                                       |
|  Ashwagandha                             |
|  [Adaptogene] [Optimizer]                |
|  ----------------------------------------|
|  Stressreduktion und Schlafqualitaet     |
|                                          |
|  Empfohlen                               |
|  +--------------------------------------+|
|  | 600 mg  |  Abends  |  Moderat        ||
|  +--------------------------------------+|
|                                          |
|  Zyklus                                  |
|  5 Tage on / 2 Tage off                  |
|                                          |
|  Synergien                               |
|  Magnesium, L-Theanin                    |
|                                          |
|  Blocker                                 |
|  Koffein abends                          |
+------------------------------------------+
```

---

## 3. UI-Aenderungen in SupplementInventory

### Zweite Filter-Zeile: Meta-Kategorien

Unter den Tier-Pills (Essential/Optimizer/Specialist) kommt eine zweite Zeile mit Meta-Kategorie-Filter:

```text
TIER-PILLS:
[Essential 8/12] [Optimizer 5/24] [Specialist 2/15]

META-PILLS (horizontal scrollbar):
[Alle] [Basis] [Mental] [Performance] [Longevity] [Hormone] [Verdauung] [Sonstiges]
```

### Neuer State:
```typescript
const [activeMetaCategory, setActiveMetaCategory] = 
  useState<keyof typeof META_CATEGORIES | 'all'>('all');
```

### Filter-Logik erweitern:
```typescript
const filteredSupplements = useMemo(() => {
  let items = groupedByTier[activeTier] || [];
  
  // Meta-Kategorie-Filter
  if (activeMetaCategory !== 'all') {
    const allowedCategories = META_CATEGORIES[activeMetaCategory].categories;
    items = items.filter(item => 
      allowedCategories.includes(item.category || '')
    );
  }
  
  // Such-Filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(query) || ...
    );
  }
  
  return items;
}, [groupedByTier, activeTier, activeMetaCategory, searchQuery]);
```

---

## 4. SupplementToggleRow verbessern

### Aktuelles Problem (Zeile 73-76):
```tsx
<Info className="h-3 w-3 shrink-0" />
<span>Empfohlen: {item.default_dosage || 'Nach Bedarf'}</span>
// FEHLT: default_unit, Timing, Evidenz
```

### Loesung:

**a) Info-Icon wird klickbar und oeffnet Sheet:**
```tsx
<button onClick={() => setDetailItem(item)}>
  <Info className="h-3 w-3 hover:text-primary cursor-pointer" />
</button>
```

**b) Label-Format verbessern:**
```tsx
// Inaktive Supplements:
<span className="truncate">
  {item.default_dosage}{item.default_unit} | {getTimingLabel()} | 
  <EvidenceBadge level={item.evidence_level} />
</span>

// Aktive Supplements bleiben wie sie sind:
<Check /> Morgens | 600mg
```

### Beispiel vorher/nachher:

| Vorher | Nachher |
|--------|---------|
| `Empfohlen: 600` | `600mg | Abends | Moderat` |
| `Empfohlen: 5` | `5g | Morgens | Stark` |
| `Empfohlen: Nach Bedarf` | `Nach Bedarf | Flexibel` |

---

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/lib/categoryMapping.ts` | NEU: Meta-Kategorie-Konstanten und Helper |
| `src/components/supplements/SupplementDetailSheet.tsx` | NEU: Detail-Sheet Komponente |
| `src/components/supplements/SupplementInventory.tsx` | Meta-Filter-Pills hinzufuegen |
| `src/components/supplements/SupplementToggleRow.tsx` | Info-Icon klickbar, Label-Format fixen |

---

## Implementierungs-Reihenfolge

1. `categoryMapping.ts` erstellen - Mapping-Logik
2. `SupplementDetailSheet.tsx` erstellen - Info-Sheet
3. `SupplementToggleRow.tsx` anpassen - Info-Icon + Labels
4. `SupplementInventory.tsx` anpassen - Meta-Filter integrieren

