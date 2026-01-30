
# ARES Instant Check - Phase & Protocol Enhancement

## Problem-Analyse

Der aktuelle Prompt zeigt nur `protocol_mode: enhanced`, aber es fehlen:

1. **Phase 0-3 Kontext** - Komplett nicht geladen/erklärt
2. **Natural vs. Enhanced vs. Clinical Status** - Nicht maschinenlesbar erklärt
3. **TRT-Status** - Nicht erkannt
4. **Wichtige Phasen-Details** - Was bedeutet jede Phase für Supplement-Empfehlungen?

## Was fehlt im aktuellen Prompt

### 1. Phase-System (aus `user_protocol_status`)

| Phase | Name | Bedeutung für Supplements |
|-------|------|---------------------------|
| **0** | Fundament | Basis-Stack fokussiert auf Schlaf, Vitamin D, Magnesium, Omega-3. Keine Peptide, keine Longevity-Supplements. Der User baut gerade seine Lifestyle-Basics auf. |
| **1** | Rekomposition | GLP-1/Enhanced erlaubt. Elektrolyte, Verdauungsenzyme, HMB für Muskelerhalt werden wichtig. User ist in aktivem Defizit. |
| **2** | Fine-Tuning | Peptid-Synergie-Supplements (NAD+, Kollagen, MSM). Der User optimiert mit Peptiden wie BPC-157/TB-500. |
| **3** | Longevity | Rapamycin-Synergie, Senolytika (Fisetin, Quercetin), Ca-AKG. Fortgeschrittener User mit ärztlicher Betreuung. |

### 2. Protocol Mode Interpretation

| Mode | Bedeutung | Supplement-Implikation |
|------|-----------|------------------------|
| **natural** | Keine Peptide, kein TRT | Konservative Dosen, Fokus auf Basis |
| **enhanced** | GLP-1/Peptide aktiv (OHNE TRT) | Elektrolyte kritisch, Verdauungsenzyme, höherer Protein-Bedarf |
| **clinical** | TRT/HRT aktiv | Testosteron-Booster sinnlos, Estrogen-Management relevant |
| **enhanced,clinical** | Peptide UND TRT | Maximale Synergie möglich, aggressive Stacks erlaubt |

### 3. Fehlende Datenquellen

| Datenquelle | Tabelle | Relevanz |
|-------------|---------|----------|
| Phase-Status | `user_protocol_status.current_phase` | Was darf der User überhaupt nehmen? |
| Phase-0-Checklist | `user_protocol_status.phase_0_checklist` | Wo hat der User noch Lücken? |
| Phase-1-Ziel KFA | `user_protocol_status.phase_1_target_kfa` | Wie aggressiv ist das Defizit? |
| TRT-Detection | Ableitung aus `protocol_mode` ODER `peptide_protocols` | Macht Testosteron-Booster Sinn? |
| GLP-1-Detection | Ableitung aus `peptide_protocols` (Reta, Tirze, Sema) | Elektrolyte, Übelkeits-Management |
| Calorie-Deficit | `profiles.calorie_deficit` | Ist Muskelschutz ein Thema? |

## Implementierungsplan

### Teil 1: Erweiterte Datenladung in Edge Function

Neue Datenquelle hinzufügen:

```typescript
// 8. Protocol Status (NEU: Phase + Checklist)
svcClient
  .from('user_protocol_status')
  .select('current_phase, phase_0_checklist, phase_1_target_kfa, is_paused, protocol_mode')
  .eq('user_id', userId)
  .maybeSingle(),
```

### Teil 2: Phasen-Kontext für Prompt berechnen

Neue Helper-Funktionen:

```typescript
// GLP-1 Agents für Detection
const GLP1_AGENTS = ['retatrutide', 'tirzepatide', 'semaglutide', 'reta', 'tirze', 'sema', 'ozempic', 'wegovy', 'mounjaro'];

// TRT Agents für Detection
const TRT_AGENTS = ['testosterone', 'trt', 'test e', 'test c', 'enanthate', 'cypionate', 'sustanon', 'nebido'];

// Detect GLP-1 status from active peptides
function isOnGLP1(peptides: string[]): boolean {
  return peptides.some(p => 
    GLP1_AGENTS.some(agent => p.toLowerCase().includes(agent))
  );
}

// Detect TRT status from protocol_mode or peptides
function isOnTRT(protocolMode: string, peptides: string[]): boolean {
  if (protocolMode.includes('clinical')) return true;
  return peptides.some(p => 
    TRT_AGENTS.some(agent => p.toLowerCase().includes(agent))
  );
}
```

### Teil 3: Prompt-Erweiterung mit Phase-Kontext

Neuer Prompt-Block zwischen USER KONTEXT und AKTUELLER STACK:

```text
## PHASE-STATUS
- Aktuelle Phase: [0-3] - [Phasen-Name]
- Phasen-Beschreibung: [Was bedeutet diese Phase für Supplement-Empfehlungen]
- Phase 0 Fortschritt: [X/9 Items abgeschlossen] (nur wenn Phase 0)
- Fehlende Items: [Liste der offenen Phase-0-Punkte]
- Protokoll pausiert: [Ja/Nein]

## BIOMARKER-STATUS
- Natural/Enhanced: [True Natural | Enhanced (Peptide ohne TRT) | Clinical (TRT) | Combined]
- GLP-1 aktiv: [Ja/Nein] → Wenn ja: Elektrolyte, Verdauungsenzyme, Übelkeits-Management wichtig
- TRT aktiv: [Ja/Nein] → Wenn ja: Testosteron-Booster sinnlos, Estrogen-Management prüfen
- Kalorienstatus: [Defizit -X kcal | Maintenance | Surplus +X kcal]
```

### Teil 4: Phasen-Bedeutung für AI

Maschinenlesbarer Kontext für jede Phase:

```typescript
const PHASE_CONTEXT: Record<number, { name: string; focus: string; allowed: string; forbidden: string }> = {
  0: {
    name: 'FUNDAMENT',
    focus: 'Lifestyle-Basics: Schlaf, Bewegung, Ernährung',
    allowed: 'Basis-Supplements: Vitamin D, Magnesium, Omega-3, Zink, Kreatin',
    forbidden: 'Keine Peptide, keine Longevity-Stacks, keine experimentellen Substanzen'
  },
  1: {
    name: 'REKOMPOSITION',
    focus: 'Aktiver Fettabbau, GLP-1/Enhanced erlaubt',
    allowed: 'GLP-1-Support (Elektrolyte, Verdauungsenzyme), Muskelerhalt (HMB, EAA)',
    forbidden: 'Noch keine Longevity-Peptide (Epitalon etc.)'
  },
  2: {
    name: 'FINE-TUNING',
    focus: 'Peptid-Optimierung, Regeneration',
    allowed: 'NAD+-Stack, Kollagen-Synergie, BPC-157/TB-500 Support',
    forbidden: 'Noch kein Rapamycin oder mTOR-Inhibitoren'
  },
  3: {
    name: 'LONGEVITY',
    focus: 'Langlebigkeit, Senolytika, mTOR-Modulation',
    allowed: 'Rapamycin-Synergie, Ca-AKG, Senolytika (Fisetin/Quercetin)',
    forbidden: 'Keine Einschränkungen für fortgeschrittene User'
  }
};
```

### Teil 5: Vollständiger erweiterter Prompt

Der neue userPrompt wird so aussehen:

```text
## USER KONTEXT
- Protokoll: enhanced
- Ziel: lose (2044 kcal/Tag)
- Alter: 41 | Gewicht: 100.80kg | Geschlecht: male
- Kaloriendefizit: -674 kcal/Tag → Muskelerhalt relevant!

## PHASE-STATUS
- Aktuelle Phase: 0 - FUNDAMENT
- Fokus: Lifestyle-Basics: Schlaf, Bewegung, Ernährung
- Erlaubte Supplements: Basis-Supplements: Vitamin D, Magnesium, Omega-3, Zink, Kreatin
- Nicht empfohlen in dieser Phase: Keine Peptide, keine Longevity-Stacks
- Phase 0 Fortschritt: 6/9 Items abgeschlossen
- Offene Items: bloodwork_baseline, protein_training

## BIOMARKER-STATUS
- Modus: Enhanced (Peptide/GLP-1 geplant, ohne TRT)
- GLP-1 aktiv: Nein (noch keine GLP-1-Protokolle)
- TRT aktiv: Nein
- Kaloriendefizit: -674 kcal → AGGRESSIV, Muskelschutz kritisch!

## AKTUELLER STACK
- Magnesium Komplex 11 Ultra (200mg, Abends)
- Zink (15mg, Abends)
[... rest des Stacks ...]

## AKTIVE PEPTIDE
Keine aktiven Protokolle

## RELEVANTE BLUTWERTE
Keine Blutwerte vorhanden

## BEKANNTE PRÄFERENZEN
- Trainiert morgens nüchtern
- Nimmt Zink 15mg abends
[...]

## ZU PRÜFENDES SUPPLEMENT
- Name: Ecdysteron
- Marke: unbekannt
- Dosis: 1 Kapseln
- Timing: Vor Training

## AUFGABE
Bewerte dieses Supplement für Mathias:
1. Passt es zu den Zielen UND zur aktuellen Phase?
2. Ist das Timing optimal?
3. Ist die Dosis angemessen?
4. Gibt es Interaktionen mit dem Stack/Peptiden?
5. Passt es zum Protokoll-Status (Natural/Enhanced/Clinical)?
6. Bei Phase 0: Ist es ein sinnvolles Basis-Supplement oder verfrüht?
```

## Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `supabase/functions/ares-instant-check/index.ts` | Erweiterte Datenladung + Phasen-Kontext + Biomarker-Detection |

## Erwartetes Ergebnis

LESTER wird jetzt wissen:
- User ist in Phase 0 (Fundament) → Ecdysteron ist ein "Optimizer", kein Essential
- User hat protocol_mode = enhanced → Plant GLP-1, aber noch nicht aktiv
- User ist im Defizit (-674 kcal) → Muskelerhalt relevant
- User hat KEINE aktiven Peptide → True Natural aktuell, trotz "enhanced" Setting
- Phase 0 noch nicht abgeschlossen → Blutwerte fehlen!

LESTER könnte dann antworten:
> "Ecdysteron ist ein spannendes Phytosteroid für mTOR-Aktivierung, aber du bist noch in Phase 0 (Fundament). Ich würde erst die Basics abschließen - dir fehlen noch Blutwerte und Protein-Tracking. Wenn du aber im aggressiven Defizit (-674kcal) Muskelschutz brauchst, kann Ecdysteron durchaus helfen..."
