import { detectSoftSignals } from './soft-detectors.ts';
import { personaPreset, loadCoachPersona } from './persona.ts';
import { toLucyTone } from './tone.ts';

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
  memoryHint,
  profile,
  recentSummaries,
  supabase
}: {
  userText: string; 
  coachId: string; 
  memoryHint?: string;
  profile?: any;
  recentSummaries?: string[];
  supabase?: any;
}): Promise<OpenReply> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Load detailed Lucy persona from coach-personas.json via supabase
  const p = supabase ? await loadCoachPersona(supabase, coachId) : personaPreset(coachId);
  
  const facts: string[] = [];
  if (profile?.goal) facts.push(`Ziel: ${profile.goal}`);
  if (profile?.weight) facts.push(`Gewicht: ${profile.weight} kg`);
  if (profile?.activity_level) facts.push(`Aktivität: ${profile.activity_level}`);
  if (profile?.macro_strategy) facts.push(`Präferenzen: ${profile.macro_strategy}`);

  const recent = (recentSummaries || []).slice(0, 3).map(s => `• ${s}`).join("\n");

  const system = [
    `Du bist ${p.name} (${p.style_rules.join("; ")}). Catchphrase: "${p.catchphrase}".`,
    `Regeln: Länge dynamisch; max. 2 kurze Absätze; 0–1 Emoji; 2–3 Mini-Bullets nur wenn nötig; Vision-fähig.`,
    `Gesprächsfluss: meist genau 1 offene, kluge Rückfrage am Ende.`,
    `Tools: Starte keine Tools. Du sammelst Kontext und schlägst nur sanft Optionen vor.`,
    `Gib reines JSON zurück: {"assistant_text": "...", "meta": {"suggestions":[], "soft_signal":[]}}`,
    facts.length ? `Profil: ${facts.join(" · ")}` : "",
    memoryHint ? `Rolling-Summary: ${memoryHint}` : "",
    recent ? `Letzte Notizen:\n${recent}` : ""
  ].filter(Boolean).join("\n");

  // Dynamische Tokenlänge je nach Nutzerhinweis/Fragetyp
  function pickMaxTokens(t: string): number {
    const lower = (t || '').toLowerCase();
    if (/\[kurz\]/.test(lower)) return 180;
    if (/\[lang\]/.test(lower)) return 900;
    if (/\b(warum|wieso|wie|erklär|erkläre|funktioniert)\b/.test(lower)) return 700;
    return 350;
  }

  const body = {
    model: "gpt-4.1-2025-04-14",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText }
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    top_p: 0.95,
    max_tokens: pickMaxTokens(userText)
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAIApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      throw new Error(`OpenAI API error: ${resp.status}`);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";

    let out: OpenReply;
    try { 
      out = JSON.parse(raw); 
    } catch {
      out = { 
        assistant_text: "Lass uns offen starten: Was ist dir heute wichtig? ✨", 
        meta: { 
          suggestions: ["Training besprechen","Ernährung strukturieren","Supplements einordnen"], 
          soft_signal: [] 
        } 
      };
    }

    // Lucy‑Ton anwenden OHNE auto sign‑off im Open‑Intake
    out.assistant_text = toLucyTone(out.assistant_text, p, { addSignOff: false, limitEmojis: 1, respectQuestion: true });

    // weiche Defaults + soft signals
    out.meta = out.meta || {};
    out.meta.suggestions = (out.meta.suggestions || []).slice(0, 3);
    const extraSignals = detectSoftSignals(userText);
    out.meta.soft_signal = Array.from(new Set([...(out.meta.soft_signal || []), ...extraSignals]));
    
    return out;
  } catch (error) {
    console.error('llmOpenIntake error:', error);
    return {
      assistant_text: "Erzähl mir gerne, womit ich dir helfen kann! ✨",
      meta: { 
        suggestions: ["Training besprechen", "Ernährung planen", "Supplements checken"],
        soft_signal: detectSoftSignals(userText)
      }
    };
  }
}