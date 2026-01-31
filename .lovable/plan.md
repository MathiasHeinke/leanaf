
# Datenbank-Anreicherung: Vollstaendige Abdeckung

## Aktuelle Situation

Nach Analyse der Datenbank:

| Problem | Status | Loesung |
|---------|--------|---------|
| 178 Produkte ohne `supplement_id` | Unverknuepft | Keyword-Matcher erweitern + rerun |
| `synergies` Felder leer (99%) | Leere Arrays `{}` | Aus `supplementInteractions.ts` befuellen |
| `blockers` Felder leer (100%) | Leere Arrays `{}` | Aus `supplementInteractions.ts` befuellen |
| `cycling_protocol` leer | null | Statische Daten einfuegen |
| 2 leere Brands | Keine Produkte | Aufraemen |
| 36 verwaiste Supplements | Keine Produktlinks | Zu erwarten bei Spezial-Wirkstoffen |

---

## Loesung: Neue Edge Function `enrich-supplement-data`

Eine einzige Function die alle drei Probleme loest:

### Task 1: Produkt-Linking

Erweiterte Keyword-Matching-Logik (bereits in `run-matrix-import` vorhanden):

```typescript
// Nutze die MANUAL_OVERRIDES aus run-matrix-import
// Matche supplement_products.ingredients gegen supplement_database.name
// Update supplement_id fuer alle unverknuepften Produkte

// Beispiel: "vit_b_complex" in ingredients -> findet "Vitamin B-Komplex" in DB
```

### Task 2: Synergies und Blockers aus TypeScript-Daten

Die Daten existieren bereits in `src/data/supplementInteractions.ts`:

```typescript
// SYNERGIES Array:
{ supplements: ['Vitamin D3', 'Vitamin K2', 'Magnesium'], reason: '...', importance: 'pflicht' }
{ supplements: ['NMN', 'TMG (Betain)'], reason: '...', importance: 'pflicht' }
// ... 10 Eintraege

// BLOCKERS Array:
{ supplement: 'Eisen', blockers: ['Kaffee', 'Tee', 'Milch', 'Kalzium'], severity: 'kritisch' }
{ supplement: 'Zink', blockers: ['Phytate', 'Kalzium', 'Eisen'], severity: 'moderat' }
// ... 8 Eintraege
```

Die Function importiert diese Daten direkt in `supplement_database.synergies` und `supplement_database.blockers`.

### Task 3: Cleanup

- Leere Brands loeschen (`amazon-generic`, `nordic-naturals`)
- Deprecated-Produkte flaggen falls noetig

---

## Technische Umsetzung

### Neue Edge Function: `enrich-supplement-data`

```typescript
// supabase/functions/enrich-supplement-data/index.ts

serve(async (req) => {
  const { task } = await req.json();
  // task: 'link_products' | 'sync_interactions' | 'cleanup' | 'all'
  
  switch (task) {
    case 'link_products':
      // 1. Hole alle Produkte ohne supplement_id
      // 2. Parse ingredients Feld
      // 3. Matche gegen MANUAL_OVERRIDES + supplement_database.name
      // 4. Update supplement_id
      break;
      
    case 'sync_interactions':
      // 1. SYNERGIES_DATA als konstante (aus supplementInteractions.ts)
      // 2. BLOCKERS_DATA als konstante
      // 3. Fuer jeden Eintrag: Finde Supplement in DB
      // 4. Update synergies/blockers Arrays
      break;
      
    case 'cleanup':
      // 1. Loesche Brands ohne Produkte
      // 2. Optional: Deprecated-Flag fuer verwaiste Produkte
      break;
      
    case 'all':
      // Alle drei Tasks sequentiell
      break;
  }
});
```

### Synergies/Blockers Datenstruktur

Die Function enthaelt die Daten direkt (Copy aus supplementInteractions.ts):

```typescript
const SYNERGIES_MAP: Record<string, string[]> = {
  'Vitamin D3': ['Vitamin K2', 'Magnesium'],
  'Vitamin K2': ['Vitamin D3', 'Magnesium'],
  'Magnesium': ['Vitamin D3', 'Vitamin K2'],
  'NMN': ['TMG', 'Resveratrol'],
  'Curcumin': ['Piperin'],
  'Kollagen': ['Vitamin C'],
  'Eisen': ['Vitamin C'],
  'PQQ': ['CoQ10', 'Ubiquinol'],
  'Zink': ['Kupfer'],
  "Lion's Mane": ['Alpha-GPC'],
  'Omega-3': ['Vitamin E'],
  'Kreatin': ['Kohlenhydrate'],
};

const BLOCKERS_MAP: Record<string, string[]> = {
  'Eisen': ['Kaffee', 'Tee', 'Milch', 'Kalzium', 'Phytate'],
  'Zink': ['Phytate', 'Kalzium', 'Eisen'],
  'Kalzium': ['Eisen', 'Zink', 'Magnesium'],
  '5-HTP': ['SSRIs', 'MAO-Hemmer', 'Tramadol'],
  'Berberin': ['Metformin'],
};
```

---

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte mit supplement_id | 572 (76%) | ~720 (96%) |
| Supplements mit synergies | 1 (1%) | ~40 (35%) |
| Supplements mit blockers | 0 (0%) | ~20 (17%) |
| Leere Brands | 2 | 0 |

---

## Dateiaenderungen

1. **NEU: `supabase/functions/enrich-supplement-data/index.ts`**
   - Drei Tasks: link_products, sync_interactions, cleanup
   - MANUAL_OVERRIDES aus run-matrix-import uebernehmen
   - SYNERGIES_MAP und BLOCKERS_MAP Konstanten
   - Fuzzy-Matching fuer supplement_database Namen

2. **Frontend Trigger (optional)**
   - Button auf `/admin/seed-supplements` hinzufuegen
   - Oder manuell via curl/Supabase Dashboard aufrufen

---

## Ablauf

1. Edge Function deployen
2. Aufruf mit `{ "task": "all" }` - fuehrt alle drei Tasks aus
3. Response zeigt:
   - Anzahl verknuepfter Produkte
   - Anzahl aktualisierter Synergies/Blockers
   - Geloeschte Brands
