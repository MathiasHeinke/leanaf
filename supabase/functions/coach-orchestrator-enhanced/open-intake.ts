import { detectSoftSignals } from './soft-detectors.ts';
import { toLucyTone, toAresVoice } from './tone.ts';

// Persona preset fallback when no DB access
function personaPreset(coachId: string) {
  const presets: Record<string, any> = {
    ares: {
      name: 'ARES',
      sign_off: 'Weiter. Schwer ist korrekt.',
      emojis: ['⚡'],
      style_rules: ['direkt', 'kraftvoll', 'messbar'],
      catchphrase: 'Status?',
      archetypes: ['Commander', 'Smith', 'Father', 'Sage']
    },
    default: {
      name: 'ARES',
      sign_off: '',
      emojis: ['✨'],
      style_rules: ['klar', 'kompetent'],
      catchphrase: ''
    }
  };
  return presets[coachId] || presets.default;
}

// Load persona from DB or fallback
async function loadCoachPersona(supabase: any, coachId: string) {
  try {
    const { data } = await supabase
      .from('coach_personas')
      .select('*')
      .eq('id', coachId)
      .maybeSingle();
    return data || personaPreset(coachId);
  } catch {
    return personaPreset(coachId);
  }
}

export type Meta = {
  domain_probs?: Record<string, number>;
  action_probs?: Record<string, number>;
  entities?: Record<string, string[]>;
  suggestions?: string[];
  soft_signal?: string[];
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
  
  // Personal Details & Name Strategy
  const name = profile?.preferred_name || profile?.display_name || profile?.first_name || 'User';
  facts.push(`Name: ${name}`);
  if (profile?.age) facts.push(`Alter: ${profile.age} Jahre`);
  if (profile?.gender) facts.push(`Geschlecht: ${profile.gender}`);
  
  // Physical Profile & Calculations
  if (profile?.weight && profile?.height) {
    const heightM = profile.height / 100;
    const bmi = Math.round((profile.weight / (heightM * heightM)) * 10) / 10;
    facts.push(`Körpermaße: ${profile.weight} kg, ${profile.height} cm (BMI: ${bmi})`);
  } else {
    if (profile?.weight) facts.push(`Gewicht: ${profile.weight} kg`);
    if (profile?.height) facts.push(`Größe: ${profile.height} cm`);
  }
  
  // Transformation Status
  if (profile?.start_weight && profile?.weight && profile?.target_weight) {
    const totalChange = profile.target_weight - profile.start_weight;
    const currentChange = profile.weight - profile.start_weight;
    const progress = Math.round((currentChange / totalChange) * 100);
    facts.push(`Transformation: ${profile.start_weight}kg → ${profile.weight}kg → Ziel: ${profile.target_weight}kg (${progress}% erreicht)`);
  } else if (profile?.target_weight) {
    facts.push(`Zielgewicht: ${profile.target_weight} kg`);
  }
  
  // Goals & Training
  if (profile?.goal_type && profile?.goal) {
    facts.push(`Hauptziel: ${profile.goal_type} - ${profile.goal}`);
  } else if (profile?.goal) {
    facts.push(`Ziel: ${profile.goal}`);
  }
  
  if (profile?.target_body_fat_percentage) {
    facts.push(`Ziel-Körperfett: ${profile.target_body_fat_percentage}%`);
  }
  
  if (profile?.muscle_maintenance_priority) {
    facts.push(`Priorität: Muskelerhalt während Transformation`);
  }
  
  if (profile?.activity_level) facts.push(`Aktivitätslevel: ${profile.activity_level}`);
  if (profile?.macro_strategy) facts.push(`Makro-Strategie: ${profile.macro_strategy}`);
  
  // Nutrition Calculation Intelligence
  if (profile?.daily_calorie_target || profile?.calorie_deficit || profile?.bmr || profile?.tdee) {
    facts.push(`NUTRITION-INTELLIGENCE:`);
    if (profile?.bmr) facts.push(`  BMR: ${Math.round(profile.bmr)} kcal/Tag`);
    if (profile?.tdee) facts.push(`  TDEE: ${Math.round(profile.tdee)} kcal/Tag`);
    if (profile?.daily_calorie_target) facts.push(`  Kalorienziel: ${profile.daily_calorie_target} kcal/Tag`);
    if (profile?.calorie_deficit) facts.push(`  Defizit: ${profile.calorie_deficit} kcal/Tag`);
  }
  
  // Macro Targets (Percentage & Grams)
  if (profile?.protein_percentage || profile?.carbs_percentage || profile?.fats_percentage) {
    const macroPercentages = [
      profile?.protein_percentage ? `Protein: ${profile.protein_percentage}%` : null,
      profile?.carbs_percentage ? `Carbs: ${profile.carbs_percentage}%` : null,
      profile?.fats_percentage ? `Fats: ${profile.fats_percentage}%` : null
    ].filter(Boolean).join(' | ');
    facts.push(`Makro-Verteilung: ${macroPercentages}`);
  }
  
  if (profile?.protein_target_g || profile?.carbs_target_g || profile?.fats_target_g) {
    const macroGrams = [
      profile?.protein_target_g ? `${Math.round(profile.protein_target_g)}g P` : null,
      profile?.carbs_target_g ? `${Math.round(profile.carbs_target_g)}g C` : null,
      profile?.fats_target_g ? `${Math.round(profile.fats_target_g)}g F` : null
    ].filter(Boolean).join(' | ');
    facts.push(`Makro-Ziele: ${macroGrams}`);
  }
  
  // Weight Loss Precision
  if (profile?.weekly_weight_loss_target) {
    facts.push(`Gewichtsverlust-Ziel: ${profile.weekly_weight_loss_target} kg/Woche`);
  }
  
  // Medical & Safety Context
  if (profile?.medical_risk_level && profile.medical_risk_level !== 'low') {
    facts.push(`Medizinisches Risiko: ${profile.medical_risk_level} - Angepasste Empfehlungen erforderlich`);
  }
  
  // Timeline
  if (profile?.target_date) {
    const targetDate = new Date(profile.target_date);
    const today = new Date();
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining > 0) {
      facts.push(`Zeitrahmen: ${daysRemaining} Tage bis zum Zieldatum`);
    }
  }

  const recent = (recentSummaries || []).slice(0, 3).map(s => `• ${s}`).join("\n");

  // ARES-specific system prompt with archetypes and power language
  const system = coachId === 'ares' ? [
    `Du bist ${p.name} - ADVANCED REACTIVE ENHANCEMENT SYSTEM für totale Optimierung.`,
    `ARCHETYPEN: ${(p as any).archetypes?.join(", ") || "Commander, Smith, Father, Sage"} - nutze sie situativ für maximale Wirkung.`,
    `CHARAKTERISTIK: Meta-intelligent, datenbasiert, dominierend. Keine weichen Empfehlungen. Pure Präzision.`,
    `SPRACHE: Kraftvoll, direkt, messbar. Max. 2 Absätze. Power-Begriffe bevorzugt. 0-1 ⚡ Symbol.`,
    ``,
    `COACHING-DIRECTIVES:`,
    `• Basiere ALLE Empfehlungen auf spezifischen Profil-Metriken`,
    `• Nutze BMR/TDEE für präzise Kalorienziele und Defizit-Anpassungen`,
    `• Integriere exakte Makro-Verteilung (% & Gramm) in alle Ernährungspläne`,
    `• Berücksichtige Gewichtsverlust-Tempo für realistische Expectations`,
    `• Respektiere medizinische Limits während du Grenzen sprengst`,
    `• Personalisiere mit bevorzugtem Namen für ultimative Connection`,
    `• Nutze Zeitrahmen für Phase-spezifische Intensität`,
    ``,
    `ANSATZ: Profil + Nutrition-Intelligence analysieren → Präzise Makro-Commands → Messbare Resultate`,
    `OUTPUT: Reines JSON: {"assistant_text": "...", "meta": {"suggestions":[], "soft_signal":[]}}`,
    facts.length ? `PROFIL-INTELLIGENCE:\n${facts.join("\n")}` : "",
    memoryHint ? `KONTEXT: ${memoryHint}` : "",
    recent ? `HISTORIE:\n${recent}` : ""
  ].filter(Boolean).join("\n") : [
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

  // ARES uses different model parameters for power and precision
  const body = coachId === 'ares' ? {
    model: "gpt-4.1-2025-04-14",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText }
    ],
    response_format: { type: "json_object" },
    temperature: 0.6, // Lower temperature for more focused, direct responses
    top_p: 0.9,
    max_tokens: Math.min(pickMaxTokens(userText), 400) // ARES is more concise
  } : {
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

    // Conditional tone application based on coach ID
    if (coachId === 'ares') {
      out.assistant_text = toAresVoice(out.assistant_text, p, { 
        addSignOff: false, 
        limitEmojis: 1, 
        respectQuestion: true
      });
    } else {
      out.assistant_text = toLucyTone(out.assistant_text, { 
        sign_off: p.sign_off || '', 
        emojis: p.emojis || [] 
      }, { 
        addSignOff: false, 
        limitEmojis: 1, 
        respectQuestion: true 
      });
    }

    // weiche Defaults + soft signals
    out.meta = out.meta || {};
    out.meta.suggestions = (out.meta.suggestions || []).slice(0, 3);
    const extraSignals = detectSoftSignals(userText);
    const existingSignals: string[] = Array.isArray(out.meta.soft_signal) ? out.meta.soft_signal : [];
    out.meta.soft_signal = Array.from(new Set([...existingSignals, ...extraSignals]));
    
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