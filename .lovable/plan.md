
# CSV-Export fuer ARES Relevance Matrix (111 Wirkstoffe)

## Ziel

Erstellen eines CSV-Export-Tools, das alle 111 Wirkstoffe mit ihrer kompletten `relevance_matrix` als flache Tabelle exportiert. Dies ermoeglicht einfaches Feintuning der Gewichtungen in Excel/Google Sheets.

## Export-Struktur (Spalten)

Die CSV wird alle Modifier-Kategorien als einzelne Spalten darstellen:

| Spaltengruppe | Spalten |
|---------------|---------|
| **Basis-Daten** | name, category, impact_score, necessity_tier, evidence_level, protocol_phase |
| **Phase Modifiers** | phase_0, phase_1, phase_2, phase_3 |
| **Context Modifiers** | ctx_true_natural, ctx_enhanced_no_trt, ctx_on_trt, ctx_on_glp1 |
| **Goal Modifiers** | goal_fat_loss, goal_muscle_gain, goal_recomposition, goal_maintenance, goal_longevity, goal_performance, goal_cognitive, goal_sleep |
| **Calorie Modifiers** | cal_in_deficit, cal_in_surplus |
| **Demographic Modifiers** | demo_age_over_40, demo_age_over_50, demo_age_over_60, demo_is_male, demo_is_female |
| **Peptide Class Modifiers** | pep_gh_secretagogue, pep_healing, pep_longevity, pep_nootropic, pep_metabolic, pep_immune, pep_testo, pep_skin |
| **Bloodwork Triggers** | bw_cortisol_high, bw_testosterone_low, bw_vitamin_d_low, bw_magnesium_low, bw_triglycerides_high, bw_inflammation_high, bw_glucose_high, bw_insulin_resistant, bw_hdl_low, bw_ldl_high, bw_apob_high, bw_ferritin_high, bw_homocysteine_high, bw_nad_low |
| **Compound Synergies** | syn_retatrutide, syn_tirzepatide, syn_semaglutide, syn_epitalon, syn_mots_c |

**Geschaetzte Spaltenanzahl:** ~55 Spalten

## Implementierung

### Neue Datei: `src/utils/exportMatrixCSV.ts`

```typescript
// Kernfunktion
export async function exportSupplementMatrixCSV(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}>
```

**Ablauf:**
1. Lade alle 111 Supplements mit `relevance_matrix IS NOT NULL`
2. Definiere vollstaendige Header-Liste mit allen bekannten Modifier-Keys
3. Flatten jede Matrix zu einer CSV-Zeile
4. Generiere Download als `ares_matrix_export_YYYY-MM-DD.csv`

### UI-Integration

Der Export-Button wird in eine bestehende Admin-Komponente integriert oder kann als eigenstaendige Funktion aufgerufen werden.

## Beispiel-Output (erste 3 Zeilen)

```csv
name,category,impact_score,necessity_tier,phase_0,phase_1,phase_2,phase_3,ctx_true_natural,ctx_enhanced_no_trt,ctx_on_trt,ctx_on_glp1,...
Creatine Monohydrat,Energie,9.8,essential,1,1,0.5,0,1,1,0.5,0,...
Magnesium Glycinat,Schlaf,9.5,essential,2,1,0.5,0,1,1.5,1,2,...
Omega-3 (EPA/DHA),Entzuendung,9.2,essential,1.5,1,0.5,0.5,0.5,0,1,0,...
```

## Dateiaenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/utils/exportMatrixCSV.ts` | NEU: Export-Funktion fuer Relevance Matrix |

## Vorteile

1. **Vollstaendige Transparenz**: Alle 111 Wirkstoffe mit allen Gewichtungen sichtbar
2. **Excel-kompatibel**: UTF-8 BOM fuer korrekte Umlaute
3. **Feintuning-faehig**: Werte koennen in Tabelle angepasst und reimportiert werden
4. **Konsistenz-Check**: Leere Felder zeigen fehlende Modifier an
