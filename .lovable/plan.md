
# ARES Matrix v2.1 Update: Wissenschaftlich validierte Matrix-Anpassungen

## Zusammenfassung der wissenschaftlichen Recherche (PDF)

Die PDF dokumentiert **Phase 1 der wissenschaftlichen Validierung** mit folgenden kritischen Erkenntnissen:

### 1. Testosteron-Modulatoren

| Wirkstoff | Kritische Erkenntnis | Matrix-Änderung |
|-----------|---------------------|-----------------|
| **Tongkat Ali** | KEINE signifikanten Effekte bei normalem T-Level (MDPI 2024). Nur bei Low-T effektiv (+15-25%). | `ctx_true_natural`: 3.5 → 1.5, `bw_testosterone_low`: → 4.0 |
| **Ashwagandha** | Wirkt primär über Cortisol-Senkung. Bei TRT: HPG-Achse supprimiert = KEIN Nutzen. | `ctx_on_trt`: 0 → -2.0 (bereits in v2.0) |
| **Fadogia Agrestis** | KEINE Human-Evidenz. Nur Rattenstudien. Testis-Toxizität bei hohen Dosen. | `impact_score`: 6.0 → 5.5, `ctx_true_natural`: 2.0 → 1.0 |
| **Zink** | +93% bei Mangel, minimal bei normalem Zink. | `bw_testosterone_low`: 3.0 ✓ validiert |

### 2. Glukose/Insulin-Modulatoren

| Wirkstoff | Evidenz | Matrix-Änderung |
|-----------|---------|-----------------|
| **Berberin** | HbA1c -0.75%, gleichwertig mit Metformin (PMC8696197) | `evidence_level`: moderate → **strong**, `bw_insulin_resistant`: 4.0 ✓ |

### 3. Lipid-Modulatoren

| Wirkstoff | Evidenz | Matrix-Änderung |
|-----------|---------|-----------------|
| **Citrus Bergamot** | LDL -20-40.8%, HDL +25% (PMC6497409) | `bw_ldl_high`: → 4.0, `bw_hdl_low`: → 3.5, `ctx_on_trt`: → 3.0 (TRT verschlechtert Lipide) |
| **Omega-3** | Triglyceride -27% (ab 3g EPA+DHA) | `bw_triglycerides_high`: 3.0 → 4.0 |

### 4. Cortisol-Modulatoren

| Wirkstoff | Evidenz | Matrix-Änderung |
|-----------|---------|-----------------|
| **Rhodiola Rosea** | Cortisol -10-15% (Olsson 2009) | `bw_cortisol_high`: → 2.5 |

---

## Änderungen zwischen v2.0 und v2.1

### CSV-Diff (kritische Zeilen):

| Zeile | Wirkstoff | v2.0 | v2.1 | Änderung |
|-------|-----------|------|------|----------|
| 5 | Omega-3 | `bw_triglycerides_high: 3.0` | `bw_triglycerides_high: 4.0` | +1.0 (validiert) |
| 16 | Citrus Bergamot | `ctx_on_trt: 2.0` | `ctx_on_trt: 3.0` | +1.0 (TRT-Support erhöht) |
| 16 | Citrus Bergamot | `bw_ldl_high: 3.0, bw_hdl_low: 3.5` | `bw_ldl_high: 4.0, bw_hdl_low: 3.5` | `bw_ldl_high` +1.0 |
| 17 | Berberin | `evidence_level: moderate` | `evidence_level: strong` | Upgrade auf Basis Meta-Analysen |
| 50 | Tongkat Ali | `ctx_true_natural: 3.5` | `ctx_true_natural: 1.5` | -2.0 (nur bei Low-T wirksam) |
| 50 | Tongkat Ali | `bw_testosterone_low: 1.5` | `bw_testosterone_low: 4.0` | +2.5 (Hypogonadismus-spezifisch) |
| 56 | Fadogia Agrestis | `impact_score: 6.0` | `impact_score: 5.5` | -0.5 (keine Human-Evidenz) |

---

## Implementierungs-Plan

### Schritt 1: CSV-Datei aktualisieren

**Aktion:** Ersetze `src/data/ares-matrix-v2.0.csv` mit neuer `ares-matrix-v2.1.csv`
- Kopiere das neue CSV ins Projekt
- Aktualisiere Kommentar-Header auf "v2.1 VALIDATED"

### Schritt 2: Import-Funktion anpassen

**Datei:** `src/lib/executeMatrixImport.ts`
- Ändere Import-Pfad von `v2.0` auf `v2.1`
- Zeile 271: `'@/data/ares-matrix-v2.0.csv?raw'` → `'@/data/ares-matrix-v2.1.csv?raw'`

### Schritt 3: Wissenschaftliche Quellen in RelevanceMatrix speichern

**Datei:** `src/types/relevanceMatrix.ts`

Neues optionales Feld in `RelevanceMatrix` hinzufügen:
```typescript
export interface RelevanceMatrix {
  // ... bestehende Felder ...
  
  // Wissenschaftliche Quellen und Erkenntnisse (für Info-Overlay)
  evidence_notes?: {
    sources?: string[];           // ["PMC9415500", "Henkel 2014"]
    critical_insight?: string;    // "Nur bei Low-T effektiv"
    validation_status?: 'validated' | 'pending' | 'disputed';
  };
}
```

### Schritt 4: SupplementDetailSheet erweitern

**Datei:** `src/components/supplements/SupplementDetailSheet.tsx`

Erweitere die bestehende Evidenz-Sektion um die `evidence_notes`:

```typescript
// Neue Komponente für wissenschaftliche Quellen
const ScientificSourcesSection: React.FC<{ matrix?: RelevanceMatrix }> = ({ matrix }) => {
  const notes = matrix?.evidence_notes;
  if (!notes?.critical_insight && !notes?.sources?.length) return null;
  
  return (
    <>
      <Separator />
      <div>
        <h4>Wissenschaftliche Einordnung</h4>
        {notes.critical_insight && (
          <p className="text-xs italic">{notes.critical_insight}</p>
        )}
        {notes.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {notes.sources.map(src => (
              <Badge key={src} variant="outline" className="text-[10px]">
                📚 {src}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
```

### Schritt 5: CSV-Parser für evidence_notes erweitern (optional, für Zukunft)

Falls wir die wissenschaftlichen Quellen direkt im CSV speichern möchten, könnten wir neue Spalten hinzufügen:
- `ev_sources` (comma-separated PMIDs)
- `ev_insight` (kritische Erkenntnis)

**Aktuell:** Die `evidence_notes` werden manuell für kritische Wirkstoffe gepflegt.

### Schritt 6: Matrix mit wissenschaftlichen Erkenntnissen anreichern

Für die wichtigsten validierten Wirkstoffe direkt im CSV oder via separatem Update:

| Wirkstoff | evidence_notes.critical_insight | evidence_notes.sources |
|-----------|--------------------------------|------------------------|
| Tongkat Ali | "Nur bei niedrigem Testosteron effektiv (+15-25%). Bei normalem T-Level keine signifikanten Effekte." | ["PMC9415500", "MDPI 2024"] |
| Berberin | "Gleichwertig mit Metformin für Blutzuckerkontrolle. HbA1c -0.75%." | ["PMC8696197", "SCIRP Meta"] |
| Citrus Bergamot | "LDL -20-40.8%, HDL +25%. KRITISCH bei TRT wegen Lipidverschlechterung." | ["PMC6497409", "Mollace 2011"] |
| Omega-3 | "Mind. 3g EPA+DHA für Triglyzerid-Senkung. 1g nur für kardiovaskulären Schutz." | ["PMC3138218", "JAHA 2023"] |
| Fadogia Agrestis | "KEINE Human-Evidenz. Alle Daten aus Rattenstudien. Sicherheitsprofil unbekannt." | ["Yakubu 2005"] |

---

## Dateien-Übersicht

| Datei | Aktion |
|-------|--------|
| `src/data/ares-matrix-v2.1.csv` | **NEU** - Kopie der validierten CSV |
| `src/data/ares-matrix-v2.0.csv` | **LÖSCHEN** - Ersetzt durch v2.1 |
| `src/lib/executeMatrixImport.ts` | **BEARBEITEN** - Import-Pfad auf v2.1 |
| `src/types/relevanceMatrix.ts` | **BEARBEITEN** - `evidence_notes` Feld hinzufügen |
| `src/components/supplements/SupplementDetailSheet.tsx` | **BEARBEITEN** - Scientific Sources Section |
| `src/lib/matrixCSVParser.ts` | **BEARBEITEN** - Kommentar-Update auf v2.1 |

---

## Erwartetes Ergebnis

1. **Matrix-Daten:** 84 Wirkstoffe mit wissenschaftlich validierten Modifiern
2. **Kritische Korrekturen:**
   - Tongkat Ali wird nur noch bei Low-T empfohlen
   - Berberin erhält "Strong Evidence" Status
   - Citrus Bergamot wird verstärkt bei TRT empfohlen
   - Fadogia Agrestis wird herabgestuft (keine Human-Evidenz)
3. **Info-Overlay:** Zeigt kritische wissenschaftliche Erkenntnisse und Quellen
4. **Scoring-System:** Wendet die validierten Modifier korrekt an

---

## Nächste Recherche-Phasen (laut PDF)

- **Phase 2:** NAD+ Decline (NMN/NR Alters-Kalibrierung)
- **Phase 2:** TRT-Kontext (HMB unter GLP-1)
- **Phase 2:** GLP-1-Kontext (Muskelabbau unter Semaglutide)
