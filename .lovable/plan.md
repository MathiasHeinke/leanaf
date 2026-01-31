
# Fix: Supplement-Produkte nicht sichtbar wegen DB-Duplikaten

## Problem-Analyse

Das Edit-Modal zeigt keine Produkte/Hersteller für bestimmte Supplements (CaAKG, Ashwagandha, etc.), weil:

1. **Zwei getrennte DB-Einträge pro Substanz existieren:**
   - Ein "Premium"-Eintrag mit hohem Score aber 0 Produkten
   - Ein "Standard"-Eintrag mit niedrigem Score aber allen Produkten

2. **Das System zeigt die Premium-Variante als Top-Wahl** (wegen höherem Score), aber diese hat keine verlinkten Produkte

3. **Die Produkt-Abfrage läuft nur gegen die gewählte supplement_id** - findet also nichts

---

## Betroffene Duplikate (nach Recherche)

| Substanz | Behalten (hat Produkte) | Löschen (hat 0 Produkte) | Aktion |
|----------|------------------------|--------------------------|--------|
| **Ashwagandha** | `Ashwagandha` (23 Produkte) | `Ashwagandha KSM-66` (0) | Score auf 7.8 updaten, Orphan löschen |
| **Ca-AKG** | `Ca-AKG (Rejuvant)` (2 Produkte) | `CaAKG` (0), `Alpha-Ketoglutarat (AKG)` (0) | Score auf 8.5 updaten, 2 Orphans löschen |
| **Curcumin** | `Curcumin` (21 Produkte) | `Curcumin Longvida` (0) | Score auf 7.0 updaten, Orphan löschen |
| **EAA** | `EAA` (9 Produkte) | `EAA Komplex` (0) | Score bleibt 8.5, Orphan löschen |
| **Kollagen** | `Kollagen` (14 Produkte) | `Kollagen Peptide` (0) | Score auf 7.5 updaten, Orphan löschen |
| **NMN** | `NMN` (6 Produkte) | `NMN sublingual` (0), `NMN (Nicotinamid...)` (1) | Produkte zusammenführen, Orphans löschen |
| **Probiotika** | `Probiotika` (26 Produkte) | `Probiotika Multi-Strain` (0) | Score auf 7.3 updaten, Orphan löschen |
| **Resveratrol** | `Resveratrol` (5 Produkte) | `Trans-Resveratrol` (0) | Score bleibt 8.0, Orphan löschen |
| **Taurin** | `Taurin` (10 Produkte) | `Taurin (kardioprotektiv)` (0) | Score auf 7.8 updaten, Orphan löschen |
| **Vitamin C** | `Vitamin C` (16 Produkte) | `Vitamin C (liposomal)` (0) | Score auf 8.0 updaten, Orphan löschen |
| **Elektrolyte** | Fehlt komplett! | `Elektrolyte (LMNT)` (0) | Neuen Eintrag erstellen ODER Produkte umhängen |

**Zusätzliches Problem:** Elektrolyte-Produkte sind falsch auf `Magnesium` gemappt!

---

## Lösung: Datenbank-Konsolidierung (Runde 2)

### Schritt 1: Elektrolyte-Produkte korrigieren
Die 2 Elektrolyte-Produkte sind fälschlich auf Magnesium verlinkt. Diese auf den korrekten Eintrag umhängen.

### Schritt 2: User-Supplements bereinigen
Für User die einen Orphan-Eintrag im Stack haben: auf den Haupt-Eintrag umlinken (falls nicht schon vorhanden).

### Schritt 3: Produkte zusammenführen
NMN-Produkte von Sub-Varianten auf den Haupt-NMN-Eintrag verschieben.

### Schritt 4: Impact-Scores aktualisieren
Die Haupt-Einträge erhalten den höchsten Score ihrer Gruppe.

### Schritt 5: Orphans löschen
Alle Einträge ohne Produkte und ohne User-Referenzen entfernen.

---

## Erwartetes Ergebnis

Nach der Konsolidierung:
- **CaAKG** zeigt 2 Produkte (MoleQlar)
- **Ashwagandha** zeigt 23 Produkte (ESN, Sunday Natural, etc.)
- **Elektrolyte** zeigt 2 Produkte (ESN, More Nutrition)
- Alle anderen Substanzen zeigen ihre korrekten Produkte

---

## Technische Umsetzung

Migration-Script mit 5 Phasen:
1. Fix Elektrolyte-Produkt-Mapping
2. Upsert user_supplements auf Haupt-Einträge  
3. Verschiebe NMN-Produkte
4. Update impact_scores
5. Delete Orphans

Geschätzte Änderungen: 1 neue Migration, ~12 Orphans entfernt, ~50 Produkte korrekt verlinkt.
