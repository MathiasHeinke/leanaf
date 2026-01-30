

## Fix: ARES Quick Check liefert keine Antwort

### Problem-Ursache
Der Memory-Summarizer in `coach-orchestrator-enhanced` verwendet ein **veraltetes/ungültiges Modell**:

```
model: 'google/gemini-2.5-flash-preview-05-20'
```

Der Lovable AI Gateway gibt zurück:
```
400 {"type":"bad_request","message":"invalid model: google/gemini-2.5-flash-preview-05-20"}
```

Dadurch schlägt der Memory-Summary-Prozess fehl, was dazu führt, dass ARES eine **leere Antwort** zurückgibt.

### Lösung
Das ungültige Modell durch ein aktuelles ersetzen:

| Datei | Zeile | Änderung |
|-------|-------|----------|
| `supabase/functions/coach-orchestrator-enhanced/memory.ts` | 176 | `google/gemini-2.5-flash-preview-05-20` → `google/gemini-2.5-flash` |

### Erlaubte Modelle (Referenz)
```text
openai/gpt-5-mini
openai/gpt-5
openai/gpt-5-nano
openai/gpt-5.2
google/gemini-2.5-pro
google/gemini-2.5-flash        ← Empfohlen für Memory-Summarizer
google/gemini-2.5-flash-lite
google/gemini-2.5-flash-image
google/gemini-3-pro-preview
google/gemini-3-flash-preview
google/gemini-3-pro-image-preview
```

### Code-Änderung

```diff
// supabase/functions/coach-orchestrator-enhanced/memory.ts, Zeile 176
- model: 'google/gemini-2.5-flash-preview-05-20',
+ model: 'google/gemini-2.5-flash',
```

### Aufwand
1 Zeile in 1 Datei

