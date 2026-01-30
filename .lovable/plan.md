
## Fix: ARES Quick Check liefert leere Antwort

### Problem-Diagnose

Die Analyse der Logs zeigt:
1. Die Edge Function empfängt die Nachricht korrekt
2. Der Prompt wird gebaut (`status=prompt_built`)
3. Gemini 3 Pro wird aufgerufen (`[ARES-HYBRID] Tool execution - using Gemini 3 Pro`)
4. **Aber:** Es gibt kein Log für die LLM-Antwort
5. Die Response enthält `"reply":""` (leerer String)

**Root Cause:** In der Funktion `callLLMWithTools` (Zeile 2456) wird `assistantMessage.content` **ohne Null-Check** zurückgegeben. Wenn Gemini eine leere Antwort liefert oder `content: null` zurückgibt, wird dies als leere Antwort durchgereicht.

### Lösung

Zwei Fixes sind nötig:

| Datei | Änderung | Zweck |
|-------|----------|-------|
| `coach-orchestrator-enhanced/index.ts` | Null-Check und Fallback in `callLLMWithTools` | Leere Antworten abfangen |
| `coach-orchestrator-enhanced/index.ts` | Debug-Logging für LLM-Response | Bessere Fehleranalyse |

### Code-Änderungen

**1. Logging nach LLM-Call hinzufügen (Zeile ~2412):**
```typescript
let llmResponse = await response.json();
console.log('[ARES-LLM] Raw response:', JSON.stringify({
  hasChoices: !!llmResponse.choices,
  choicesLength: llmResponse.choices?.length,
  hasContent: !!llmResponse.choices?.[0]?.message?.content,
  hasToolCalls: !!llmResponse.choices?.[0]?.message?.tool_calls,
  finishReason: llmResponse.choices?.[0]?.finish_reason,
}));
let assistantMessage = llmResponse.choices[0].message;
```

**2. Null-Check in Return-Statement (Zeile ~2455):**
```typescript
return {
  content: assistantMessage.content || 'Entschuldigung, ich konnte keine Antwort generieren. Bitte versuche es erneut.',
  toolResults: toolResults,
  providerUsed,
  modelUsed
};
```

**3. Fallback zu GPT-5 wenn Content leer (nach Zeile 2452):**
```typescript
// If content is empty after tool loop, try GPT-5 fallback
if (!assistantMessage.content && toolResults.length === 0) {
  console.warn('[ARES-LLM] Empty content from Gemini, falling back to GPT-5');
  const fallbackResponse = await callLovableWithTools(messages, 2000, temperature, 'openai/gpt-5');
  if (fallbackResponse.ok) {
    const fallbackData = await fallbackResponse.json();
    assistantMessage = fallbackData.choices?.[0]?.message || assistantMessage;
    providerUsed = 'lovable';
    modelUsed = 'openai/gpt-5';
  }
}
```

### Erwartetes Verhalten

| Vorher | Nachher |
|--------|---------|
| Gemini gibt leeren Content → User sieht leere Blase | Gemini gibt leeren Content → Automatischer Fallback zu GPT-5 |
| Kein Log über LLM-Antwort | Detailliertes Logging der Response-Struktur |
| Debugging unmöglich | Logs zeigen `hasContent`, `hasToolCalls`, `finishReason` |

### Zusätzliche Empfehlung

Falls das Problem persistiert, könnte Gemini 3 Pro Preview Probleme mit dem langen System-Prompt haben (11.040 Zeichen laut Logs). Ein alternativer Ansatz wäre:
- Gemini 2.5 Flash als primäres Modell für Quick Checks verwenden
- Gemini 3 Pro nur für komplexe Anfragen mit Tool-Nutzung

### Deployment

Nach dem Fix muss die Edge Function **neu deployed** werden.
