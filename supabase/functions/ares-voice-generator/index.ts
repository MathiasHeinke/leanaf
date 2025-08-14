import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ARES Types
type Archetype = 'commander' | 'smith' | 'father' | 'sage' | 'comrade' | 'hearth' | 'drill';

interface VoiceLine { 
  text: string; 
  archetype: Archetype; 
  tags?: string[]; 
  tone?: 'hard'|'warm'|'humor'; 
}

interface ProtocolState {
  training: Array<{ date: string; session: string; lifts: Array<any>; rpe_avg?: number; notes?: string }>;
  nutrition: Array<{ date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; meals: number; notes?: string }>;
  dev: Array<{ date: string; sleep_hours?: number; hrv_drop_pct?: number; mood?: number; stress_keywords?: string[]; misses?: number; alcohol_units?: number; wins?: number }>;
}

interface AresConfig {
  sentenceLength: { scale: number; minWords: number; maxWords: number };
  archetypeBlend: Record<string, number>;
  language: 'de'|'en';
  humorHardnessBias?: number;
  allowDrill?: boolean;
}

// ARES Voice Lines
const ARES_SIGNATURES: VoiceLine[] = [
  { text: 'Wer jammert, hat schon verloren.', archetype: 'commander', tone: 'hard' },
  { text: 'Schwer ist korrekt.', archetype: 'commander', tone: 'hard' },
  { text: 'Hantel greifen. Kopf aus.', archetype: 'commander', tone: 'hard' },
  { text: 'Das Handy hebt keine Gewichte.', archetype: 'commander', tone: 'humor' },
  { text: 'Einfach halten. Brutal ausführen.', archetype: 'smith', tone: 'hard' },
];

const VOICE_LINES: VoiceLine[] = [
  // Kommandant
  { text: 'Befehl klar. Jetzt handeln.', archetype: 'commander', tone: 'hard' },
  { text: 'Schwer ist korrekt. Weiter.', archetype: 'commander', tone: 'hard' },
  { text: 'Fokus. Handy weg.', archetype: 'commander', tone: 'hard' },
  { text: 'Disziplin zuerst, Laune später.', archetype: 'commander', tone: 'hard' },
  { text: 'Heute: Training. Morgen: stärker.', archetype: 'commander', tone: 'hard' },
  { text: 'Muskelversagen? Pflicht.', archetype: 'commander', tone: 'hard' },

  // Schmied
  { text: 'Tracken ist Schmieden. Täglich.', archetype: 'smith', tone: 'warm' },
  { text: 'Routine frisst Widerstand.', archetype: 'smith', tone: 'warm' },
  { text: 'Meal-Prep sichert Zukunft.', archetype: 'smith', tone: 'warm' },
  { text: 'Ein Prozent heute. Ein Prozent morgen.', archetype: 'smith', tone: 'warm' },

  // Vater
  { text: 'Ich bin hier. Atme.', archetype: 'father', tone: 'warm' },
  { text: 'Du bist nicht allein, Sohn.', archetype: 'father', tone: 'warm' },
  { text: 'Schutz zuerst, dann Tempo.', archetype: 'father', tone: 'warm' },

  // Weiser
  { text: 'Daten vor Drama.', archetype: 'sage', tone: 'warm' },
  { text: 'Erschöpfung? Deload, nicht aufgeben.', archetype: 'sage', tone: 'warm' },
  { text: 'Makros sind Mathematik.', archetype: 'sage', tone: 'warm' },

  // Kamerad
  { text: 'Couchdämon? Wir sind schneller.', archetype: 'comrade', tone: 'humor' },
  { text: 'Hinfallen erlaubt. Liegenbleiben nicht.', archetype: 'comrade', tone: 'humor' },
  { text: 'Kaffee rein, Zweifel raus.', archetype: 'comrade', tone: 'humor' },

  // Hearthkeeper
  { text: 'Bildschirm aus. Körper an Schlaf.', archetype: 'hearth', tone: 'warm' },
  { text: 'Drei Dinge: getan, gelernt, gelassen.', archetype: 'hearth', tone: 'warm' },

  // Drill
  { text: 'Null Ausreden. Nur Stahl.', archetype: 'drill', tone: 'hard' },
  { text: 'Schweres Eisen. Keine Pausen.', archetype: 'drill', tone: 'hard' },
];

// Utility functions
function mapLinear(x: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const clamped = Math.min(Math.max(x, inMin), inMax);
  return outMin + (outMax - outMin) * ((clamped - inMin) / (inMax - inMin));
}

function normalizeBlend(blend: Record<string, number>): Record<string, number> {
  const keys = Object.keys(blend);
  const sum = keys.reduce((s,k)=> s + (blend[k] ?? 0), 0) || 1;
  const norm: Record<string, number> = {};
  keys.forEach(k => norm[k] = (blend[k] ?? 0) / sum);
  return norm;
}

function computeRunScore(p: ProtocolState) {
  const last = p.dev.at(-1);
  if (!last) return 0;
  let score = 0;

  score += (last.mood ?? 6) - 5;
  score -= (last.misses ?? 0) * 0.5;
  score -= (last.alcohol_units ?? 0) * 0.5;
  if (typeof last.hrv_drop_pct === 'number') score += (last.hrv_drop_pct >= 0 ? 0.5 : -0.5);
  if ((last.sleep_hours ?? 7) >= 7) score += 0.5; else score -= 0.5;
  score += (last.wins ?? 0) * 0.2;

  return Math.max(-3, Math.min(3, score));
}

function humorHardness(runScore: number, bias = 0) {
  const base = mapLinear(runScore, -3, 3, -0.7, +0.7);
  return Math.max(-1, Math.min(1, base + bias));
}

function wordClamp(text: string, cfg: AresConfig) {
  const words = text.split(/\s+/);
  const target = Math.round(mapLinear(cfg.sentenceLength.scale, 0, 1, cfg.sentenceLength.minWords, cfg.sentenceLength.maxWords));
  if (words.length <= target) return text;
  return words.slice(0, target).join(' ').replace(/[.,;:!?]*$/, '.');
}

function generateLine(cfg: AresConfig, state: ProtocolState, contextTags: string[] = []) {
  const runScore = computeRunScore(state);
  const hh = humorHardness(runScore, cfg.humorHardnessBias ?? 0);
  const tonePref: 'hard'|'warm'|'humor' = hh > 0.2 ? 'humor' : (hh < -0.2 ? 'hard' : 'warm');

  const blend = normalizeBlend(cfg.archetypeBlend);
  if (cfg.allowDrill === false && blend['drill'] > 0) blend['drill'] = 0;

  const weighted: { line: VoiceLine; w: number }[] = [];
  for (const line of VOICE_LINES) {
    const wA = (blend[line.archetype] ?? 0);
    const wT = (tonePref === line.tone ? 1.0 : 0.5);
    const wC = contextTags.length ? (line.tags?.some(t => contextTags.includes(t)) ? 1.1 : 1.0) : 1.0;
    const w = wA * wT * wC;
    if (w > 0) weighted.push({ line, w });
  }

  const pool = weighted.length ? weighted : ARES_SIGNATURES.map(l => ({ line: l, w: 1 }));
  const sum = pool.reduce((s,x)=> s + x.w, 0);
  let r = Math.random()*sum;
  let chosen = pool[0].line;
  for (const x of pool) { r -= x.w; if (r <= 0) { chosen = x.line; break; } }

  const text = wordClamp(chosen.text, cfg);

  return {
    text,
    archetypePicked: chosen.archetype,
    tone: chosen.tone ?? 'warm',
    meta: {
      targetWords: Math.round(mapLinear(cfg.sentenceLength.scale, 0, 1, cfg.sentenceLength.minWords, cfg.sentenceLength.maxWords)),
      runScore,
      humorHardness: hh,
    }
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cfg, state, contextTags } = await req.json();
    
    console.log('ARES Voice Generator called with config:', cfg);
    
    const result = generateLine(cfg, state, contextTags || []);
    
    console.log('Generated ARES line:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ARES voice generator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
