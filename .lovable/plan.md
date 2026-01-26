

# ChatOverlay Header erweitern - Info, History & Reset

## Problem

Der aktuelle `ChatOverlay`-Header zeigt nur:
- Avatar + "ARES"
- Close-Button (ChevronDown)

Was fehlt (aus dem alten `CollapsibleCoachHeader`):
- **Info (ⓘ)** - Persona-Popover mit Personality Dials
- **History (🕐)** - Chat-Verlauf anzeigen
- **Daily Reset (🗑️)** - Heutigen Chat löschen

## Loesung: Features in ChatOverlay-Header integrieren

Wir nehmen die nuetzlichen Elemente aus `CollapsibleCoachHeader` und bauen sie in den `ChatOverlay`-Header ein.

---

## Neues Header-Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  [Avatar] ARES              [Info] [History] [Trash] [Close]│
│           Dein Coach                                        │
└─────────────────────────────────────────────────────────────┘
```

Alle Icons werden als kleine runde Buttons rechts neben dem Close-Button platziert.

---

## Aenderungen in ChatOverlay.tsx

### 1. Neue Imports

- `Info`, `Clock`, `Trash2`, `Loader2` von lucide-react
- `Popover`, `PopoverContent`, `PopoverTrigger` fuer Info-Popover
- `useUserPersona` Hook fuer dynamische Persona-Daten
- `DailyResetDialog` Komponente
- `supabase` fuer History-Fetch und Delete
- `getCurrentDateString` fuer Daily Reset

### 2. Neue State-Variablen

```typescript
const [showCoachInfo, setShowCoachInfo] = useState(false);
const [showHistory, setShowHistory] = useState(false);
const [showDailyResetDialog, setShowDailyResetDialog] = useState(false);
const [isDeletingToday, setIsDeletingToday] = useState(false);
const [historyItems, setHistoryItems] = useState<any[]>([]);
const [loadingHistory, setLoadingHistory] = useState(false);

// Persona-Hook
const { persona: userPersona, loading: personaLoading } = useUserPersona();
```

### 3. Handler-Funktionen (aus CollapsibleCoachHeader kopieren)

- `getChatHistory()` - Laedt die letzten 10 Chat-Eintraege
- `formatHistoryDate()` - Formatiert Datum als "Heute", "Gestern", etc.
- `handleDailyReset()` - Loescht heutigen Chat via Supabase
- `handleHistoryClick()` - Laedt History und oeffnet Popover

### 4. Erweitertes Header-JSX

Der Header bekommt drei neue Icon-Buttons:

| Icon | Funktion | Popover-Inhalt |
|------|----------|----------------|
| Info (ⓘ) | Coach-Persona anzeigen | Persona-Name, Dials, Phrases |
| Clock (🕐) | Chat-History | Liste der letzten Gespraeche |
| Trash (🗑️) | Daily Reset | Oeffnet `DailyResetDialog` |

### 5. Callback an AresChat

AresChat braucht einen `onDailyReset`-Callback, damit nach dem Loeschen die Messages neu geladen werden:

```typescript
<AresChat 
  userId={user.id}
  coachId="ares"
  autoStartPrompt={autoStartPrompt}
  embedded={true}
  onDailyReset={() => { /* Trigger refetch */ }}
/>
```

---

## Visuelles Ergebnis

```text
┌─────────────────────────────────────────────────────────────┐
│  🤖 ARES                           ⓘ  🕐  🗑️  ⌄            │
│     Dein Coach • Online                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              Chat Messages (scrollable)                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│              [Input Field]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Geaenderte Dateien

| Datei | Aenderung |
|-------|----------|
| `src/components/home/ChatOverlay.tsx` | Neue Icons, Popovers, Handler, State |
| `src/components/ares/AresChat.tsx` | `onDailyReset` Prop hinzufuegen (optional) |

---

## Vorteile dieser Loesung

1. **Kein Doppel-Header** - Nur ein Header im ChatOverlay
2. **Alle Funktionen erhalten** - Info, History, Reset weiterhin nutzbar
3. **Saubere Architektur** - ChatOverlay kontrolliert seinen eigenen Header
4. **Embedded Mode bleibt simpel** - AresChat rendert nur Chat-Content

---

## Technische Details

### Info-Popover Inhalt

Zeigt dynamische Persona-Daten via `useUserPersona`:
- Icon + Name + Description
- Personality Dials (Energy, Directness, Humor, Warmth, etc.)
- Dialekt und Sprachstil
- Typische Phrasen

### History-Popover Inhalt

- Laedt letzte 10 Gespraeche via Supabase
- Gruppiert nach Datum
- Zeigt Preview des ersten Messages
- Klick auf Eintrag koennte zu dem Tag springen (optional)

### Daily Reset Flow

1. User klickt Trash-Icon
2. `DailyResetDialog` oeffnet sich
3. Bei Bestaetigung: DELETE auf `coach_conversations` mit `conversation_date = today`
4. Toast: "Heutiger Chat wurde geloescht"
5. Messages in AresChat werden geleert

