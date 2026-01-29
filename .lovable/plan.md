

# Matrix-Daten Import: Direkte Ausfuehrung

## Vorgehensweise

Da das Admin-Import-Tool bereits fertig implementiert ist, werde ich die Matrix-Daten direkt verarbeiten:

### Schritt 1: Matrix-Datei speichern
Die hochgeladene `ARES_INGREDIENT_RELEVANCE_MATRIX-3-2.md` wird als Referenz im Projekt gespeichert unter `src/data/matrix-import-data.md`.

### Schritt 2: Automatisierter Batch-Import
Anstatt die Admin-UI zu nutzen, fuehre ich einen direkten Batch-Import durch:

1. **Parsen**: Alle 150 JSON-Bloecke aus der MD-Datei extrahieren
2. **Matchen**: Mit den 111 DB-Eintraegen abgleichen (Fuzzy + Manual Overrides)
3. **Importieren**: `relevance_matrix` fuer jeden gematchten Wirkstoff aktualisieren

### Erwartetes Ergebnis

| Metrik | Erwartung |
|--------|-----------|
| **Wirkstoffe gematcht** | ~100 von 150 |
| **DB-Updates** | ~100 Datensaetze |
| **Uebersprungen** | ~50 (keine DB-Entsprechung) |

### Dateien

| Datei | Aktion |
|-------|--------|
| `src/data/matrix-import-v2.1.md` | NEU - Matrix-Quelldaten |
| `src/lib/executeMatrixImport.ts` | NEU - Batch-Import-Script |

