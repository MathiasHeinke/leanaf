# ARES Gesprächsverlauf-Fix Report

**Datum:** 22. Januar 2026  
**Branch:** `fix/ares-conversation-memory`  
**PR:** [#14](https://github.com/MathiasHeinke/leanaf/pull/14)

---

## Executive Summary

ARES hatte **zwei kritische Memory-Probleme**:
1. Keine Erinnerung an vorherige Nachrichten in der Session
2. Falsches Datum (z.B. "27. Oktober 2023" statt aktuelles Datum)

**Beide Probleme wurden gefixt.**

---

## Problem-Analyse

### Problem 1: Kein Gesprächsverlauf

**Symptom:**  
ARES wusste nicht, was in der aktuellen oder vorherigen Session besprochen wurde.

**Root Cause:**  
Die `coach_conversations` Tabelle wurde korrekt **beschrieben** (Zeile 1391-1402), aber **nirgends gelesen**!

```typescript
// Gespräche wurden gespeichert...
await supaSvc.from('coach_conversations').insert({
  user_id: user.id,
  coach_id: coachId,
  message: text,
  response: llmOutput,
  // ...
});

// ...aber buildUserContext() lud:
// ✅ profile
// ✅ meals  
// ✅ workouts
// ✅ sleep
// ✅ supplements
// ✅ coach_memory (Langzeit)
// ❌ coach_conversations (FEHLTE!)
```

### Problem 2: Falsches Datum

**Symptom:**  
ARES sagte "Heute ist der 27. Oktober 2023" (Screenshot vom User).

**Root Cause:**  
Kein dynamisches Datum im System-Prompt. Das LLM "halluzinierte" ein Datum basierend auf seinen Trainingsdaten.

---

## Implementierte Fixes

### Fix 1: Gesprächsverlauf laden

**Datei:** `supabase/functions/coach-orchestrator-enhanced/index.ts`

```typescript
// NEU in buildUserContext() - Zeile 754-770
const { data: recentConversations, error: convError } = await supaClient
  .from('coach_conversations')
  .select('message, response, created_at')
  .eq('user_id', userId)
  .eq('coach_id', 'ares')
  .order('created_at', { ascending: false })
  .limit(10); // Letzte 10 Nachrichten

// Zum Kontext hinzugefügt
const contextResult = {
  // ... andere Felder ...
  recent_conversations: recentConversations || [], // NEU
};
```

### Fix 2: Gesprächsverlauf im Prompt

**Datei:** `supabase/functions/coach-orchestrator-enhanced/index.ts`

```typescript
// NEU in buildAresPrompt() - Zeile 972-999
const recentConversations = context.recent_conversations || [];
let conversationHistoryContext = '';

if (recentConversations.length > 0) {
  const chronologicalConvs = [...recentConversations].reverse();
  
  const historyItems = chronologicalConvs.map((conv: any) => {
    const userMsg = conv.message?.slice(0, 200) || '';
    const aresResp = conv.response?.slice(0, 300) || '';
    return `**User**: ${userMsg}...\n**ARES**: ${aresResp}...`;
  });
  
  conversationHistoryContext = `
## GESPRÄCHSVERLAUF (Letzte ${recentConversations.length} Nachrichten)
**WICHTIG: Du erinnerst dich an diese Gespräche! Beziehe dich darauf wenn relevant.**

${historyItems.join('\n\n---\n\n')}
`;
}
```

### Fix 3: Dynamisches Datum

**Datei:** `supabase/functions/coach-orchestrator-enhanced/index.ts`

```typescript
// NEU in buildAresPrompt() - Zeile 1001-1014
const now = new Date();
const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const currentDate = `${germanDays[now.getDay()]}, ${now.getDate()}. ${germanMonths[now.getMonth()]} ${now.getFullYear()}`;

// Im System-Prompt:
const systemPrompt = `# ARES - ULTIMATE COACHING INTELLIGENCE
Du bist ARES - die ultimative Coaching-Intelligence für totale menschliche Optimierung.

**AKTUELLES DATUM: ${currentDate}**
(Verwende dieses Datum für alle zeitbezogenen Aussagen! Sage NIEMALS ein anderes Datum.)
...
```

---

## Ergebnis

| Problem | Vorher | Nachher |
|---------|--------|---------|
| Gesprächsverlauf | ❌ Nicht vorhanden | ✅ Letzte 10 Nachrichten im Kontext |
| Aktuelles Datum | ❌ "27. Oktober 2023" | ✅ Dynamisch generiert |
| Memory-Nutzung | ⚠️ Nur Langzeit | ✅ Langzeit + Gesprächsverlauf |

---

## Deployment

Nach Merge des PRs:

```bash
supabase functions deploy coach-orchestrator-enhanced
```

---

## Geänderte Dateien

- `supabase/functions/coach-orchestrator-enhanced/index.ts` (+63 Zeilen)

---

## Git-Informationen

- **Branch:** `fix/ares-conversation-memory`
- **Commit:** `0ec6d5c` - "fix(ares): Add conversation history to context and fix date bug"
- **PR:** [#14](https://github.com/MathiasHeinke/leanaf/pull/14)

---

## Nächste Schritte (Optional)

1. **Frontend-Optimierung:** Das Frontend könnte zusätzlich ein `messages` Array mit der aktuellen Session senden für noch bessere Echtzeit-Kontinuität
2. **Session-Trennung:** Gespräche nach Sessions gruppieren (z.B. Zeitfenster > 4 Stunden = neue Session)
3. **Zusammenfassungen:** Ältere Gespräche zu `coach_conversation_memory` Summaries komprimieren
