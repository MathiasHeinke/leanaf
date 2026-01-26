

# Chemistry Stack & Body Stack: Zwei neue Quick-Log Overlays

## Uebersicht

Basierend auf dem bestehenden `QuickLogSheet`-Pattern bauen wir zwei neue Premium-Overlays:

1. **Chemistry Stack Sheet**: Supplements + Peptide (ersetzt `QuickSupplementsModal`)
2. **Body Stack Sheet**: Gewicht + Massband (neues kombiniertes Overlay)

```text
QUICK ACTIONS MENU (+ Button)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🍽️ Mahlzeit      → QuickMealSheet
    💪 Workout       → QuickLogSheet (Training Tab)
    🌙 Schlaf        → QuickLogSheet (Sleep Tab)
    💊 Supps         → ChemistryStackSheet ← NEU
    💧 Getränke      → QuickFluidModal (bleibt lean)
    🧪 Blutwerte     → /bloodwork
    📏 Körper        → BodyStackSheet ← NEU (ersetzt Weight im QuickLogSheet)
```

---

## 1. ChemistryStackSheet - Supplements & Peptide

### UI-Design

```text
┌─────────────────────────────────────────┐
│          ═══ (Drag Handle) ═══          │
│                                         │
│  Chemistry Stack                    ✕   │
│                                         │
│   ┌───────────────┬───────────────┐    │
│   │  💊 Supps     │  💉 Peptide   │ ← Segmented Control
│   │      ●        │               │    │
│   └───────────────┴───────────────┘    │
│                                         │
│  ═══════════════════════════════════   │
│                                         │
│  TAB: SUPPLEMENTS                       │
│  ┌─────────────────────────────────┐   │
│  │ 🌅 Morgens           3/3  ✓    │ ← Timing Groups
│  │ ☀️ Mittags           0/2       │   │
│  │ 🌙 Abends            0/4       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      ✓  Alle nehmen             │ ← Quick Action
│  └─────────────────────────────────┘   │
│                                         │
│  ▼ Ungeplantes hinzufügen              │ ← Accordion
│                                         │
│  ═══════════════════════════════════   │
│                                         │
│  TAB: PEPTIDE                          │
│  ┌─────────────────────────────────┐   │
│  │ BPC-157     250mcg    evening   │   │
│  │ [Injiziert]                      │   │
│  │                                  │   │
│  │ ▼ Injektionsort                 │ ← Auto-Expand
│  │ ┌─────────────────────────────┐ │   │
│  │ │[Bauch L][Bauch R][Obersch.] │ │   │
│  │ │   ●                         │ │   │
│  │ └─────────────────────────────┘ │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Tab A: Supplements

**Beginner (Quick Win):**
- Zeigt aktive Supplements gruppiert nach aktueller Tageszeit
- "Alle nehmen" Button loggt alle fuer die aktuelle Zeit
- Nutzt bestehende `useSupplementData` Hook-Logik

**Experte (Accordion):**
- "Ungeplantes hinzufügen": Suchfeld fuer Medikamente / Extra-Supps
- Dosis-Anpassung: Bei Klick auf Item -> Menge aendern

### Tab B: Peptide

**Beginner (Quick Win):**
- Liste aktiver Peptide aus `peptide_protocols` (is_active=true)
- Grosser "Injiziert" Button pro Peptid

**Experte (Auto-Expand nach Klick):**
- Injektionsort: Chips `[Bauch L] [Bauch R] [Oberschenkel L/R]`
- Notizen: Optional fuer Reaktionen/Gefuehle
- Nutzt bestehende `useIntakeLog` Hook

### Datenpunkte-Matrix

| Datenpunkt | Typ | Beginner | Experte |
|------------|-----|----------|---------|
| Supplement Einnahme | Boolean | ✅ Checkbox | ✅ Checkbox |
| Zeitpunkt | Time | 🤖 Auto | ✏️ Editierbar |
| Peptid Injektion | Boolean | ✅ Button | ✅ Button |
| Injektionsstelle | Enum | ❌ (Standard: Bauch L) | ✅ 6 Optionen |
| Dosis-Korrektur | Number | ❌ | ✅ Override |
| Notizen | Text | ❌ | ✅ Frei |

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/components/home/ChemistryStackSheet.tsx` | Hauptkomponente mit Tabs |
| `src/components/home/loggers/SupplementsLogger.tsx` | Supplements Tab Content |
| `src/components/home/loggers/PeptideLogger.tsx` | Peptide Tab Content |

---

## 2. BodyStackSheet - Waage & Massband

### UI-Design

```text
┌─────────────────────────────────────────┐
│          ═══ (Drag Handle) ═══          │
│                                         │
│  Body Stack                         ✕   │
│                                         │
│   ┌───────────────┬───────────────┐    │
│   │  ⚖️ Waage     │  📏 Maßband   │ ← Segmented Control
│   │      ●        │               │    │
│   └───────────────┴───────────────┘    │
│                                         │
│  ═══════════════════════════════════   │
│                                         │
│  TAB: WAAGE (existing WeightLogger++)   │
│  ┌─────────────────────────────────┐   │
│  │         ╔═══════════╗           │   │
│  │         ║   85.2    ║           │   │
│  │         ║    kg     ║           │   │
│  │         ╚═══════════╝           │   │
│  │    [ −0.1 ]        [ +0.1 ]     │   │
│  │                                  │   │
│  │  ▼ Körperkomposition            │ ← Accordion (existing)
│  │    KFA: [18.5%]  Muskeln: [42%] │   │
│  │                                  │   │
│  │  ▼ Kontext-Tags                 │ ← NEU: Accordion
│  │  ┌────────────────────────────┐ │   │
│  │  │[Nüchtern][Nach Training]   │ │   │
│  │  │[Kreatin+][Cheat][Salzig]   │ │   │
│  │  └────────────────────────────┘ │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ═══════════════════════════════════   │
│                                         │
│  TAB: MASSBAND                          │
│  ┌─────────────────────────────────┐   │
│  │  🎯 Bauchumfang (Wichtigster!)  │ ← Prominent
│  │     ┌───────────────────┐       │   │
│  │     │      95.5 cm      │       │   │
│  │     └───────────────────┘       │   │
│  │                                  │   │
│  │  ▼ Ganzkörper                   │ ← Accordion
│  │  ┌───────────────────────────┐  │   │
│  │  │ Hals:    [__] cm          │  │   │
│  │  │ Brust:   [__] cm          │  │   │
│  │  │ Taille:  [__] cm          │  │   │
│  │  │ Hüfte:   [__] cm          │  │   │
│  │  │ Arme:    [__] cm          │  │   │
│  │  │ Oberschenkel: [__] cm     │  │   │
│  │  └───────────────────────────┘  │   │
│  │                                  │   │
│  │  💡 Wo messe ich?  ← Info Button │   │
│  │                                  │   │
│  │  [✓ Speichern]                   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Tab A: Waage (WeightLogger erweitern)

**Existing (Quick Win):**
- Grosses Gewichts-Display
- +/- 0.1 kg Stepper
- KFA + Muskelmasse Accordion

**NEU Experte (zweites Accordion):**
- Kontext-Tags: `[Nüchtern] [Nach Cheat-Meal] [Nach Training] [Kreatin geladen] [Salzig gegessen]`
- Diese werden als JSONB in `weight_history.notes` oder neues Feld gespeichert

### Tab B: Massband (neu)

**Beginner (Quick Win):**
- **Bauchumfang** ist der wichtigste Gesundheitsmarker
- Gross, zentriert, mit Stepper (+/- 0.5 cm)

**Experte (Accordion "Ganzkörper"):**
- Alle Felder aus `body_measurements`: neck, chest, waist, belly, hips, arms, thigh
- Info-Button mit visueller Anleitung
- Progress Pic Upload (optional, spaeter)

### Datenpunkte-Matrix

| Datenpunkt | Typ | Beginner | Experte |
|------------|-----|----------|---------|
| Gewicht | Decimal | ✅ Gross | ✅ Gross |
| KFA % | Decimal | ❌ | ✅ Accordion |
| Muskelmasse % | Decimal | ❌ | ✅ Accordion |
| Kontext-Tags | Tags | ❌ | ✅ Chips |
| Bauchumfang | Decimal | ✅ Wichtigster KPI | ✅ |
| Andere Masse | Decimal | ❌ | ✅ Accordion |

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/components/home/BodyStackSheet.tsx` | Hauptkomponente mit Tabs |
| `src/components/home/loggers/TapeLogger.tsx` | Massband Tab Content |
| (modify) `src/components/home/loggers/WeightLogger.tsx` | +Context Tags Accordion |

---

## 3. Integration in QuickActionsMenu

### Aenderungen an QuickActionsMenu.tsx

```typescript
// VORHER:
const actions = [
  { key: "supplements", label: "Supps", Icon: Pill },
  // ... no body/measurements
];

// NACHHER:
const actions = [
  { key: "chemistry", label: "Chemie", Icon: FlaskConical }, // NEU: Combined
  { key: "body", label: "Körper", Icon: Ruler }, // NEU: Weight + Tape
  // Remove standalone "supplements" since it's now in chemistry
];
```

### Aenderungen an QuickAddFAB.tsx

```typescript
// Neue States
const [chemistryOpen, setChemistryOpen] = useState(false);
const [bodyOpen, setBodyOpen] = useState(false);

// Handler erweitern
if (type === "chemistry") {
  setMenuOpen(false);
  setChemistryOpen(true);
  return;
}
if (type === "body") {
  setMenuOpen(false);
  setBodyOpen(true);
  return;
}

// Render:
<ChemistryStackSheet isOpen={chemistryOpen} onClose={() => setChemistryOpen(false)} />
<BodyStackSheet isOpen={bodyOpen} onClose={() => setBodyOpen(false)} />
```

---

## 4. Datei-Uebersicht

| Aktion | Datei | Beschreibung |
|--------|-------|--------------|
| **CREATE** | `src/components/home/ChemistryStackSheet.tsx` | Hauptsheet mit Supplements/Peptide Tabs |
| **CREATE** | `src/components/home/loggers/SupplementsLogger.tsx` | Supplement-Tracking Tab |
| **CREATE** | `src/components/home/loggers/PeptideLogger.tsx` | Peptide-Tracking mit Injektionsort |
| **CREATE** | `src/components/home/BodyStackSheet.tsx` | Hauptsheet mit Waage/Massband Tabs |
| **CREATE** | `src/components/home/loggers/TapeLogger.tsx` | Koerpermasse Tab |
| **MODIFY** | `src/components/home/loggers/WeightLogger.tsx` | +Context Tags Accordion |
| **MODIFY** | `src/components/quick/QuickActionsMenu.tsx` | Menu Items aktualisieren |
| **MODIFY** | `src/components/quick/QuickAddFAB.tsx` | Neue Sheets integrieren |
| **MODIFY** | `src/hooks/useAresEvents.ts` | Peptide + Measurements Tracking |

---

## 5. Technische Details

### ChemistryStackSheet - Supplements Tab

Nutzt bestehende Hooks:
- `useSupplementData` fuer aktive Supplements nach Timing
- `markSupplementTaken` / `markTimingGroupTaken` fuer Logging

```typescript
// SupplementsLogger.tsx
const {
  groupedSupplements,
  totalScheduled,
  totalTaken,
  markSupplementTaken,
  markTimingGroupTaken
} = useSupplementData();

// "Alle nehmen" Button fuer aktuelle Tageszeit
const currentTiming = getCurrentTiming(); // morning/noon/evening
const handleLogAll = () => {
  markTimingGroupTaken(currentTiming, true);
};
```

### ChemistryStackSheet - Peptide Tab

Nutzt bestehende Hooks:
- `useProtocols` fuer aktive Peptid-Protokolle
- `useIntakeLog` fuer Injection Logging

```typescript
// PeptideLogger.tsx
const { protocols, loading } = useProtocols();
const { logIntake } = useIntakeLog();

// Injection Sites (aus bestehenden Komponenten)
const INJECTION_SITES = [
  { id: 'abdomen_left', label: 'Bauch links', icon: '⬅️' },
  { id: 'abdomen_right', label: 'Bauch rechts', icon: '➡️' },
  { id: 'thigh_left', label: 'Oberschenkel L', icon: '🦵' },
  { id: 'thigh_right', label: 'Oberschenkel R', icon: '🦵' },
];

const handleInject = async (protocol: Protocol, site: string) => {
  const peptide = protocol.peptides[0];
  await logIntake(
    protocol.id,
    peptide.name,
    peptide.dose,
    peptide.unit,
    protocol.timing || 'evening_fasted',
    site
  );
};
```

### BodyStackSheet - Tape Tab

Nutzt bestehende Logik aus `BodyMeasurements.tsx`:

```typescript
// TapeLogger.tsx
const handleSave = async () => {
  const { error } = await supabase.from('body_measurements').upsert({
    user_id,
    date: today,
    belly: bellyValue,
    waist: waistValue,
    // ... andere Felder aus Accordion
  }, { onConflict: 'user_id,date' });
};
```

### WeightLogger - Context Tags

```typescript
// Neue State-Variable
const [contextTags, setContextTags] = useState<string[]>([]);

const CONTEXT_TAG_OPTIONS = [
  { id: 'fasted', label: 'Nüchtern' },
  { id: 'post_workout', label: 'Nach Training' },
  { id: 'post_cheat', label: 'Nach Cheat-Meal' },
  { id: 'creatine', label: 'Kreatin geladen' },
  { id: 'salty', label: 'Salzig gegessen' },
  { id: 'dehydrated', label: 'Dehydriert' },
];

// In handleSave:
notes: contextTags.length > 0 
  ? `[Tags: ${contextTags.join(', ')}] ${notes || ''}`
  : notes
```

---

## 6. Zusammenfassung

| Feature | Beginner | Experte |
|---------|----------|---------|
| **Supplements** | Timing-Gruppen + "Alle nehmen" | Einzeln abhaken, Dosis aendern |
| **Peptide** | 1-Click "Injiziert" | Injektionsort-Rotation |
| **Gewicht** | Grosses Display + Stepper | KFA, Muskeln, Kontext-Tags |
| **Koerpermasse** | Bauchumfang (Fokus) | Alle 7 Messstellen |

**Datenpunkte Gesamt:**
- Chemistry Stack: 6 Datenpunkte
- Body Stack: 11 Datenpunkte

**Bestehende Hooks werden wiederverwendet:**
- `useSupplementData` (Supplements)
- `useProtocols` + `useIntakeLog` (Peptide)
- `useAresEvents` (Weight)
- Supabase direct (body_measurements)

