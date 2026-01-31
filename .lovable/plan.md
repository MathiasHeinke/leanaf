
# ARES Relevance Matrix: Dokumentation und Export-Optimierung

## Ziel

1. **Export-Card aktualisieren**: Beschreibung von "111 Wirkstoffe" auf die tatsaechliche Anzahl (~98 nach Cleanup) aendern
2. **Matrix-Dokumentation erstellen**: Eine umfassende Erklaerung aller Matrix-Spalten und deren Bedeutung hinzufuegen, damit auch Aussenstehende die CSV sofort verstehen
3. **CSV-Header mit Erklaerungen versehen**: Optional einen Kommentar-Block am Anfang der CSV einfuegen

---

## Aktuelle Matrix-Struktur nach Cleanup

| Kategorie | Aktueller Stand |
|-----------|-----------------|
| Gesamt mit Matrix | 98 Wirkstoffe |
| Evidence Levels | `moderate` (65), `strong` (33) |
| Tiers | `optimizer` (64), `specialist` (21), `essential` (13) |
| Kategorien | 32 eindeutige (deutsch normalisiert) |

---

## Matrix-Spalten-Dokumentation (55 Spalten)

### Basis-Daten (6 Spalten)

| Spalte | Beschreibung | Wertebereich |
|--------|--------------|--------------|
| `name` | Wirkstoffname (z.B. "Creatine Monohydrat") | Text |
| `category` | Funktionskategorie (z.B. "Longevity", "Schlaf") | Text |
| `impact_score` | Basis-Relevanz ohne Personalisierung | 0.0 - 10.0 |
| `necessity_tier` | Wichtigkeitsstufe | essential, optimizer, specialist |
| `evidence_level` | Wissenschaftliche Evidenz | moderate, strong |
| `protocol_phase` | Empfohlene ARES-Phase | 0, 1, 2, 3 |

### Phase-Modifikatoren (4 Spalten)

Passen den Score je nach aktueller Protokoll-Phase an:

| Spalte | Bedeutung | Beispiel |
|--------|-----------|----------|
| `phase_0` | Fundament-Phase (Lifestyle-Basics) | +1.0 = relevant in Phase 0 |
| `phase_1` | Rekomposition (aktiver Fettabbau) | +2.0 = sehr relevant fuer Fettabbau |
| `phase_2` | Fine-Tuning (Peptid-Optimierung) | +0.5 = leicht erhoehte Relevanz |
| `phase_3` | Longevity (fortgeschrittene Protokolle) | +1.0 = Longevity-relevant |

### Kontext-Modifikatoren (4 Spalten)

Hierarchie: TRT ueberschreibt Enhanced ueberschreibt Natural

| Spalte | Bedeutung | Typische Werte |
|--------|-----------|----------------|
| `ctx_true_natural` | 100% Natural (keine Peptide, kein TRT) | +1.0 bis +3.5 |
| `ctx_enhanced_no_trt` | Peptide OHNE TRT (Risikogruppe!) | +2.0 bis +5.0 |
| `ctx_on_trt` | TRT/HRT aktiv | -4.0 bis +1.0 |
| `ctx_on_glp1` | GLP-1-Agonist aktiv (Reta/Tirze/Sema) | -2.0 bis +4.0 |

### Ziel-Modifikatoren (9 Spalten)

Passen Score je nach primaeerem Nutzerziel an:

| Spalte | Ziel | Wann relevant? |
|--------|------|----------------|
| `goal_fat_loss` | Fettabbau | Aktive Diaet |
| `goal_muscle_gain` | Muskelaufbau | Aufbauphase |
| `goal_recomposition` | Rekomposition | Gleichzeitig Fett ab + Muskel auf |
| `goal_maintenance` | Erhaltung | Stabiles Gewicht |
| `goal_longevity` | Langlebigkeit | Anti-Aging Fokus |
| `goal_performance` | Leistung | Sport/Athletik |
| `goal_cognitive` | Kognition | Mentale Klarheit |
| `goal_sleep` | Schlaf | Schlafoptimierung |
| `goal_gut_health` | Darmgesundheit | Verdauung/Mikrobiom |

### Kalorien-Status (2 Spalten)

| Spalte | Bedeutung | Beispiel |
|--------|-----------|----------|
| `cal_in_deficit` | Kaloriendefizit aktiv | +3.0 fuer Muskelschutz bei Creatine |
| `cal_in_surplus` | Kalorien-Ueberschuss | +2.0 fuer Aufbau-Unterstuetzung |

### Demografische Modifikatoren (5 Spalten)

| Spalte | Bedeutung | Wissenschaft |
|--------|-----------|--------------|
| `demo_age_over_40` | Alter 40+ | NAD+ sinkt, Mitochondrien altern |
| `demo_age_over_50` | Alter 50+ | Hormonspiegel fallen deutlich |
| `demo_age_over_60` | Alter 60+ | Maximale Longevity-Relevanz |
| `demo_is_male` | Maennlich | Testosteron-Fokus |
| `demo_is_female` | Weiblich | Hormonbalance, Eisen-Fokus |

### Peptid-Klassen-Modifikatoren (8 Spalten)

Synergien mit aktiven Peptid-Protokollen:

| Spalte | Peptid-Klasse | Beispiele |
|--------|---------------|-----------|
| `pep_gh_secretagogue` | GH-Stimulation | CJC-1295, Ipamorelin, MK-677 |
| `pep_healing` | Heilung/Regeneration | BPC-157, TB-500 |
| `pep_longevity` | Langlebigkeit | Epitalon, MOTS-c |
| `pep_nootropic` | Kognition | Semax, Selank |
| `pep_metabolic` | Stoffwechsel/GLP-1 | Retatrutide, Tirzepatide |
| `pep_immune` | Immunsystem | Thymosin Alpha-1 |
| `pep_testo` | Testosteron | Kisspeptin, Gonadorelin |
| `pep_skin` | Haut/Kosmetik | GHK-Cu, Melanotan |

### Blutwert-Trigger (17 Spalten)

Werden aktiviert, wenn Blutwerte ausserhalb der Norm liegen:

| Spalte | Bedingung | Empfehlung bei Trigger |
|--------|-----------|------------------------|
| `bw_cortisol_high` | Cortisol > 25 | Adaptogene erhoehen |
| `bw_testosterone_low` | Testosteron < 300 ng/dL | T-Support erhoehen |
| `bw_vitamin_d_low` | Vitamin D < 30 ng/mL | D3+K2 kritisch |
| `bw_magnesium_low` | Mg < 0.85 mmol/L | Glycinat priorisieren |
| `bw_triglycerides_high` | TG > 150 mg/dL | Omega-3 essenziell |
| `bw_inflammation_high` | hs-CRP > 1 mg/L | Antioxidantien |
| `bw_glucose_high` | Nuechtern-Glukose > 100 | Berberin relevant |
| `bw_insulin_resistant` | HOMA-IR > 2.5 | Metabolic Support |
| `bw_hdl_low` | HDL < 40 mg/dL | Lipid-Support |
| `bw_ldl_high` | LDL > 130 mg/dL | Citrus Bergamot |
| `bw_apob_high` | ApoB > 100 mg/dL | Kardio-Fokus |
| `bw_ferritin_high` | Ferritin > 300 | Blutspende empfohlen |
| `bw_homocysteine_high` | Homocystein > 10 | B-Vitamin-Komplex |
| `bw_nad_low` | NAD-Marker niedrig | NMN/NR kritisch |
| `bw_b12_low` | B12 < 400 pg/mL | Methylcobalamin |
| `bw_iron_low` | Eisen < 60 ug/dL | Eisen-Bisglycinat |
| `bw_thyroid_slow` | TSH > 4 mIU/L | Selen/Jod pruefen |

### Verbindungs-Synergien (9 Spalten)

Spezifische Synergien mit aktiven Substanzen:

| Spalte | Substanz | Typischer Effekt |
|--------|----------|------------------|
| `syn_retatrutide` | Retatrutide (Triple-GLP-1) | +4.0 fuer HMB (Muskelschutz) |
| `syn_tirzepatide` | Tirzepatide (Dual-GLP-1) | +3.0 fuer Elektrolyte |
| `syn_semaglutide` | Semaglutide (Ozempic) | +3.0 fuer B-Vitamine |
| `syn_epitalon` | Epitalon | +2.0 fuer Longevity-Stack |
| `syn_mots_c` | MOTS-c | +2.0 fuer Mitochondrien |
| `syn_bpc_157` | BPC-157 | +1.5 fuer Heilung-Stack |
| `syn_tb_500` | TB-500 | +1.5 fuer Regeneration |
| `syn_cjc_1295` | CJC-1295 | +1.0 fuer GH-Optimierung |
| `syn_ipamorelin` | Ipamorelin | +1.0 fuer GH-Optimierung |

---

## Scoring-Logik (Hintergrund)

```text
Finaler Score = Base Impact Score + Sum(Modifikatoren)

Sicherheits-Constraints:
- MAX_SINGLE_MODIFIER = 4.0 (kein einzelner Boost > 4.0)
- MAX_TOTAL_BOOST = 12.0 (Gesamt-Boost gedeckelt)
- Score geclampt auf 0.0 - 10.0
```

**Tier-Schwellen:**
- Essential: Score >= 9.0
- Optimizer: Score >= 6.0 und < 9.0  
- Niche: Score < 6.0

---

## Technische Umsetzung

### Datei-Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/pages/Admin.tsx` | Export-Card Beschreibung auf "~98 Wirkstoffe" aktualisieren |
| `src/utils/exportMatrixCSV.ts` | Dokumentations-Header in CSV einfuegen (optional) |

### Export-Card Text aktualisieren

Zeile 219-220 in Admin.tsx:
```text
Vorher: "Alle 111 Wirkstoffe mit ~55 Gewichtungs-Modifikatoren als CSV"
Nachher: "~100 bereinigte Wirkstoffe mit 55 Scoring-Modifikatoren. Duplikate entfernt, Sprache normalisiert."
```

### Optionaler CSV-Dokumentations-Header

Am Anfang der CSV eine Erklaerungszeile einfuegen:
```text
# ARES Matrix Export | Legende: phase_X = Phasen-Boost | ctx_* = Kontext | goal_* = Ziele | bw_* = Blutwert-Trigger | syn_* = Synergien | Positive Werte = Boost | Negative = Penalty
```

---

## Erwartetes Ergebnis

1. Admin-UI zeigt korrekte Anzahl (~100 statt 111)
2. CSV ist selbsterklaerend durch Header-Kommentar
3. Dokumentation hier dient als Referenz fuer externe Nutzer
