
# ARES Supplement Master-Katalog: Kuratierte Empfehlungen mit Impact-Score

## Executive Summary

Dieses Update transformiert Layer 3 Supplements vom "Katalog" zum "strategischen Berater". Wir kombinieren:
1. **80+ deutsche Premium-Supplements** mit Markenempfehlungen
2. **ARES Protocol Phasen (0-3)** fuer kontextuelle Relevanz
3. **Impact-Score System (0-10)** fuer klare Priorisierung
4. **Necessity Tiers** (Essential/Optimizer/Specialist) gegen Supplement-Overload
5. **UI mit visueller Hierarchie** - Essentials first, Advanced hidden by default

---

## Teil 1: Datenbank-Migration

**Neue Spalten fuer `supplement_database`:**

```text
+------------------------+---------------+--------------------------------------------+
| Spalte                 | Typ           | Beschreibung                               |
+------------------------+---------------+--------------------------------------------+
| protocol_phase         | integer       | 0=Natural, 1=TRT, 2=Peptid, 3=Longevity   |
| impact_score           | decimal(3,1)  | ARES Impact Score 0.0-10.0                 |
| necessity_tier         | text          | 'essential' / 'optimizer' / 'specialist'  |
| priority_score         | integer       | 1-100 fuer Sortierung innerhalb Tier       |
| evidence_level         | text          | 'stark' / 'moderat' / 'anekdotisch'       |
| hallmarks_addressed    | text[]        | ['sleep','testosterone','energy',...]     |
| cost_per_day_eur       | decimal(5,2)  | Kosten pro Tag fuer Bang-for-Buck          |
| amazon_de_asin         | text          | Optional: Amazon DE Produktlink            |
+------------------------+---------------+--------------------------------------------+
```

**SQL Migration:**
```sql
ALTER TABLE supplement_database 
ADD COLUMN IF NOT EXISTS protocol_phase integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS impact_score decimal(3,1) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS necessity_tier text DEFAULT 'optimizer',
ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS evidence_level text DEFAULT 'moderat',
ADD COLUMN IF NOT EXISTS hallmarks_addressed text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cost_per_day_eur decimal(5,2),
ADD COLUMN IF NOT EXISTS amazon_de_asin text;

-- Constraints
ALTER TABLE supplement_database 
ADD CONSTRAINT check_impact_score CHECK (impact_score >= 0 AND impact_score <= 10),
ADD CONSTRAINT check_necessity_tier CHECK (necessity_tier IN ('essential', 'optimizer', 'specialist'));

-- Indexes fuer schnelle Filterung
CREATE INDEX IF NOT EXISTS idx_supps_phase ON supplement_database(protocol_phase);
CREATE INDEX IF NOT EXISTS idx_supps_tier ON supplement_database(necessity_tier);
CREATE INDEX IF NOT EXISTS idx_supps_impact ON supplement_database(impact_score DESC);

-- Kommentare
COMMENT ON COLUMN supplement_database.impact_score IS 'ARES Impact Score: 9-10 Essential, 7-8 Optimizer, <7 Specialist';
COMMENT ON COLUMN supplement_database.necessity_tier IS 'essential = Must-have, optimizer = Should-have, specialist = Nice-to-have';
```

---

## Teil 2: ARES Impact Score System

### Die Philosophie

Der Impact Score basiert auf zwei Faktoren:
- **Evidenz-Qualitaet** (40%): Meta-Analysen > RCTs > Ratten-Studien
- **Effektstaerke** (60%): Wie gross ist der messbare Hebel?

### Tier-Hierarchie

```text
+----------------------+-------------+------------------------------------------+
| Tier                 | Impact      | Beschreibung                             |
+----------------------+-------------+------------------------------------------+
| THE ESSENTIALS       | 9.0 - 10.0  | Non-Negotiables. Jeder sollte nehmen.    |
| THE OPTIMIZERS       | 7.0 - 8.9   | Spezifisch fuer Probleme/Ziele.          |
| THE SPECIALISTS      | < 7.0       | Nische/Teuer/Experimentell.              |
+----------------------+-------------+------------------------------------------+
```

### Beispiel-Bewertungen (Phase 0 - Fundament)

**THE ESSENTIALS (Impact 9-10):**
| Supplement | Impact | Evidenz | Begruendung |
|------------|--------|---------|-------------|
| Creatin Monohydrat | 9.8 | stark | 1000+ Studien, kognitive + physische Benefits, guenstig |
| Magnesium Glycinat | 9.5 | stark | 75% mangelhaft, Schlaf + Muskeln + Herz |
| Omega-3 (EPA/DHA) | 9.2 | stark | Meta-Analysen bestaetigen anti-inflammatorisch |
| Vitamin D3+K2 | 9.0 | stark | Hormon-Vorstufe, 60%+ defizitaer in DACH |

**THE OPTIMIZERS (Impact 7-8.9):**
| Supplement | Impact | Evidenz | Begruendung |
|------------|--------|---------|-------------|
| Ashwagandha KSM-66 | 7.8 | stark | Cortisol-Reduktion, aber nur bei Stress relevant |
| Zink Bisglycinat | 7.5 | stark | Wichtig bei Testo-Mangel, sonst weniger relevant |
| CoQ10 Ubiquinol | 7.2 | moderat | Ab 40+ oder Statin-User besonders relevant |

**THE SPECIALISTS (Impact <7):**
| Supplement | Impact | Evidenz | Begruendung |
|------------|--------|---------|-------------|
| NMN sublingual | 5.5 | moderat | Teuer (3-5 EUR/Tag), mixed human data |
| Tongkat Ali | 6.5 | moderat | Funktioniert, aber Nische |
| Rapamycin | 6.0 | moderat | Nur Phase 3, Rx required |

---

## Teil 3: Supplement-Katalog (80+ Eintraege)

### Phase 0: Fundament (Natural Stack) - 35 Supplements

**Kategorie: Schlaf (5 Supplements)**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Magnesium Glycinat | 400mg | bedtime | Sunday Natural | 9.5 | essential |
| L-Theanin | 200mg | bedtime | Now Foods | 7.5 | optimizer |
| Apigenin | 50mg | bedtime | Double Wood | 7.0 | optimizer |
| Glycin | 3g | bedtime | Bulk | 7.2 | optimizer |
| Taurin | 2g | bedtime | ESN | 6.8 | specialist |

**Kategorie: Testosteron-Optimierung (6 Supplements)**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Vitamin D3+K2 | 5000 IU + 200mcg | with_fats | Sunday Natural | 9.0 | essential |
| Zink Bisglycinat | 25mg | fasted | Sunday Natural | 7.5 | optimizer |
| Bor | 10mg | morning | Now Foods | 7.0 | optimizer |
| Tongkat Ali | 400mg | morning | Double Wood | 6.5 | specialist |
| Fadogia Agrestis | 600mg | morning | Double Wood | 6.0 | specialist |
| Shilajit | 500mg | morning | Primavie | 6.2 | specialist |

**Kategorie: Energie & Mitochondrien (4 Supplements)**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Creatine Monohydrat | 5g | any | ESN | 9.8 | essential |
| CoQ10 Ubiquinol | 100mg | with_fats | Kaneka | 7.2 | optimizer |
| PQQ | 20mg | morning | Now Foods | 6.5 | specialist |
| Alpha-Liponsaeure | 600mg | fasted | Sunday Natural | 6.8 | specialist |

**Kategorie: Darm & Entzuendung (4 Supplements)**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Omega-3 (EPA/DHA) | 3g | with_fats | Nordic Naturals | 9.2 | essential |
| Curcumin Longvida | 500mg | with_fats | ProHealth | 7.0 | optimizer |
| Probiotika Multi-Strain | 50B CFU | fasted | Garden of Life | 7.3 | optimizer |
| L-Glutamin | 5g | fasted | Bulk | 6.5 | specialist |

**Kategorie: Stress & Adaptogene (3 Supplements)**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Ashwagandha KSM-66 | 600mg | evening | Sunday Natural | 7.8 | optimizer |
| Rhodiola Rosea | 400mg | morning | Now Foods | 7.0 | optimizer |
| Bacopa Monnieri | 300mg | morning | Synapsa | 6.8 | specialist |

---

### Phase 1: Rekomposition (TRT/GLP-1 Support) - 20 Supplements

**TRT-Support (6 Supplements):**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Citrus Bergamot | 1000mg | morning | ProHealth | 8.5 | essential |
| TUDCA | 500mg | fasted | Double Wood | 8.0 | essential |
| DIM | 200mg | evening | Thorne | 7.5 | optimizer |
| Taurin (Herz) | 3g | morning | Bulk | 7.8 | optimizer |
| DHEA | 25mg | morning | Life Extension | 6.5 | specialist |
| Pregnenolon | 50mg | morning | Life Extension | 6.0 | specialist |

**GLP-1 Support (4 Supplements):**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Elektrolyte | 3g | any | LMNT | 9.0 | essential |
| Digestive Enzymes | 2 Kaps | with_food | NOW | 7.2 | optimizer |
| Lipase + Ox Bile | 500mg | with_fats | Seeking Health | 7.0 | optimizer |
| Psyllium Husk | 5g | evening | NOW | 6.8 | optimizer |

**Muskelerhalt (4 Supplements):**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| EAA Komplex | 10g | pre_workout | ESN | 8.0 | essential |
| HMB | 3g | with_food | Bulk | 7.5 | optimizer |
| Citrullin Malat | 6g | pre_workout | Bulk | 7.2 | optimizer |
| Beta-Alanin | 3g | pre_workout | ESN | 6.8 | optimizer |

---

### Phase 2: Fine-tuning (Peptid-Synergie) - 12 Supplements

**Peptid-Optimierung:**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Vitamin C (liposomal) | 2g | morning | LivOn Labs | 8.0 | essential |
| MSM | 3g | morning | Doctor's Best | 7.0 | optimizer |
| Kollagen Peptide | 10g | morning | Great Lakes | 7.5 | optimizer |
| Silizium (OSA) | 10mg | morning | Biosil | 6.5 | specialist |
| Hyaluronsaeure | 200mg | morning | Now Foods | 6.2 | specialist |

**NAD+ Stack:**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| NMN sublingual | 500mg | fasted | ProHealth | 5.5 | specialist |
| Trans-Resveratrol | 500mg | fasted | Thorne | 6.0 | specialist |
| Quercetin | 500mg | fasted | Thorne | 6.5 | specialist |
| Fisetin | 500mg | fasted | Doctor's Best | 6.0 | specialist |

---

### Phase 3: Longevity (Advanced) - 10 Supplements

**Rapamycin-Synergie:**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Rapamycin | 6mg/week | weekly | Rx | 6.0 | specialist |
| Metformin | 500-1000mg | evening | Rx | 6.5 | specialist |
| Acarbose | 50mg | with_food | Rx | 5.5 | specialist |
| Ca-AKG | 1g | fasted | Rejuvant | 6.0 | specialist |

**Senolytika (Pulsed):**
| Name | Dosierung | Timing | Marke | Impact | Tier |
|------|-----------|--------|-------|--------|------|
| Dasatinib | 100mg | pulsed | Rx | 5.0 | specialist |
| Fisetin Mega-Dose | 1500mg | pulsed | Doctor's Best | 5.5 | specialist |

---

## Teil 4: Neue UI-Komponenten

### 4.1 PhasedSupplementBrowser.tsx

**Datei:** `src/components/supplements/PhasedSupplementBrowser.tsx`

**Layout:**
```text
+---------------------------------------------------------------+
| [Phase 0] [Phase 1] [Phase 2] [Phase 3]    [x] Nur Essentials |
+---------------------------------------------------------------+
| Phase 0: Fundament                         Deine aktuelle Phase |
+---------------------------------------------------------------+
|                                                                 |
| THE ESSENTIALS (Non-Negotiables)                               |
| ┌─────────────────────────────────────────────────────────────┐|
| │ ⚡ 9.8   Creatine Monohydrat              [+ Hinzufuegen]  │|
| │         5g täglich • ESN                                    │|
| │         📚 Starke Evidenz                                   │|
| ├─────────────────────────────────────────────────────────────┤|
| │ ⚡ 9.5   Magnesium Glycinat               [+ Hinzufuegen]  │|
| │         400mg bedtime • Sunday Natural                      │|
| │         📚 Starke Evidenz                                   │|
| └─────────────────────────────────────────────────────────────┘|
|                                                                 |
| TARGETED OPTIMIZERS (Wenn relevant)                            |
| ┌─────────────────────────────────────────────────────────────┐|
| │ ⚡ 7.8   Ashwagandha KSM-66               [+ Hinzufuegen]  │|
| │         600mg evening • Sunday Natural    Stress-Reduktion  │|
| └─────────────────────────────────────────────────────────────┘|
|                                                                 |
| ▼ ADVANCED/EXPERIMENTAL (5 Supplements)         [Ausklappen]   |
|                                                                 |
+---------------------------------------------------------------+
```

**Features:**
- Tab-Navigation fuer Phasen 0-3
- User's aktuelle Phase (aus `useProtocolStatus`) hervorgehoben
- Toggle: "Nur Essentials anzeigen" (Default: ON fuer Anfaenger)
- 3 Sektionen: Essentials (gross) > Optimizers (mittel) > Specialists (collapsed)
- Impact-Badge mit Score (z.B. "⚡ 9.8")
- Evidenz-Badge (gruen=stark, gelb=moderat, orange=anekdotisch)
- Markenempfehlung als Chip
- "Hinzufuegen" Button oeffnet Modal mit Pre-Fill
- Locked-State fuer hoehere Phasen (Phase 2/3 ausgegraut wenn User in Phase 0/1)

### 4.2 SupplementRecommendationCard.tsx

**Datei:** `src/components/supplements/SupplementRecommendationCard.tsx`

**Features:**
- Kompakte Karte fuer ein empfohlenes Supplement
- Zeigt: Name, Impact-Score, Dosierung, Timing-Icon, Marke, Evidenz
- Visual Hierarchy:
  - Essential: Volle Breite, grosser Impact-Badge
  - Optimizer: Kompakter, normaler Badge
  - Specialist: Minimal, grau-out
- "+" Button zum schnellen Hinzufuegen

### 4.3 Erweiterung SupplementsPage.tsx

**Aenderungen:**
- Neuer Tab "Empfehlungen" hinzufuegen (3 Tabs total):
  - Timeline (Execution) - besteht
  - Inventar (Management) - besteht
  - Empfehlungen (Discovery) - NEU
- Integration mit `useProtocolStatus` fuer aktuelle Phase
- Stats-Row erweitern: Zeige User-Phase + "X Essentials fehlen"

---

## Teil 5: Neue Types & Hooks

### 5.1 Erweiterung Types

**Datei:** `src/types/supplementLibrary.ts`

```typescript
// Neue Typen
export type EvidenceLevel = 'stark' | 'moderat' | 'anekdotisch';
export type NecessityTier = 'essential' | 'optimizer' | 'specialist';

export interface SupplementLibraryItem {
  // ... bestehende Felder
  protocol_phase: number;
  impact_score: number;
  necessity_tier: NecessityTier;
  priority_score: number;
  evidence_level: EvidenceLevel;
  hallmarks_addressed: string[];
  cost_per_day_eur?: number;
  amazon_de_asin?: string;
}

export const EVIDENCE_LEVEL_CONFIG: Record<EvidenceLevel, { 
  label: string; 
  color: string; 
  description: string 
}> = {
  stark: { 
    label: 'Starke Evidenz', 
    color: 'green',
    description: 'Meta-Analysen & RCTs bestaetigen Wirkung'
  },
  moderat: { 
    label: 'Moderate Evidenz', 
    color: 'yellow',
    description: 'Einzelne RCTs oder starke mechanistische Daten'
  },
  anekdotisch: { 
    label: 'Anekdotisch', 
    color: 'orange',
    description: 'Tierstudien oder N=1 Erfahrungsberichte'
  }
};

export const NECESSITY_TIER_CONFIG: Record<NecessityTier, {
  label: string;
  description: string;
  icon: string;
  impactRange: string;
}> = {
  essential: {
    label: 'THE ESSENTIALS',
    description: 'Non-Negotiables. Jeder sollte diese nehmen.',
    icon: '🚨',
    impactRange: '9.0 - 10.0'
  },
  optimizer: {
    label: 'TARGETED OPTIMIZERS',
    description: 'Fuer spezifische Ziele oder Maengel.',
    icon: '🚀',
    impactRange: '7.0 - 8.9'
  },
  specialist: {
    label: 'ADVANCED/EXPERIMENTAL',
    description: 'Nische, teuer oder experimentell.',
    icon: '🧪',
    impactRange: '< 7.0'
  }
};

export const PHASE_CONFIG: Record<number, {
  label: string;
  description: string;
  icon: string;
  subtitle: string;
}> = {
  0: { 
    label: 'Fundament', 
    description: 'Natural Stack fuer alle',
    icon: '🌱',
    subtitle: 'Phase 0'
  },
  1: { 
    label: 'Rekomposition', 
    description: 'TRT/GLP-1 Support',
    icon: '💪',
    subtitle: 'Phase 1'
  },
  2: { 
    label: 'Fine-tuning', 
    description: 'Peptid-Synergie',
    icon: '🔬',
    subtitle: 'Phase 2'
  },
  3: { 
    label: 'Longevity', 
    description: 'Advanced Stack',
    icon: '🧬',
    subtitle: 'Phase 3'
  }
};
```

### 5.2 Neue Queries

**Datei:** `src/hooks/useSupplementLibrary.ts`

```typescript
// Fetch supplements by phase with tier grouping
export const useSupplementsByPhase = (phase: number) => {
  return useQuery({
    queryKey: [...SUPPLEMENT_LIBRARY_KEYS.library, 'phase', phase],
    queryFn: async (): Promise<{
      essentials: SupplementLibraryItem[];
      optimizers: SupplementLibraryItem[];
      specialists: SupplementLibraryItem[];
    }> => {
      const { data, error } = await supabase
        .from('supplement_database')
        .select('*')
        .eq('protocol_phase', phase)
        .order('impact_score', { ascending: false });

      if (error) throw error;

      const supplements = (data || []).map(mapToLibraryItem);
      
      return {
        essentials: supplements.filter(s => s.necessity_tier === 'essential'),
        optimizers: supplements.filter(s => s.necessity_tier === 'optimizer'),
        specialists: supplements.filter(s => s.necessity_tier === 'specialist'),
      };
    },
    staleTime: 1000 * 60 * 10,
  });
};

// Get user's missing essentials
export const useMissingEssentials = (userPhase: number) => {
  const { data: stack } = useUserStack();
  const { data: phaseSupplements } = useSupplementsByPhase(userPhase);

  const userSupplementNames = new Set(
    (stack || []).map(s => s.name.toLowerCase())
  );

  const missingEssentials = (phaseSupplements?.essentials || []).filter(
    s => !userSupplementNames.has(s.name.toLowerCase())
  );

  return {
    missingEssentials,
    missingCount: missingEssentials.length,
    totalEssentials: phaseSupplements?.essentials?.length || 0,
  };
};
```

---

## Teil 6: Daten-Seeding

### 6.1 Katalog-Datei

**Datei:** `src/data/aresSupplementCatalog.ts`

Enthaelt alle 80+ Supplements mit vollstaendigen Daten:
- Name, Kategorie, Dosierung, Einheit
- Timing-Constraint, Interaction-Tags
- Markenempfehlung, Beschreibung
- protocol_phase, impact_score, necessity_tier
- evidence_level, hallmarks_addressed
- cost_per_day_eur (optional)

### 6.2 Seed Edge Function

**Datei:** `supabase/functions/seed-supplement-catalog/index.ts`

**Features:**
- Nimmt Katalog-Array als Request Body
- Upsert-Logik (Update bei Name-Match, Insert bei neu)
- Validierung aller Felder
- Returns: `{ added: X, updated: Y, errors: [] }`

---

## Teil 7: Implementierungsreihenfolge

| Schritt | Datei/Aktion | Beschreibung | Prioritaet |
|---------|--------------|--------------|------------|
| 1 | **DB Migration** | Neue Spalten + Constraints + Indexes | HOCH |
| 2 | `src/types/supplementLibrary.ts` | Types erweitern (EvidenceLevel, NecessityTier, etc.) | HOCH |
| 3 | `src/data/aresSupplementCatalog.ts` | Katalog mit 80+ Eintraegen erstellen | HOCH |
| 4 | `supabase/functions/seed-supplement-catalog/` | Edge Function fuer Import | HOCH |
| 5 | **Seed ausfuehren** | Katalog in DB importieren | HOCH |
| 6 | `src/hooks/useSupplementLibrary.ts` | Neue Queries (useSupplementsByPhase, useMissingEssentials) | MITTEL |
| 7 | `src/components/supplements/SupplementRecommendationCard.tsx` | Einzelne Empfehlungs-Karte | MITTEL |
| 8 | `src/components/supplements/PhasedSupplementBrowser.tsx` | Phasen-Browser mit Tier-Hierarchie | MITTEL |
| 9 | `src/pages/SupplementsPage.tsx` | 3. Tab "Empfehlungen" integrieren | MITTEL |
| 10 | **Update bestehende Supplements** | Vorhandene 45 Supplements mit Impact Scores aktualisieren | MITTEL |
| 11 | **Testing** | End-to-End Test des kompletten Flows | HOCH |

---

## Erwartetes Ergebnis

Nach Umsetzung:

1. **80+ deutsche Supplements** mit Markenempfehlungen in der DB
2. **Impact-Score System** schuetzt vor Supplement-Overload
3. **Visuelle Hierarchie**: Essentials sofort sichtbar, Specialists versteckt
4. **Phasen-Awareness**: User sieht nur relevante Supplements
5. **"X Essentials fehlen"** Indikator motiviert zur Vervollstaendigung
6. **Ein-Klick Hinzufuegen** mit Pre-Fill aus dem Katalog

**Differenzierung von anderen Apps:**
- Nicht "Was gibt es?", sondern "Was brauche ich wirklich?"
- Deutsche Marken statt US-only
- ARES Protocol Integration
- Wissenschaftliche Evidenz transparent
- Kosten/Nutzen sichtbar (Bang for Buck)

**User Experience:**
- Anfaenger: Sieht nur 4-5 Essentials, nicht ueberfordert
- Fortgeschrittene: Kann Optimizers erkunden
- Biohacker: Kann Specialists freischalten
