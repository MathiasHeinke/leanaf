
# ARES Instant Check - Vollständiger Implementierungsplan

## Zusammenfassung

Ersetzung des problematischen "Frag ARES" Chat-Redirects durch ein **Inline-Overlay** mit schneller, kontextbezogener AI-Analyse. Der User bleibt im Supplement-Chip, bekommt eine personalisierte Bewertung und kann danach speichern – **Zero Context Switching**.

---

## Architektur

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ExpandableSupplementChip                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Magnesium  400mg  Abends                                     │  │
│  │  [Timing] [Dosis] [Zyklisch]                                  │  │
│  │                                                               │  │
│  │  [Speichern]              [Frag ARES] [Loeschen]              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ onClick
┌─────────────────────────────────────────────────────────────────────┐
│              AresInstantCheckDrawer (Vaul Drawer)                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ⚡ Analyse: Magnesium (NOW Foods)                            │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  [Loading State - Rotating Text Animation]                    │  │
│  │  "Lade dein Profil..."                                        │  │
│  │  "Pruefe Supplement-Stack..."                                 │  │
│  │  "Analysiere Interaktionen..."                                │  │
│  │                                                               │  │
│  │  [Result State - Markdown]                                    │  │
│  │  ✅ Bewertung: Gut geeignet                                   │  │
│  │  ⏰ Timing: Abends optimal fuer Schlaf                        │  │
│  │  💊 Dosis: 400mg angemessen                                   │  │
│  │  ⚠️ Tipp: 2h nach Zink fuer bessere Absorption                │  │
│  │                                                               │  │
│  │                              [Verstanden]                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│             Edge Function: ares-instant-check                       │
│  Input: supplement_data + user_id (auto)                            │
│  Parallel Data Load:                                                │
│    - profiles (Ziel, Phase, Gewicht)                                │
│    - user_supplements (aktiver Stack)                               │
│    - peptide_protocols (aktive Peptide)                             │
│    - user_bloodwork (letzte Marker)                                 │
│    - ares_user_insights (bekannte Praeferenzen)                     │
│    - daily_goals (aktuelles Kalorienziel)                           │
│  Model: google/gemini-2.5-flash (Prioritaet: Speed)                 │
│  Output: { analysis: string } (Markdown)                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Teil 1: Neue Edge Function

### Datei: `supabase/functions/ares-instant-check/index.ts`

**Eigenschaften:**
- Lightweight, stateless (kein Chat, keine History-Speicherung)
- JWT-verifiziert (User-Auth erforderlich)
- Parallele Datenladung fuer minimale Latenz
- Ziel: Response in unter 3 Sekunden

**Datenquellen (parallel geladen):**

| Tabelle | Felder | Zweck |
|---------|--------|-------|
| `profiles` | goal, phase, weight, age, gender, protocol_mode | User-Kontext |
| `user_supplements` | name, dosage, timing, schedule | Stack-Interaktionen |
| `peptide_protocols` | compound, status | Aktive Peptide |
| `user_bloodwork` | markers, test_date (letzte 90 Tage) | Relevante Blutwerte |
| `ares_user_insights` | insight_type, content | Bekannte Praeferenzen |
| `daily_goals` | target_calories, target_protein | Makro-Ziele |

**Prompt-Struktur:**

```text
Du bist ARES, der Elite-Supplement-Auditor.

## USER KONTEXT
- Phase: [phase] | Protokoll: [protocol_mode]
- Ziel: [goal] (Kalorien: [target_calories])
- Alter: [age] | Gewicht: [weight]kg | Geschlecht: [gender]

## AKTUELLER STACK
[Liste aller aktiven Supplements mit Timing]

## AKTIVE PEPTIDE
[Liste aktiver Peptide oder "Keine"]

## RELEVANTE BLUTWERTE
[Letzte Werte wie Vitamin D, Magnesium, etc.]

## BEKANNTE PRAEFERENZEN
[Insights wie "nimmt abends lieber Kapseln"]

## ZU PRUEFENDES SUPPLEMENT
- Name: [name]
- Marke: [brand_name]
- Dosis: [dosage][unit]
- Timing: [timing]
- Constraint: [timing_constraint]

## AUFGABE
Bewerte dieses Supplement fuer diesen User:
1. Passt es zu seinen Zielen?
2. Ist das Timing optimal?
3. Ist die Dosis angemessen?
4. Gibt es Interaktionen mit dem Stack/Peptiden?
5. Qualitaet der Marke (falls bekannt)?

## FORMAT
Antworte in maximal 4 kurzen Absaetzen.
Nutze Emojis fuer Struktur (✅ ⏰ 💊 ⚠️ 💡).
Maximal 150 Woerter.
```

**Model:** `google/gemini-2.5-flash` (schnell, guenstig, ausreichend fuer diese Aufgabe)

**Config-Eintrag:**
```toml
[functions.ares-instant-check]
verify_jwt = true
```

---

## Teil 2: Frontend Hook

### Datei: `src/hooks/useAresInstantCheck.ts`

**Features:**
- Einfacher Request/Response (kein Streaming noetig)
- Loading, Success, Error States
- Reset-Funktion fuer Wiederverwendung

**Interface:**
```typescript
interface SupplementAnalysisInput {
  name: string;
  dosage: string;
  unit: string;
  timing: PreferredTiming;
  brandName?: string;
  constraint?: TimingConstraint;
}

interface UseAresInstantCheckReturn {
  analyze: (supplement: SupplementAnalysisInput) => Promise<void>;
  isLoading: boolean;
  result: string | null;
  error: string | null;
  reset: () => void;
}
```

---

## Teil 3: Drawer-Komponente

### Datei: `src/components/supplements/AresInstantCheckDrawer.tsx`

**UI-Design:**
- Verwendet existierenden Vaul `Drawer` (Mobile-optimiert)
- Glassmorphism-Styling passend zu ARES Aesthetic
- Handle-Bar oben (native Swipe-to-Close)

**Loading State (Rotating Text Animation):**
```typescript
const LOADING_MESSAGES = [
  'Lade dein Profil...',
  'Pruefe Supplement-Stack...',
  'Analysiere Interaktionen...',
  'Pruefe Timing-Kompatibilitaet...',
  'Generiere Empfehlung...'
];
```
- Interval: 1.5s zwischen Messages
- Pulsing ARES Logo oder Sparkles Icon

**Result State:**
- Markdown-Rendering via `react-markdown` (bereits installiert)
- Saubere Typografie mit ausreichend Padding

**Footer:**
- Einzelner "Verstanden" Button (Primary Style)
- Schliesst Drawer und kehrt zum Chip zurueck

**Props:**
```typescript
interface AresInstantCheckDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplement: SupplementAnalysisInput;
}
```

---

## Teil 4: Integration in ExpandableSupplementChip

### Aenderungen in `src/components/supplements/ExpandableSupplementChip.tsx`

**Zu entfernen:**
- `useNavigate` Import (Zeile 3)
- `navigate('/coach/ares', ...)` Aufruf (Zeile 173)
- `navigate` Konstante (Zeile 119)

**Zu hinzufuegen:**
- State: `const [showInstantCheck, setShowInstantCheck] = useState(false);`
- Neue `handleAskAres` Logik:

```typescript
const handleAskAres = useCallback(() => {
  haptics.light();
  setShowInstantCheck(true);
}, []);
```

- Drawer-Einbindung am Ende (vor dem schliessenden `</motion.div>`):

```tsx
<AresInstantCheckDrawer
  isOpen={showInstantCheck}
  onClose={() => setShowInstantCheck(false)}
  supplement={{
    name: item.name,
    dosage,
    unit,
    timing: preferredTiming,
    brandName: selectedProduct?.brand?.name,
    constraint: item.supplement?.timing_constraint,
  }}
/>
```

---

## Teil 5: Cleanup (coach-orchestrator-enhanced)

### Zu entfernen aus `supabase/functions/coach-orchestrator-enhanced/index.ts`:

Die kuerzlich hinzugefuegten Workarounds (Zeilen 2413-2488):
- Debug-Logging (`[ARES-LLM] Raw response`)
- GPT-5 Fallback-Logik (`Empty content from Gemini, falling back to GPT-5`)
- Fallback-String (`Entschuldigung, ich konnte keine Antwort generieren...`)

Diese waren temporaere Fixes fuer das fundamentale UX-Problem, das jetzt architektonisch geloest wird.

---

## Dateien-Uebersicht

| Datei | Aktion |
|-------|--------|
| `supabase/functions/ares-instant-check/index.ts` | NEU erstellen |
| `src/hooks/useAresInstantCheck.ts` | NEU erstellen |
| `src/components/supplements/AresInstantCheckDrawer.tsx` | NEU erstellen |
| `src/components/supplements/ExpandableSupplementChip.tsx` | AENDERN |
| `supabase/config.toml` | AENDERN (neue Function) |
| `supabase/functions/coach-orchestrator-enhanced/index.ts` | AENDERN (Cleanup) |

---

## Vorteile gegenueber bisheriger Loesung

| Aspekt | Vorher (Chat-Redirect) | Nachher (Inline-Drawer) |
|--------|------------------------|-------------------------|
| **Kontext** | User verliert Form-State | Form bleibt erhalten |
| **Prompt** | Sichtbar im Chat | Unsichtbar (Backend) |
| **Chat-Historie** | Wird polluted | Bleibt sauber |
| **Komplexitaet** | Streaming + Memory + Tools | Simpler Request/Response |
| **Abhaengigkeit** | ares-streaming (1488 Zeilen) | Eigene leichte Function |
| **Latenz** | 5-10s (Context + Streaming) | Ziel: unter 3s |
| **Side Effects** | Shared State mit Chat | Isoliert, keine |

---

## Erwartete User Experience

1. User oeffnet Supplement-Chip, passt Dosis/Timing an
2. Klickt "Frag ARES"
3. Drawer oeffnet sich sofort mit animiertem Loading
4. Nach circa 2-3s erscheint personalisierte Bewertung
5. User liest, klickt "Verstanden"
6. Zurueck im Chip - kann speichern oder weiter anpassen
7. Kein Kontextverlust, kein Seitenwechsel

---

## Deployment

Nach Implementierung:
1. Edge Function deployen: `ares-instant-check`
2. Testen mit verschiedenen Supplements
3. Optional: Cleanup-Deploy fuer `coach-orchestrator-enhanced`
