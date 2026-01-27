
# ARES Chat Vision Integration

## Problem-Zusammenfassung

Der ARES Chat kann **Bilder hochladen** (UI funktioniert), aber sie werden **nirgends verarbeitet**. Die Pipeline ist an 4 Stellen unterbrochen:

1. **Frontend**: `handleSendWithMedia` gibt `mediaUrls` nicht an `sendMessage` weiter
2. **Hook**: `sendMessage` akzeptiert keine Bilder und sendet sie nicht zum Backend
3. **Backend**: `ares-streaming` parst keine Bilder aus dem Request
4. **AI-Call**: Kein Vision-Modell oder multimodales Message-Format

Das Ergebnis: User laeden Bild hoch, schreiben "Was meinst du zu meiner Statur?" - ARES sieht nur den Text, nicht das Bild.

---

## Loesung: End-to-End Vision Pipeline

### Phase 1: Frontend → Hook

**Datei: `src/hooks/useAresStreaming.ts`**

Erweitere `sendMessage` Signatur um `imageUrls`:

```typescript
// Zeile ~252: Erweiterte Funktion
const sendMessage = useCallback(async (
  message: string, 
  coachId: string = 'ares', 
  researchPlus: boolean = false,
  imageUrls?: string[]  // NEU
) => {
```

Sende Images im Body:

```typescript
// Zeile ~298: Erweiterter Body
body: JSON.stringify({ 
  message, 
  coachId, 
  researchPlus,
  images: imageUrls || []  // NEU - Array von URLs
})
```

**Datei: `src/components/ares/AresChat.tsx`**

Uebergebe `mediaUrls` an Hook:

```typescript
// Zeile ~458: Korrigierter Aufruf
await sendMessage(trimmed, coachId, researchPlus, mediaUrls);
```

---

### Phase 2: Backend Image Parsing

**Datei: `supabase/functions/ares-streaming/index.ts`**

Parse Images aus Request:

```typescript
// Zeile ~476: Erweitert
const text = body.message || body.text || '';
const coachId = body.coachId || 'ares';
const researchPlus = body.researchPlus === true;
const images: string[] = body.images || []; // NEU
const hasVision = images.length > 0;         // NEU
```

---

### Phase 3: Vision-faehiges Model Routing

**Datei: `supabase/functions/ares-streaming/index.ts`**

Neue Helper-Funktion fuer multimodales Format:

```typescript
function buildMultimodalContent(text: string, imageUrls: string[]): any[] {
  const content: any[] = [];
  
  // Text zuerst
  content.push({ type: 'text', text });
  
  // Dann Bilder
  for (const url of imageUrls) {
    content.push({
      type: 'image_url',
      image_url: { url, detail: 'high' }
    });
  }
  
  return content;
}
```

Anpassung des AI-Calls (Zeile ~800+):

```typescript
// Wenn Bilder vorhanden, nutze Vision-faehiges Modell
const modelToUse = hasVision 
  ? 'google/gemini-2.5-pro'  // Vision-faehig
  : selectedModel;           // Standard-Routing

const messagesPayload = hasVision
  ? [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
      { 
        role: 'user', 
        content: buildMultimodalContent(text, images) 
      }
    ]
  : [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
      { role: 'user', content: text }
    ];
```

---

### Phase 4: Vision-Context im System Prompt

**Datei: `supabase/functions/ares-streaming/index.ts`**

Ergaenze `buildStreamingSystemPrompt` um Vision-Anweisungen:

```typescript
// Am Ende der Funktion, vor return:
if (hasVisionContext) {
  parts.push('== BILD-ANALYSE ==');
  parts.push('Der User hat ein Bild hochgeladen. Analysiere es sorgfaeltig:');
  parts.push('- Bei Body-Fotos: Koerperhaltung, Muskelentwicklung, Proportionen');
  parts.push('- Bei Mahlzeiten: Geschaetzte Makros, Portionsgroesse, Qualitaet');
  parts.push('- Beziehe das Bild in deine Antwort ein');
  parts.push('- Sei ehrlich aber motivierend');
  parts.push('');
}
```

---

## Dateien-Uebersicht

| Datei | Aktion | Aenderung |
|-------|--------|-----------|
| `src/hooks/useAresStreaming.ts` | EDIT | +`imageUrls` Parameter, sende im Body |
| `src/components/ares/AresChat.tsx` | EDIT | Gib `mediaUrls` an Hook weiter |
| `supabase/functions/ares-streaming/index.ts` | EDIT | Parse images, Vision-Model-Routing, multimodales Format |

---

## Technische Details

### Unterstuetzte Bildformate
- JPEG, PNG, WebP, GIF (statisch)
- Max 20MB pro Bild (Lovable Upload Limit)
- Gemini 2.5 Pro unterstuetzt bis zu 16 Bilder pro Request

### Model-Routing mit Vision

```text
+------------------+      +-------------------+
| User sendet Bild | ---> | hasVision = true  |
+------------------+      +-------------------+
                                  |
                                  v
                    +---------------------------+
                    | google/gemini-2.5-pro     |
                    | (Bestes Vision-Modell)    |
                    +---------------------------+
```

### Multimodales Message-Format (OpenAI-kompatibel)

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Was meinst du zu meiner Statur?" },
    { 
      "type": "image_url", 
      "image_url": { "url": "https://...", "detail": "high" }
    }
  ]
}
```

---

## Erwartetes Ergebnis

Nach Implementation:

1. User laedt Bild hoch (z.B. Body-Foto)
2. User schreibt "Was meinst du zu meiner Statur?"
3. Frontend sendet Text + Bild-URL an Backend
4. Backend erkennt Vision-Request, waehlt Gemini 2.5 Pro
5. AI analysiert Bild + kombiniert mit User-Daten (Gewicht, Ziele, etc.)
6. ARES antwortet: "Ich sehe hier eine gute V-Form im Oberkörper. Bei deinem aktuellen Gewicht von 84kg und Ziel 82kg würde ich..."

**Use Cases:**
- Body-Progress-Fotos analysieren
- Mahlzeiten bewerten ("Was haeltst du von diesem Fruehstueck?")
- Supplement-Fotos pruefen ("Sind das gute Produkte?")
- Blutwerte-Screenshots interpretieren
