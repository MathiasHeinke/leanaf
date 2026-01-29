
# Fix: Matrix-Import auf Multi-Match umstellen

## Das Problem

Die `findMatch`-Funktion in `run-matrix-import/index.ts` gibt nach dem **ersten Match** ein `return` zurück:

```javascript
// Zeile 283 - Stoppt nach erstem Treffer!
return { dbId: supp.id, dbName: supp.name, matchType: 'manual' };
```

**Konsequenz**: Wenn `ingredient_id: "magnesium"` importiert wird:
1. MANUAL_OVERRIDES enthaelt `['magnesium', 'magnesiumcitrat', 'magnesium glycinat', ...]`
2. Die DB-Suche findet "Magnesium" als ersten Treffer
3. `return` beendet die Suche
4. "Magnesium Glycinat" und "Magnesiumcitrat" werden NIE aktualisiert!

Deshalb haben wir 70/111 statt 100/111 - die Varianten werden uebersprungen.

---

## Die Loesung

### Schritt 1: `findMatch` zu `findAllMatches` umbauen

Statt einer einzelnen Match-Rueckgabe werden ALLE passenden DB-Eintraege gesammelt:

```text
findAllMatches(ingredientId, ingredientName, dbSupplements): 
  -> Array<{dbId, dbName, matchType}>  (statt single object | null)
```

### Schritt 2: Import-Loop anpassen

Statt:
```text
const match = findMatch(...)
if (match) update(match.dbId)
```

Neu:
```text
const matches = findAllMatches(...)
for (const match of matches) {
  update(match.dbId)  // Alle Varianten updaten!
}
```

### Schritt 3: Deduplizierung

Sicherstellen, dass jeder DB-Eintrag nur einmal upgedatet wird (Set mit IDs).

---

## Dateiaenderungen

### Datei: `supabase/functions/run-matrix-import/index.ts`

1. **Neue Funktion `findAllMatches`** (ersetzt `findMatch`):
   - Sammelt alle DB-Eintraege, die zu den MANUAL_OVERRIDE patterns passen
   - Gibt Array statt single object zurueck
   - Verwendet Set zur Deduplizierung

2. **Import-Loop anpassen**:
   - Iteriert ueber alle Matches statt nur den ersten
   - Zaehlt multi-updates korrekt

3. **Logging verbessern**:
   - Zeigt wie viele DB-Eintraege pro Ingredient updated wurden

---

## Erwartetes Ergebnis nach Fix

| Vorher | Nachher |
|--------|---------|
| 70/111 (63%) | ~100/111 (90%) |

### Konkrete Beispiele die jetzt funktionieren werden:

| Import-Ingredient | Wird updaten |
|-------------------|--------------|
| `magnesium` | Magnesium, Magnesium Glycinat, Magnesiumcitrat |
| `ashwagandha` | Ashwagandha, Ashwagandha KSM-66 |
| `nmn` | NMN, NMN sublingual, NMN (Nicotinamid Mononukleotid) |
| `creatine` | Creatine, Creatine Monohydrat |
| `resveratrol` | Resveratrol, Trans-Resveratrol |
| `zinc` | Zink, Zink Bisglycinat, Zinc Complex |
| `vit_c` | Vitamin C, Vitamin C (liposomal) |
| `vit_d3` | Vitamin D3, Vitamin D3 + K2 MK7 Tropfen, Vitamin D Balance |
| `probiotics_lacto` | Probiotika, Probiona Kulturen Komplex, Probiotika Multi-Strain |

---

## Stack-Produkte (weiterhin Skip)

Diese 11 Produkte haben keine direkte Matrix-Zuweisung:
- Pre-Workout Komplex, Sport Stack, Nootropic, Schlaf, Frauen, Augen, Beauty, Haare, Gelenke
- Metformin, Methylenblau 1%

Das ist korrekt - Stacks werden ueber ihre Einzelbestandteile bewertet.
