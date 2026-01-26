
# JournalLogger - Mindset Journal im QuickLogSheet

## Ziel
Einen neuen `JournalLogger` erstellen, der den **besten Voice-Recording-Hook** (`useEnhancedVoiceRecording`) nutzt und nahtlos ins QuickLogSheet integriert wird.

---

## Architektur-Entscheidung

### Voice Recording: `useEnhancedVoiceRecording.tsx` 
Dieser Hook ist der technisch fortschrittlichste mit:

- **Sofortige LocalStorage-Persistenz**: Audio wird nach Aufnahme-Stopp sofort als Base64 in LocalStorage gespeichert
- **Background Server Upload**: Parallel-Upload zu Supabase ohne UI-Blockade
- **Retry mit Exponential Backoff**: 3 Versuche bei Transkriptions-Fehlern
- **Dual Recovery**: Retry von LocalStorage ODER Server möglich
- **Audio Level Monitoring**: Web Audio API für Visualizer

### Datenbank: `diary_entries` Tabelle
Nutzen der einfacheren `diary_entries` Tabelle (passt besser zu Quick-Log-Philosophie):
```
- content: text (der eigentliche Eintrag)
- mood: text ('dankbarkeit' | 'reflektion' | 'ziele')
- entry_type: text ('text' | 'voice')
- prompt_used: text (die angezeigte Frage)
```

---

## Schritt 1: JournalLogger Komponente erstellen

**Datei:** `src/components/home/loggers/JournalLogger.tsx`

### UI-Struktur (nach Screenshot-Design)

```text
+------------------------------------------+
|  [Dankbarkeit] [Reflektion] [Ziele]      |  <- Kategorie-Chips
+------------------------------------------+
|  +--------------------------------------+|
|  | 🕐 Morgen        🙏 Dankbarkeit      ||  <- Prompt Card
|  |                                      ||
|  | "Wofür bist du gerade dankbar?"      ||
|  +--------------------------------------+|
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  |  🎤  Voice Input starten             ||  <- Full-Width Voice Button
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  |  📝  Schreibe deine Gedanken...      ||  <- Textarea Fallback
|  +--------------------------------------+|
|                                          |
|  + - - - - - - - - - - - - - - - - - - +|
|  |   📷 Foto hinzufügen                 ||  <- Dashed Photo Area
|  + - - - - - - - - - - - - - - - - - - +|
|                                          |
+==========================================+
|  [████████ Eintrag speichern ████████]   |  <- Sticky Save Button
+==========================================+
```

### Technische Features

1. **Kategorie-Chips** mit `framer-motion` Slide-Animation
2. **Dynamische Prompts** basierend auf Tageszeit + Kategorie
3. **Voice Button** integriert mit `useEnhancedVoiceRecording`
4. **VoiceVisualizer** während Aufnahme
5. **Hybrid Input**: Transcription -> Textarea (editierbar)
6. **Photo Upload** (Placeholder, evtl. später ausbauen)
7. **Sticky Save Button** wie bei anderen Loggern

---

## Schritt 2: QuickLogSheet erweitern

**Datei:** `src/components/home/QuickLogSheet.tsx`

### Änderungen

```typescript
// Type erweitern
export type QuickLogTab = 'weight' | 'training' | 'sleep' | 'journal';

// Tab hinzufügen
const tabs = [
  { id: 'weight', icon: Scale, label: 'Gewicht' },
  { id: 'training', icon: Dumbbell, label: 'Training' },
  { id: 'sleep', icon: Moon, label: 'Schlaf' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },  // NEU
];

// Segmented Control anpassen (4 Tabs statt 3)
style={{ width: `calc(${100 / 4}% - 4px)` }}

// Render-Bereich erweitern
{activeTab === 'journal' && <JournalLogger onClose={onClose} />}
```

---

## Schritt 3: useAresEvents erweitern

**Datei:** `src/hooks/useAresEvents.ts`

### Neuer Event Handler

```typescript
// Payload-Definition
interface EventPayload {
  // ... existing ...
  
  // Journal (NEU)
  content?: string;
  mood?: 'dankbarkeit' | 'reflektion' | 'ziele';
  entry_type?: 'text' | 'voice';
  prompt_used?: string;
}

// Im trackEvent Handler
if (category === 'journal' && payload.content) {
  const { error } = await supabase.from('diary_entries').insert({
    user_id: auth.user.id,
    date: payload.date || today,
    content: payload.content,
    mood: payload.mood || null,
    entry_type: payload.entry_type || 'text',
    prompt_used: payload.prompt_used || null
  });
  
  if (error) throw error;
  toast.success('Tagebuch gespeichert');
}
```

---

## Schritt 4: AresHome.tsx anpassen

**Datei:** `src/pages/AresHome.tsx`

### Switch-Case für Journal-Action

```typescript
case 'journal':
  setQuickLogConfig({ open: true, tab: 'journal' });
  break;
```

---

## Schritt 5: Prompt-System für JournalLogger

### Dynamische Prompts nach Kategorie + Tageszeit

```typescript
const JOURNAL_PROMPTS = {
  dankbarkeit: {
    morning: "Wofür bist du heute Morgen dankbar?",
    midday: "Was hat dich heute positiv überrascht?",
    evening: "Welche 3 Dinge waren heute gut?"
  },
  reflektion: {
    morning: "Wie startest du heute in den Tag?",
    midday: "Was hast du heute über dich gelernt?",
    evening: "Was würdest du morgen anders machen?"
  },
  ziele: {
    morning: "Was ist dein Fokus für heute?",
    midday: "Wie kommst du bei deinen Zielen voran?",
    evening: "Welches Ziel verfolgst du morgen?"
  }
};
```

---

## Technische Details

### Voice Recording Flow

```text
[Start Recording]
       ↓
[Audio Level → Visualizer] (real-time)
       ↓
[Stop Recording]
       ↓
[Audio Blob → LocalStorage] ← SOFORT (Crash-Recovery)
       ↓
[Background Upload → Server] ← PARALLEL (nicht blockierend)
       ↓
[Transcription mit 3x Retry]
       ↓
[Text → Textarea] (User kann editieren)
       ↓
[Bei Fehler: "Lokal" / "Server" Retry-Buttons]
```

### Glassmorphism Styling

```css
/* Prompt Card */
.prompt-card {
  background: bg-indigo-50 dark:bg-indigo-900/20;
  border: border-indigo-200/50 dark:border-indigo-700/30;
  border-radius: rounded-2xl;
}

/* Voice Button */
.voice-button {
  background: bg-indigo-500 hover:bg-indigo-600;
  width: w-full;
  padding: py-4;
}
```

---

## Dateien die erstellt/geändert werden

| Datei | Aktion |
|-------|--------|
| `src/components/home/loggers/JournalLogger.tsx` | **NEU** |
| `src/components/home/QuickLogSheet.tsx` | Erweitern (4. Tab) |
| `src/hooks/useAresEvents.ts` | Erweitern (journal handler) |
| `src/pages/AresHome.tsx` | Erweitern (journal case) |

---

Audio-Größe in LocalStorage: müsste eigentlich mehr sein. lass die leute auh mal 10 min. quatschen, müssen wir dann halt zusammenfassen mit KI...

Transkriptions-Kosten: OpenAI Whisper via Edge Function (bereits setup) oder wir gehen auch auf lovable gemini?

## Risiken & Mitigation

1. **Tab-Breite bei 4 Tabs**: Icons-only auf Mobile, Labels auf Desktop (bereits implementiert)