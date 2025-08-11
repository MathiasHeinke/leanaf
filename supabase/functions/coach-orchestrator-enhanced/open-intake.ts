import { detectSoftSignals } from './soft-detectors.ts';

export type Meta = {
  domain_probs?: Record<string, number>;
  action_probs?: Record<string, number>;
  entities?: Record<string, string[]>;
  suggestions?: string[];
  soft_signal?: ("maybe_log_meal"|"maybe_add_supplement"|"maybe_analyze_stack")[];
};

export type OpenReply = { 
  assistant_text: string; 
  meta: Meta; 
};

export async function llmOpenIntake({ 
  userText, 
  coachId, 
  memoryHint 
}: {
  userText: string; 
  coachId: string; 
  memoryHint?: string;
}): Promise<OpenReply> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const system = [
    `Du bist ${coachId === 'lucy' ? 'Dr. Lucy Martinez' : 'ein Coach'}: warm, offen, alltagstauglich.`,
    `Reagiere wie im Gespräch: max. 2 kurze Absätze, 1 Rückfrage, 0–1 Emoji, DU-Form.`,
    `Gib JSON mit {assistant_text, meta:{suggestions:string[],soft_signal?:string[]}} zurück.`,
    `Starte KEINE Tools – nur Gespräch + Vorschläge.`,
    `Beispiel-Antwort für "Ich will ein neues Supplement": {"assistant_text":"Spannend! Was reizt dich daran – die Wirkung verstehen, Qualität checken oder wie es in deinen Plan passt? 🌿","meta":{"suggestions":["Wirkung erklären","Qualität prüfen","In Stack einordnen"],"soft_signal":["maybe_add_supplement"]}}`,
    memoryHint ? `Kontext: ${memoryHint}` : ``
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices[0]?.message?.content || '{}';
    
    let out: OpenReply;
    try {
      out = JSON.parse(raw);
    } catch {
      // Fallback if JSON parsing fails
      out = {
        assistant_text: "Lass uns offen anfangen: was beschäftigt dich gerade?",
        meta: { suggestions: ["Wirkung erklären", "Qualität prüfen", "Plan besprechen"] }
      };
    }

    // Add soft signals from pattern detection
    const extraSignals = detectSoftSignals(userText);
    out.meta.soft_signal = Array.from(new Set([...(out.meta.soft_signal ?? []), ...extraSignals]));

    return out;
  } catch (error) {
    console.error('llmOpenIntake error:', error);
    // Fallback response
    return {
      assistant_text: "Erzähl mir gerne, womit ich dir helfen kann!",
      meta: { 
        suggestions: ["Training besprechen", "Ernährung planen", "Supplements checken"],
        soft_signal: detectSoftSignals(userText)
      }
    };
  }
}