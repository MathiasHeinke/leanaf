
# Ingredient-Matching Erweiterung fuer 54 fehlende Supplements

## Ausgangssituation

Die Datenbank-Analyse zeigt genau **54 Supplements mit leerer Matrix**:

| Kategorie | Fehlende Eintraege |
|-----------|-------------------|
| Magnesium-Varianten | Magnesium Glycinat, Magnesiumcitrat, Magnesium Komplex 11 Ultra |
| Vitamin-Varianten | Vitamin D3 + K2 MK7 Tropfen, Vitamin D Balance, Vitamin C, Vitamin C (liposomal), Methyl Folate, A-Z Komplex, Multivitamin |
| Creatin-Varianten | Creatine Monohydrat |
| Ashwagandha-Varianten | Ashwagandha KSM-66 |
| Curcumin-Varianten | Curcumin Longvida |
| NAC-Varianten | NAC, GlyNAC |
| NMN-Varianten | NMN (Nicotinamid Mononukleotid), NMN sublingual |
| Kollagen-Varianten | Kollagen, Kollagen Peptide |
| HMB-Varianten | HMB 3000 |
| EAA-Varianten | EAA Komplex |
| Probiotika-Varianten | Probiona Kulturen Komplex, Probiotika Multi-Strain |
| Zink-Varianten | Zink Bisglycinat, Zinc Complex |
| Resveratrol-Varianten | Resveratrol, Trans-Resveratrol |
| Longevity | Alpha-Ketoglutarat (AKG), CaAKG, Alpha-Liponsaeure, Pterostilben, TUDCA, Urolithin A |
| Aminosaeuren | L-Citrullin, Taurin (kardioprotektiv) |
| Sonstige | Elektrolyte (LMNT), Shilajit, Silymarin, Pinienrinden Extrakt, Schwarzkuemmeloel 1000, Turkesterone Max, Omega-3 (EPA/DHA), Protein Pulver |
| Stack-Produkte (Skip) | Pre-Workout Komplex, Sport Stack, Nootropic, Schlaf, Frauen, Augen, Beauty, Haare, Gelenke |
| Pharma (Skip) | Metformin, Methylenblau 1% |

---

## Technische Implementierung

### Schritt 1: Frontend-Matcher aktualisieren

**Datei:** `src/lib/matrixIngredientMatcher.ts`

Erweiterung der `MANUAL_OVERRIDES` mit allen fehlenden Mappings:

```text
// Vitamins - EXTENDED
'vit_d3': + 'vitamin d3 + k2', 'vitamin d3 + k2 mk7 tropfen', 'vitamin d balance'
'vit_c': + 'vitamin c liposomal'
'folate': ['folat', 'methyl folate', '5-mthf', 'methylfolat'] (NEU)
'multivitamin': ['multivitamin', 'a-z komplex', 'multi'] (NEU)

// Minerals - EXTENDED  
'magnesium': + 'magnesium glycinat', 'magnesiumcitrat'
'mg_threonate': + 'magnesium komplex 11 ultra', 'magnesium komplex'
'zinc': + 'zink bisglycinat', 'zinc complex'

// Amino acids - EXTENDED
'taurine': + 'taurin kardioprotektiv', 'taurin (kardioprotektiv)'
'eaa': + 'eaa komplex'
'hmb': + 'hmb 3000'
'glynac': ['glynac', 'gly-nac', 'glycin + nac'] (NEU)

// Fatty acids - EXTENDED
'omega3_epa': + 'omega-3 (epa/dha)', 'omega-3 epa/dha'

// Adaptogens - EXTENDED
'ashwagandha': + 'ashwagandha ksm-66', 'ksm66'
'curcumin': + 'curcumin longvida'
'resveratrol': + 'trans-resveratrol', 'liposomales nad+ & trans-resveratrol'
'shilajit': ['shilajit', 'mumijo'] (NEU)
'turkesterone': ['turkesterone', 'turkesterone max'] (NEU)

// Longevity - EXTENDED
'nmn': + 'nmn sublingual', 'nmn (nicotinamid mononukleotid)'
'urolithin_a': + 'urolithin'
'pterostilbene': ['pterostilben', 'pterostilbene'] (NEU)
'akg': ['alpha-ketoglutarat', 'akg', 'ca-akg', 'caakg', 'rejuvant'] (NEU)

// Collagen - EXTENDED
'collagen': + 'kollagen peptide'
'collagen_peptides': + 'kollagen peptide'

// Gut health - EXTENDED
'probiotics_lacto': + 'probiona kulturen komplex', 'probiotika multi-strain'

// Other - NEW ENTRIES
'electrolytes': ['elektrolyte', 'lmnt', 'elektrolyte (lmnt)'] (NEU)
'milk_thistle': ['silymarin', 'mariendistel'] (NEU)
'pine_bark': ['pinienrinden extrakt', 'opc', 'pycnogenol'] (NEU)
'black_seed_oil': ['schwarzkuemmeloel 1000', 'schwarzkuemmeloel'] (NEU)
'whey': + 'protein pulver'
```

### Schritt 2: Edge-Function aktualisieren

**Datei:** `supabase/functions/import-matrix/index.ts`

Dieselben Erweiterungen an der `MANUAL_OVERRIDES` Konstante vornehmen, damit die serverseitige Matching-Logik synchron ist.

### Schritt 3: Edge-Function deployen

Nach dem Update die Edge-Function neu deployen:
- `import-matrix` Function wird automatisch deployed

### Schritt 4: Re-Import ausfuehren

Die bestehende Matrix-Daten erneut durch die Edge-Function verarbeiten lassen. Da die Matcher jetzt erweitert sind, werden die 43 Varianten-Supplements korrekt zugeordnet.

---

## Erwartetes Ergebnis

| Status | Anzahl | Beispiele |
|--------|--------|-----------|
| **Matrix zugewiesen** | ~100 von 111 (90%) | Magnesium Glycinat, Ashwagandha KSM-66, NMN sublingual |
| **Stack-Produkte (Skip)** | 9 | Pre-Workout, Nootropic, Schlaf, Sport Stack, etc. |
| **Pharma (Skip)** | 2 | Metformin, Methylenblau |

---

## Validierung nach Import

Stichproben-Queries zur Verifikation:
1. `Ashwagandha KSM-66` hat `context_modifiers.on_trt`
2. `Magnesium Glycinat` hat `goal_modifiers.sleep_optimization`
3. `NMN sublingual` hat `bloodwork_triggers.nad_low`
