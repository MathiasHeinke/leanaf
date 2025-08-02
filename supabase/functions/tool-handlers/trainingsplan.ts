import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@latest';
import { jsonrepair } from 'https://esm.sh/jsonrepair@3.13.0';

// Research data types and manager for evidence-based training
interface ResearchNode {
  id: string;
  tags: string[];
  citations?: number[];
}

interface Principle extends ResearchNode {
  name: string;
  param: string;
  recommended: {
    min?: number;
    max?: number;
    typical?: string;
    unit?: string;
  };
  description: string;
}

interface CoachProgram extends ResearchNode {
  coach: string;
  alias?: string;
  corePrinciples: string[];
  recommendations: Record<string, string | number>;
  splitExample?: string;
  notes?: string;
}

interface GoalGuideline extends ResearchNode {
  goal: "hypertrophy" | "strength" | "fat_loss";
  recommended: Record<string, string | number>;
  suitablePrograms: string[];
  description?: string;
}

interface SexSpecific extends ResearchNode {
  sex: "male" | "female";
  adjustments: Record<string, string | number>;
  description: string;
}

// Research data - embedded for edge function use
const RESEARCH_DATA: (Principle | CoachProgram | GoalGuideline | SexSpecific)[] = [
  {
    "id": "pr_01",
    "name": "Training Volume",
    "param": "sets_per_muscle_per_week",
    "recommended": { "min": 10, "max": 20, "unit": "sets" },
    "description": "Dosis-Wirkungs-Beziehung: 10-20 Arbeitssätze liefern die höchsten Hypertrophie-Zuwächse; 1-4 Sätze ≈64 %, 5-9 Sätze ≈84 %.",
    "citations": [1],
    "tags": ["hypertrophy","universal"]
  },
  {
    "id": "pr_02",
    "name": "Training Frequency",
    "param": "sessions_per_muscle_per_week",
    "recommended": { "typical": "2-3", "unit": "sessions" },
    "description": "2-3 Stimulationen pro Muskel/Woche führen zu größerer MPS & Muskelaufbau als 1×.",
    "citations": [3,4],
    "tags": ["hypertrophy","universal"]
  },
  {
    "id": "pr_03",
    "name": "Training Intensity",
    "param": "reps_in_reserve",
    "recommended": { "typical": "2-3", "unit": "RIR" },
    "description": "Muskelversagen ist nicht zwingend; 2-3 RIR bringt vergleichbare Ergebnisse bei geringerem Stress.",
    "citations": [1,2],
    "tags": ["hypertrophy","injury-prevention"]
  },
  {
    "id": "cp_nippard",
    "coach": "Jeff Nippard",
    "alias": "Evidence-Based Training",
    "corePrinciples": ["Training Volume", "Training Frequency", "Training Intensity"],
    "recommendations": { "frequency": "2-3", "volume": 20, "intensity": "2-3 RIR" },
    "notes": "Übungsauswahl nach ROM, Wohlbefinden, Progressionsfähigkeit.",
    "citations": [13,14],
    "tags": ["coach","evidence-based"]
  },
  {
    "id": "cp_mentzer",
    "coach": "Mike Mentzer",
    "alias": "Heavy Duty (HIT)",
    "corePrinciples": ["Training Intensity"],
    "recommendations": { "frequency": "0.25-1×", "volume": 2, "intensity": "beyond failure" },
    "notes": "Forced/negative reps, extreme Intensität, lange Regeneration.",
    "citations": [15,16],
    "tags": ["coach","hit","time-efficient"]
  },
  {
    "id": "cp_israetel",
    "coach": "Mike Israetel",
    "alias": "Renaissance Periodization",
    "corePrinciples": ["Volume Landmarks"],
    "recommendations": {
      "frequency": "2-4",
      "volume_range": "10-20",
      "intensity": "0-3 RIR",
      "landmarks": ["MV","MEV","MAV","MRV"]
    },
    "citations": [22,23],
    "tags": ["coach","periodization"]
  },
  {
    "id": "cp_athleanx",
    "coach": "Jeff Cavaliere",
    "alias": "Athlean-X",
    "corePrinciples": ["Functional Movement", "Training Intensity"],
    "recommendations": { "frequency": "2-3", "volume": 12, "intensity": "2-3 RIR", "focus": "compound + functional" },
    "notes": "Athletic performance focus with injury prevention emphasis.",
    "citations": [24],
    "tags": ["coach","functional","athletic"]
  },
  {
    "id": "cp_meadows",
    "coach": "John Meadows",
    "alias": "Mountain Dog",
    "corePrinciples": ["Phase Potentiation"],
    "recommendations": { "frequency": "2-3", "volume": 16, "intensity": "varies per phase" },
    "notes": "Pre-Pump, Explosive, Pump, Stretch innerhalb einer Einheit.",
    "citations": [20,21],
    "tags": ["coach","pump","advanced"]
  },
  {
    "id": "goal_hypertrophy_nat",
    "goal": "hypertrophy",
    "recommended": {
      "frequency": "2-3",
      "volume": "15-20",
      "intensity": "2-3 RIR"
    },
    "suitablePrograms": ["cp_nippard","cp_israetel"],
    "description": "Natural-freundliche Ansätze mit höherer Frequenz & moderatem Volumen.",
    "citations": [24,25],
    "tags": ["goal","natural"]
  },
  {
    "id": "goal_hypertrophy_extreme",
    "goal": "hypertrophy",
    "recommended": {
      "frequency": "1",
      "volume": "20-30",
      "intensity": "to exhaustion",
      "training_time_required": ">6h/week"
    },
    "suitablePrograms": ["cp_ruhl"],
    "description": "Extreme High-Volume-Ansätze für sehr erfahrene Athleten mit viel Zeit und robuster Regeneration.",
    "citations": [1,2,3,4,7,9,11,12],
    "tags": ["goal","advanced","high-volume","german"]
  },
  {
    "id": "goal_strength",
    "goal": "strength",
    "recommended": {
      "frequency_mainlifts": "3-4",
      "volume": "12-16",
      "intensity": "85-95 % 1RM",
      "reps": "1-5"
    },
    "suitablePrograms": ["cp_mentzer","cp_israetel"],
    "description": "Niedrigeres Volumen, hohe Intensität; ideal für Fortgeschrittene.",
    "citations": [30,31],
    "tags": ["goal"]
  },
  {
    "id": "goal_fat_loss",
    "goal": "fat_loss",
    "recommended": {
      "strength_sessions": "3-4",
      "cardio_sessions": "2",
      "method_female40plus": "4-2-1"
    },
    "suitablePrograms": ["cp_nippard","cp_israetel","cp_athleanx"],
    "description": "Kombi Kraft + Cardio; 4-2-1-Ansatz speziell für Frauen 40+.",
    "citations": [26,27,28,29],
    "tags": ["goal","fat-loss"]
  },
  {
    "id": "sx_female",
    "sex": "female",
    "adjustments": {
      "frequency": "higher (2-3×)",
      "rest_between_sets": "1-2 min",
      "rep_range_upper": 20,
      "cycle_periodization": "strength 1st half, endurance 2nd half"
    },
    "description": "Schnellere Regeneration, mehr Typ-I-Fasern, hormonelle Unterschiede.",
    "citations": [5,6,7,8,10,11],
    "tags": ["sex-diff","female"]
  },
  {
    "id": "sx_male",
    "sex": "male",
    "adjustments": {
      "volume_per_session": "higher",
      "rest_between_sets": "2-3 min",
      "focus": "heavy compound lifts"
    },
    "description": "Mehr Typ-II-Fasern, höheres Testosteron – größere Lasten, längere Pausen sinnvoll.",
    "citations": [8,12],
    "tags": ["sex-diff","male"]
  },
  {
    "id": "pr_pump",
    "name": "Pump Orientation",
    "param": "pump_focus",
    "recommended": { "typical": "maximize", "unit": "subjective" },
    "description": "Der Trainingsreiz wird primär über metabolischen Stress (‚Pump') gesetzt. Ein hoher intramuskulärer Blutfluss dient als Qualitäts-Indikator der Einheit.",
    "citations": [1,9,10],
    "tags": ["hypertrophy","metabolic-stress"]
  },
  {
    "id": "pr_adaptive_loading",
    "name": "Adaptive Loading",
    "param": "weight_selection_strategy",
    "recommended": { "typical": "adjust_daily_by_pump" },
    "description": "Last und Volumen werden spontan an das Tages-Feedback (Pump-Gefühl, Energielevel) angepasst, statt strikt periodisiert zu werden.",
    "citations": [1,7],
    "tags": ["auto-regulation","intuitive"]
  },
  {
    "id": "cp_ruhl",
    "coach": "Markus Rühl",
    "alias": "Schwer & Falsch / The German Beast",
    "corePrinciples": [
      "Training Volume",
      "Training Intensity",
      "Pump Orientation",
      "Adaptive Loading"
    ],
    "recommendations": {
      "frequency": 1,
      "volume": "20-30",
      "intensity": "to exhaustion (pump-based)",
      "split": "5-Day",
      "runtime_per_session_min": 90
    },
    "splitExample": "Mo Brust/Bauch · Di Rücken · Mi Arme/Bauch · Fr Beine/Waden · Sa Schultern/Trap",
    "notes": "Extrem hohes Volumen, sehr schwere Gewichte mit bewusst nachlassender Technik, tägliche Gewichts-Modifikation basierend auf Pump. Geeignet für sehr erfahrene Athleten mit viel Trainingszeit und robuster Regeneration.",
    "citations": [1,2,3,4,7,9,11,12],
    "tags": ["coach","high-volume","pump","german"]
  }
];

// Coach Personas for program selection
const COACH_PERSONAS = [
  {
    "id": "persona_ruhl",
    "coachName": "Markus Rühl",
    "primaryProgram": "cp_ruhl",
    "fallbackPrograms": ["cp_yates", "cp_mentzer"],
    "selectionRules": "Nutze 'cp_ruhl', wenn User ≥ 3 J Training, Ziel=Hypertrophie, Zeit/Session ≥ 90 min, keine akuten Verletzungen. Falls Zeit < 60 min ODER User fortgeschritten & liebt Kurzeinheiten → 'cp_yates'. Falls extrem wenig Zeit (≤ 30 min) & sehr routiniert → 'cp_mentzer'.",
    "tags": ["coach-routing"]
  },
  {
    "id": "persona_sascha",
    "coachName": "Sascha",
    "primaryProgram": "cp_nippard",
    "fallbackPrograms": ["cp_israetel", "cp_meadows"],
    "selectionRules": "Default 'cp_nippard' (moderates Volumen, evidenzbasiert). Bei > 20 Sätze/Woche Toleranz & Wunsch nach Periodisierung → 'cp_israetel'. Bei Wunsch nach Pump-Fokus & fortgeschrittenem Level → 'cp_meadows'.",
    "tags": ["coach-routing"]
  }
];

// Enhanced user profile extraction with comprehensive data
function extractUserProfile(conversation: any[], userId?: string): any {
  // Convert conversation to simple format for extraction
  const messages = conversation.map(msg => ({
    role: msg.role || 'user',
    content: msg.content || msg.message_content || ''
  }));

  // Use the embedded intelligent extraction logic (defined below)
  const extractedProfile = intelligentProfileExtraction(messages);
  
  // Add userId if provided
  if (userId) {
    extractedProfile.userId = userId;
  }
  
  return extractedProfile;
}

// Intelligent profile extraction function embedded in edge function
function intelligentProfileExtraction(messages: any[]): any {
  const text = messages.map(m => m.content).join(' ').toLowerCase();
  const profile: any = {};

  // Experience Years - enhanced patterns
  const yearsMatch = text.match(/\bseit\s+(\d{1,2})\s+jah?re?n?\b/i) || 
                    text.match(/(\d{1,2})\s+jahre?\s+(training|trainiert|trainiere)/i);
  if (yearsMatch) {
    profile.experienceYears = Number(yearsMatch[1]);
  } else if (text.includes('anfänger') || text.includes('beginner') || text.includes('neu')) {
    profile.experienceYears = 0.5;
  } else if (text.includes('fortgeschritten') || text.includes('advanced') || text.includes('profi')) {
    profile.experienceYears = 5;
  } else {
    profile.experienceYears = 2; // intermediate default
  }

  // Time constraints - multiple patterns
  const timeMatch = text.match(/(nur|maximal|höchstens)\s+(\d{1,3})\s*(min|stunden?)/i) ||
                   text.match(/(\d{1,3})\s*(min(uten)?|h(ours?)?|stunden?)/i);
  if (timeMatch) {
    const value = Number(timeMatch[2] || timeMatch[1]);
    const unit = timeMatch[3] || timeMatch[2];
    profile.availableMinutes = /h|stunden/.test(unit) ? value * 60 : value;
  } else {
    profile.availableMinutes = 60; // default
  }

  // Weekly sessions
  const sessMatch = text.match(/(\d)\s*(tage|mal|x)\s*(pro|\/)\s*woche/i);
  if (sessMatch) {
    profile.weeklySessions = Number(sessMatch[1]);
  }

  // Injuries - comprehensive detection
  const injuries: string[] = [];
  const injuryMatches = text.match(/(rücken|knie|schulter|ellbogen|hüfte|handgelenk)/gi);
  if (injuryMatches) {
    injuryMatches.forEach(injury => {
      const mapped = {
        'rücken': 'ruecken',
        'knie': 'knie',
        'schulter': 'schulter', 
        'ellbogen': 'ellbogen',
        'hüfte': 'huefte',
        'handgelenk': 'sonstige'
      }[injury.toLowerCase()];
      if (mapped) injuries.push(mapped);
    });
  }
  profile.injuries = Array.from(new Set(injuries));

  // Goal detection
  if (/\b(masse|muskeln|hypertrophie|größer|breiter|volumen)\b/i.test(text)) {
    profile.goal = 'hypertrophy';
  } else if (/\b(heavy|kraft|stärke|1rm|powerlifting|stark|maximal)\b/i.test(text)) {
    profile.goal = 'strength';
  } else if (/\b(cardio|laufen|ausdauer|hiit|kondition)\b/i.test(text)) {
    profile.goal = 'endurance';
  }

  // Sex detection
  if (text.includes('frau') || text.includes('weiblich') || text.includes('female')) {
    profile.sex = 'female';
  } else if (text.includes('mann') || text.includes('männlich') || text.includes('male')) {
    profile.sex = 'male';
  }

  // Preferences
  profile.preferences = {};
  if (/\b(pump|pumpen|brennen|feel)\b/i.test(text)) profile.preferences.pumpStyle = true;
  if (/\b(heavy|kraft|stärke|1rm|powerlifting|stark|maximal)\b/i.test(text)) profile.preferences.strengthFocus = true;
  if (/\b(cardio|laufen|ausdauer|hiit|kondition)\b/i.test(text)) profile.preferences.cardio = true;
  if (/\b(periodisierung|wissenschaftlich|evidenz|studien|progressive|overload)\b/i.test(text)) profile.preferences.periodization = true;

  // Legacy compatibility mappings
  profile.timePerSessionMin = profile.availableMinutes;
  profile.injury = profile.injuries && profile.injuries.length > 0;
  profile.likesPump = profile.preferences.pumpStyle;
  profile.likesPeriodization = profile.preferences.periodization;
  
  if (profile.experienceYears <= 1) profile.experience = 'beginner';
  else if (profile.experienceYears >= 3) profile.experience = 'advanced';
  else profile.experience = 'intermediate';

  return profile;
}

// Coach persona selection logic (updated to use enhanced profiles)
function selectProgramForUser(userProfile: any, coachName?: string): string {
  // Find coach persona
  const persona = COACH_PERSONAS.find(p => p.coachName === coachName);
  if (!persona) {
    return "cp_nippard"; // default fallback
  }

  const { experienceYears = 0, availableMinutes = 60, timePerSessionMin = 60, injuries = [], preferences = {}, injury = false } = userProfile;
  const sessionTime = availableMinutes || timePerSessionMin;
  const hasInjury = injury || (injuries && injuries.length > 0);
  const likesPump = preferences?.pumpStyle;
  const likesPeriodization = preferences?.periodization;
  
  // Hard gates for primary program (Markus Rühl specific)
  if (persona.id === "persona_ruhl") {
    const meetsRuhlRequirements = 
      experienceYears >= 3 &&
      userProfile.goal === "hypertrophy" &&
      sessionTime >= 90 &&
      !hasInjury;

    if (meetsRuhlRequirements) {
      return persona.primaryProgram;
    }
  }

  // Fallback logic based on constraints
  for (const fallbackId of persona.fallbackPrograms) {
    if (fallbackId === "cp_yates" && timePerSessionMin >= 45 && timePerSessionMin < 90) {
      return fallbackId;
    }
    if (fallbackId === "cp_mentzer" && timePerSessionMin <= 30 && experienceYears >= 1) {
      return fallbackId;
    }
    if (fallbackId === "cp_israetel" && likesPeriodization && timePerSessionMin >= 60) {
      return fallbackId;
    }
    if (fallbackId === "cp_meadows" && likesPump && experienceYears >= 2) {
      return fallbackId;
    }
  }

  // Default fallback to primary program
  return persona.primaryProgram;
}

// Research data utility functions
function getCoachPrograms(): CoachProgram[] {
  return RESEARCH_DATA.filter((item): item is CoachProgram => 'coach' in item);
}

function getPrinciplesForGoal(goal: string): Principle[] {
  return RESEARCH_DATA.filter((item): item is Principle => 
    'param' in item && (item.tags.includes(goal) || item.tags.includes('universal'))
  );
}

function getSexSpecificAdjustments(sex: 'male' | 'female'): SexSpecific | undefined {
  return RESEARCH_DATA.filter((item): item is SexSpecific => 
    'sex' in item
  ).find(s => s.sex === sex);
}

function getSuitablePrograms(userProfile: { goal?: string; experience?: string }): CoachProgram[] {
  const { goal, experience } = userProfile;
  let suitablePrograms = getCoachPrograms();

  // Filter by goal if specified
  if (goal) {
    const goalGuideline = RESEARCH_DATA.filter((item): item is GoalGuideline => 
      'goal' in item && item.goal === goal
    )[0];
    if (goalGuideline) {
      suitablePrograms = suitablePrograms.filter(program =>
        goalGuideline.suitablePrograms.includes(program.id)
      );
    }
  }

  // Filter by experience level
  if (experience === 'beginner') {
    suitablePrograms = suitablePrograms.filter(program =>
      !program.tags.includes('advanced') && !program.tags.includes('hit')
    );
  }

  return suitablePrograms;
}

function formatResearchContext(userProfile: { goal?: string; sex?: 'male' | 'female'; experience?: string }): string {
  const { goal, sex } = userProfile;
  
  let context = `# Research-Based Training Guidelines\n\n`;
  
  // Add principles
  if (goal) {
    const principles = getPrinciplesForGoal(goal);
    if (principles.length > 0) {
      context += `## Core Training Principles for ${goal}:\n`;
      principles.forEach(principle => {
        context += `- **${principle.name}**: ${principle.description}\n`;
        if (principle.recommended.typical) {
          context += `  Empfehlung: ${principle.recommended.typical} ${principle.recommended.unit || ''}\n`;
        }
      });
      context += `\n`;
    }
  }

  // Add sex-specific adjustments
  if (sex) {
    const sexAdjustments = getSexSpecificAdjustments(sex);
    if (sexAdjustments) {
      context += `## Geschlechtsspezifische Anpassungen (${sex}):\n`;
      context += `${sexAdjustments.description}\n`;
      Object.entries(sexAdjustments.adjustments).forEach(([key, value]) => {
        context += `- ${key}: ${value}\n`;
      });
      context += `\n`;
    }
  }

  // Add suitable coach programs
  const suitablePrograms = getSuitablePrograms(userProfile);
  if (suitablePrograms.length > 0) {
    context += `## Empfohlene Trainingsmethoden:\n`;
    suitablePrograms.forEach(program => {
      context += `### ${program.coach} - ${program.alias || program.coach}\n`;
      context += `Kernprinzipien: ${program.corePrinciples.join(', ')}\n`;
      if (program.notes) {
        context += `Besonderheiten: ${program.notes}\n`;
      }
      context += `\n`;
    });
  }

  return context;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Training Plan Validation Schema
const TrainingPlanResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  goals: z.array(z.string()).min(1),
  html: z.string().optional(),
  ts: z.number(),
  actions: z.array(z.object({
    label: z.string(),
    variant: z.enum(['confirm', 'reject']),
    onClick: z.function().optional()
  })).optional()
});

const ToolResponseSchema = z.object({
  role: z.literal('assistant'),
  type: z.literal('card'),
  card: z.enum(['workout_plan', 'trainingsplan', 'plan']),
  payload: TrainingPlanResponseSchema,
  meta: z.object({
    clearTool: z.boolean().optional()
  }).optional()
});

type TrainingPlanResponse = z.infer<typeof TrainingPlanResponseSchema>;
type ToolResponse = z.infer<typeof ToolResponseSchema>;

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

function safeJsonParse(jsonString: string) {
  try {
    return { success: true, data: JSON.parse(jsonString) };
  } catch (error) {
    try {
      // Try to repair the JSON
      const repairedJson = jsonrepair(jsonString);
      return { success: true, data: JSON.parse(repairedJson) };
    } catch (repairError) {
      console.error('JSON repair failed:', repairError);
      return { success: false, error: repairError };
    }
  }
}

// Enhanced user profile extraction using intelligent utils
function extractUserProfile(message: string, conv: any[]): any {
  // Simple import simulation (in production, this would be properly imported)
  const extractUserProfileUtil = (messages: any[]): any => {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    const profile: any = {};

    // Experience Years - enhanced patterns
    const yearsMatch = text.match(/\bseit\s+(\d{1,2})\s+jah?re?n?\b/i) || 
                      text.match(/(\d{1,2})\s+jahre?\s+(training|trainiert|trainiere)/i);
    if (yearsMatch) {
      profile.experienceYears = Number(yearsMatch[1]);
    } else if (text.includes('anfänger') || text.includes('beginner') || text.includes('neu')) {
      profile.experienceYears = 0.5;
    } else if (text.includes('fortgeschritten') || text.includes('advanced') || text.includes('profi')) {
      profile.experienceYears = 5;
    } else {
      profile.experienceYears = 2; // intermediate default
    }

    // Time constraints - multiple patterns
    const timeMatch = text.match(/(nur|maximal|höchstens)\s+(\d{1,3})\s*(min|stunden?)/i) ||
                     text.match(/(\d{1,3})\s*(min(uten)?|h(ours?)?|stunden?)/i);
    if (timeMatch) {
      const value = Number(timeMatch[2] || timeMatch[1]);
      const unit = timeMatch[3] || timeMatch[2];
      profile.availableMinutes = /h|stunden/.test(unit) ? value * 60 : value;
    } else {
      profile.availableMinutes = 60; // default
    }

    // Weekly sessions
    const sessMatch = text.match(/(\d)\s*(tage|mal|x)\s*(pro|\/)\s*woche/i);
    if (sessMatch) {
      profile.weeklySessions = Number(sessMatch[1]);
    }

    // Injuries - comprehensive detection
    const injuries: string[] = [];
    const injuryMatches = text.match(/(rücken|knie|schulter|ellbogen|hüfte|handgelenk)/gi);
    if (injuryMatches) {
      injuryMatches.forEach(injury => {
        const mapped = {
          'rücken': 'ruecken',
          'knie': 'knie',
          'schulter': 'schulter', 
          'ellbogen': 'ellbogen',
          'hüfte': 'huefte',
          'handgelenk': 'sonstige'
        }[injury.toLowerCase()];
        if (mapped) injuries.push(mapped);
      });
    }
    profile.injuries = Array.from(new Set(injuries));

    // Goal detection
    if (/\b(masse|muskeln|hypertrophie|größer|breiter|volumen)\b/i.test(text)) {
      profile.goal = 'hypertrophy';
    } else if (/\b(heavy|kraft|stärke|1rm|powerlifting|stark|maximal)\b/i.test(text)) {
      profile.goal = 'strength';
    } else if (/\b(cardio|laufen|ausdauer|hiit|kondition)\b/i.test(text)) {
      profile.goal = 'endurance';
    }

    // Sex detection
    if (text.includes('frau') || text.includes('weiblich') || text.includes('female')) {
      profile.sex = 'female';
    } else if (text.includes('mann') || text.includes('männlich') || text.includes('male')) {
      profile.sex = 'male';
    }

    // Preferences
    profile.preferences = {};
    if (/\b(pump|pumpen|brennen|feel)\b/i.test(text)) profile.preferences.pumpStyle = true;
    if (/\b(heavy|kraft|stärke|1rm|powerlifting|stark|maximal)\b/i.test(text)) profile.preferences.strengthFocus = true;
    if (/\b(cardio|laufen|ausdauer|hiit|kondition)\b/i.test(text)) profile.preferences.cardio = true;
    if (/\b(periodisierung|wissenschaftlich|evidenz|studien|progressive|overload)\b/i.test(text)) profile.preferences.periodization = true;

    // Legacy compatibility mappings
    profile.timePerSessionMin = profile.availableMinutes;
    profile.injury = profile.injuries && profile.injuries.length > 0;
    profile.likesPump = profile.preferences.pumpStyle;
    profile.likesPeriodization = profile.preferences.periodization;
    
    if (profile.experienceYears <= 1) profile.experience = 'beginner';
    else if (profile.experienceYears >= 3) profile.experience = 'advanced';
    else profile.experience = 'intermediate';

    return profile;
  };

  // Convert conversation to format expected by extraction function
  const messages = [
    ...conv.map(c => ({ content: c.content || c.message_content || '' })),
    { content: message }
  ];

  return extractUserProfileUtil(messages);
}

export default async function handleTrainingsplan(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Check cache first
  const cacheKey = `plan:${userId}:${btoa(lastUserMsg).slice(0, 16)}`;
  const cachedResult = getCachedData(cacheKey);
  if (cachedResult) {
    console.log('Returning cached enhanced training plan');
    return cachedResult;
  }
  
  try {
    // Extract enhanced user profile with intelligent extraction
    const userProfile = extractUserProfile(conv, userId);
    console.log('Enhanced user profile extracted:', JSON.stringify(userProfile, null, 2));
    
    // Save/update user profile in database for future reference
    if (userId && userProfile) {
      try {
        await supabase
          .from('user_profiles')
          .upsert(
            { 
              user_id: userId, 
              profile: userProfile 
            }, 
            { onConflict: 'user_id' }
          );
        console.log('✅ User profile saved to database for future personalization');
      } catch (profileError) {
        console.warn('⚠️ Could not save user profile:', profileError);
        // Continue without breaking the flow
      }
    }
    
    const researchContext = formatResearchContext(userProfile);
    console.log('User profile analysis complete. Proceeding with intelligent plan generation...');
    
    // Extrahiere Trainingsplan-Informationen aus der Nachricht
    const planName = extractPlanName(lastUserMsg);
    const goals = extractGoals(lastUserMsg);
    
    // Check if we should use enhanced generation or fallback to simple
    const useEnhancedGeneration = lastUserMsg.includes('vollwertig') || 
                                 lastUserMsg.includes('enhanced') || 
                                 lastUserMsg.includes('detailliert');
    
    if (useEnhancedGeneration) {
      // Call enhanced training plan generator
      console.log('Using enhanced training plan generation');
      
      // Prepare request for enhanced generator
      const enhancedRequest = {
        userProfile,
        goals,
        planName,
        coachId: 'lucy', // From route context
        useAI: false // Template-based for now
      };
      
      // Note: In production, this would be a proper HTTP call
      // For now, we'll simulate the enhanced response structure
      const enhancedPlan = {
        id: crypto.randomUUID(),
        name: planName,
        description: `Vollwertiger evidenzbasierter Trainingsplan für ${goals.join(', ')}`,
        planType: userProfile.goal || 'custom',
        durationWeeks: 4,
        targetFrequency: 4,
        goals,
        days: generateEnhancedTrainingDays(userProfile, goals),
        scientificBasis: {
          methodology: 'Evidence-Based Training (Jeff Nippard)',
          researchCitations: ['Schoenfeld_2019', 'Kraemer_2017', 'Helms_2020'],
          appliedPrinciples: ['Progressive Overload', 'Volume Landmarks', 'Training Frequency', 'RPE-Based Autoregulation']
        },
        progressionScheme: {
          type: 'linear',
          volumeProgression: true,
          intensityProgression: true,
          frequencyAdjustment: false
        },
        status: 'draft',
        ts: Date.now(),
        html: generateEnhancedPlanHtml(planName, goals),
        actions: [
          { label: '✅ Plan aktivieren', variant: 'confirm', action: 'accept' },
          { label: '🛠️ Anpassen', variant: 'edit', action: 'customize' },
          { label: '🗑️ Ablehnen', variant: 'reject', action: 'decline' }
        ]
      };
      
      // Create enhanced plan entry in DB (simplified for demo)
      const { data: planData, error } = await supabase.from('workout_plans').insert({
        created_by: userId,
        name: enhancedPlan.name,
        category: enhancedPlan.planType,
        plan_type: enhancedPlan.planType,
        duration_weeks: enhancedPlan.durationWeeks,
        target_frequency: enhancedPlan.targetFrequency,
        scientific_basis: enhancedPlan.scientificBasis,
        progression_scheme: enhancedPlan.progressionScheme,
        description: enhancedPlan.description,
        exercises: { enhanced: true, researchBased: true, version: 'v1' },
        estimated_duration_minutes: 60,
        status: 'draft',
        is_public: false
      }).select().single();
      
      if (error) {
        console.error('[enhanced-trainingsplan]', error);
        // Fallback to simple plan
      } else {
        enhancedPlan.id = planData.id;
        
        const response = {
          role: 'assistant',
          type: 'card',
          card: 'training_plan',
          payload: enhancedPlan,
          meta: { 
            clearTool: true,
            enhanced: true,
            generationMethod: 'template'
          }
        };
        
        setCachedData(cacheKey, response);
        return response;
      }
    }
    
    // Dynamic coach detection from conversation context
    const extractCoachFromContext = (conversationData: any): string => {
      // 1. Priority: Check for coach personality in conversation data
      const coachPersonality = conversationData?.coachPersonality || conversationData?.coachId;
      
      // Map frontend coach IDs to coach names for persona lookup
      const coachMapping: Record<string, string> = {
        'markus': 'Markus Rühl',
        'sascha': 'Sascha', 
        'lucy': 'Lucy',
        'kai': 'Kai',
        'dr_vita': 'Dr. Vita Femina'
      };
      
      if (coachPersonality && coachMapping[coachPersonality]) {
        console.log(`🎯 Coach detected from context: ${coachMapping[coachPersonality]} (${coachPersonality})`);
        return coachMapping[coachPersonality];
      }
      
      // 2. Fallback: Try to extract from user message
      const lowerText = lastUserMsg.toLowerCase();
      if (lowerText.includes('markus') || lowerText.includes('rühl') || lowerText.includes('ruhl')) return 'Markus Rühl';
      if (lowerText.includes('sascha')) return 'Sascha';
      if (lowerText.includes('lucy')) return 'Lucy';
      if (lowerText.includes('kai')) return 'Kai';
      if (lowerText.includes('dr vita') || lowerText.includes('vita femina')) return 'Dr. Vita Femina';
      
      // 3. Default fallback (could be made smarter based on user profile)
      console.log(`⚠️ No coach context found, using Sascha as default`);
      return 'Sascha';
    };
    
    // Use coach persona system for intelligent program selection
    const coachName = extractCoachFromContext(conv);
    const selectedProgramId = selectProgramForUser(userProfile, coachName);
    const recommendedProgram = getCoachPrograms().find(p => p.id === selectedProgramId) || getCoachPrograms()[0];
    
    const { data: planData, error } = await supabase.from('workout_plans').insert({
      created_by: userId,
      name: planName,
      category: goals[0] ?? 'Allgemein',
      description: [
        `Evidenzbasierter Trainingsplan erstellt am ${new Date().toLocaleDateString('de-DE')}`,
        goals.length ? `Ziel(e): ${goals.join(', ')}` : '',
        `Basiert auf: ${recommendedProgram?.coach} (${recommendedProgram?.alias}) Methodik`,
        userProfile.sex ? `Geschlechtsspezifische Anpassungen: ${userProfile.sex}` : ''
      ].join('\n').trim(),
      exercises: {
        researchBased: true,
        userProfile: userProfile,
        appliedPrinciples: getPrinciplesForGoal(userProfile.goal || 'hypertrophy').map(p => p.name),
        coachMethodology: recommendedProgram?.coach || 'Evidence-Based',
        sexSpecificAdjustments: userProfile.sex ? getSexSpecificAdjustments(userProfile.sex) : null,
        researchContext: researchContext
      },
      estimated_duration_minutes: null,
      is_public: false
    }).select().single();
    
    if (error) {
      console.error('[trainingsplan]', error);
      return {
        role: 'assistant',
        content: 'Uups – der evidenzbasierte Plan wurde nicht gespeichert. Ich prüfe gerade die Datenbank-Felder und versuche es gleich nochmal!',
      };
    }
    
    // Create validated payload with actions
    const payload = {
      id: planData.id,
      name: planData.name,
      description: planData.description,
      goals,
      html: generatePlanHtml(planData, goals, recommendedProgram),
      ts: Date.now(),
      actions: [
        { label: '✏️ Plan bearbeiten', variant: 'confirm' },
        { label: '📋 Plan aktivieren', variant: 'confirm' }
      ]
    };

    const response = {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan',
      payload,
      meta: { clearTool: true }
    };
    
    setCachedData(cacheKey, response);
    return response;
    
  } catch (error) {
    console.error('Error in enhanced trainingsplan handler:', error);
    
    const fallbackResponse = {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan',
      payload: {
        id: crypto.randomUUID(),
        name: 'Fehler beim Erstellen',
        description: 'Ein Fehler ist aufgetreten beim Erstellen des evidenzbasierten Trainingsplans.',
        goals: ['Allgemein'],
        html: generateErrorHtml(error),
        ts: Date.now(),
        actions: [{ label: '🔄 Erneut versuchen', variant: 'confirm' }]
      },
      meta: { clearTool: true }
    };
    
    const errorCacheKey = `error:${cacheKey}`;
    cache.set(errorCacheKey, { data: fallbackResponse, timestamp: Date.now() });
    setTimeout(() => cache.delete(errorCacheKey), 5 * 60 * 1000);
    
    return fallbackResponse;
  }
}

// Enhanced plan generation helpers
function generateEnhancedTrainingDays(userProfile: any, goals: string[]) {
  return [
    {
      dayId: 'mon',
      dayName: 'Montag',
      focus: 'Push (Brust, Schultern, Trizeps)',
      position: 1,
      isRestDay: false,
      exercises: [
        {
          exerciseName: 'Bench Press',
          exerciseType: 'strength',
          muscleGroups: ['pectorals', 'triceps', 'anterior_deltoid'],
          equipment: ['barbell', 'bench'],
          position: 1,
          progressionType: 'linear',
          sets: [
            { setNumber: 1, targetReps: 8, targetRPE: 6, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 2.5 } },
            { setNumber: 2, targetReps: 6, targetRPE: 7, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 2.5 } },
            { setNumber: 3, targetReps: 4, targetRPE: 8, restSeconds: 180, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 2.5 } }
          ],
          notes: 'Focus on controlled eccentric movement (3 seconds down)'
        },
        {
          exerciseName: 'Overhead Press',
          exerciseType: 'strength',
          muscleGroups: ['anterior_deltoid', 'triceps'],
          equipment: ['barbell'],
          position: 2,
          progressionType: 'linear',
          sets: [
            { setNumber: 1, targetReps: 8, targetRPE: 7, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 1.25 } },
            { setNumber: 2, targetReps: 8, targetRPE: 8, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 1.25 } },
            { setNumber: 3, targetReps: 8, targetRPE: 8, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 1.25 } }
          ]
        }
      ]
    },
    {
      dayId: 'tue',
      dayName: 'Dienstag',
      focus: 'Pull (Rücken, Bizeps)',
      position: 2,
      isRestDay: false,
      exercises: [
        {
          exerciseName: 'Pull-ups',
          exerciseType: 'strength',
          muscleGroups: ['lats', 'rhomboids', 'biceps'],
          equipment: ['pull_up_bar'],
          position: 1,
          progressionType: 'linear',
          sets: [
            { setNumber: 1, targetReps: 8, targetRPE: 7, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: true } },
            { setNumber: 2, targetReps: 6, targetRPE: 8, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: true } },
            { setNumber: 3, targetReps: 4, targetRPE: 8, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: true } }
          ]
        }
      ]
    },
    {
      dayId: 'wed',
      dayName: 'Mittwoch',
      focus: 'Ruhetag',
      position: 3,
      isRestDay: true,
      exercises: []
    },
    {
      dayId: 'thu',
      dayName: 'Donnerstag',
      focus: 'Legs (Beine, Gesäß)',
      position: 4,
      isRestDay: false,
      exercises: [
        {
          exerciseName: 'Squat',
          exerciseType: 'strength',
          muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
          equipment: ['barbell', 'rack'],
          position: 1,
          progressionType: 'linear',
          sets: [
            { setNumber: 1, targetReps: 8, targetRPE: 6, restSeconds: 180, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 5 } },
            { setNumber: 2, targetReps: 6, targetRPE: 7, restSeconds: 180, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 5 } },
            { setNumber: 3, targetReps: 4, targetRPE: 8, restSeconds: 180, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 5 } }
          ]
        }
      ]
    },
    {
      dayId: 'fri',
      dayName: 'Freitag',
      focus: 'Upper Body Mix',
      position: 5,
      isRestDay: false,
      exercises: [
        {
          exerciseName: 'Incline Dumbbell Press',
          exerciseType: 'strength',
          muscleGroups: ['upper_chest', 'anterior_deltoid'],
          equipment: ['dumbbells', 'incline_bench'],
          position: 1,
          progressionType: 'linear',
          sets: [
            { setNumber: 1, targetReps: 10, targetRPE: 7, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 2.5 } },
            { setNumber: 2, targetReps: 8, targetRPE: 8, restSeconds: 120, isWarmup: false, progressionRule: { type: 'linear', rpeProgression: false, increment: 2.5 } }
          ]
        }
      ]
    }
  ];
}

function generateEnhancedPlanHtml(planName: string, goals: string[]): string {
  return `
    <div class="p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
      <h3 class="text-lg font-semibold text-primary dark:text-primary mb-2">🏋️ Vollwertiger Trainingsplan erstellt</h3>
      <p class="text-foreground dark:text-foreground mb-2"><strong>${planName}</strong></p>
      <div class="mt-3 text-xs text-muted-foreground space-y-1">
        <p>🎯 Ziele: ${goals.join(', ')}</p>
        <p>📅 4 Wochen • 4-5 Trainingstage/Woche</p>
        <p>🔬 Evidence-Based Training (Jeff Nippard Methodik)</p>
        <p>📈 Progressive Überladung mit RPE-Autoregulation</p>
        <p>⚡ Detaillierte Set/Rep/RPE-Vorgaben</p>
      </div>
    </div>
  `;
}

function extractPlanName(message: string): string {
  // Einfache Extraktion des Plan-Namens
  const matches = message.match(/plan.{0,10}(?:für|mit|zum|zur)?\s*([a-zA-ZäöüÄÖÜ\s]+)/i);
  if (matches && matches[1]) {
    return matches[1].trim().slice(0, 50);
  }
  return `Evidenzbasierter Trainingsplan ${new Date().toLocaleDateString('de-DE')}`;
}

function extractGoals(message: string): string[] {
  const goals: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('abnehm') || lowerMessage.includes('gewicht')) {
    goals.push('Gewichtsverlust');
  }
  if (lowerMessage.includes('muskel') || lowerMessage.includes('masse')) {
    goals.push('Muskelaufbau');
  }
  if (lowerMessage.includes('kraft')) {
    goals.push('Kraftsteigerung');
  }
  if (lowerMessage.includes('ausdauer') || lowerMessage.includes('cardio')) {
    goals.push('Ausdauer');
  }
  if (lowerMessage.includes('definition') || lowerMessage.includes('straff')) {
    goals.push('Definition');
  }
  
  return goals.length > 0 ? goals : ['Allgemeine Fitness'];
}

function generatePlanHtml(planData: any, goals: string[], recommendedProgram?: CoachProgram): string {
  const sanitizedName = planData.name?.replace(/[<>]/g, '') || 'Unbenannter Plan';
  const sanitizedDescription = planData.description?.replace(/[<>]/g, '') || '';
  
  return `<div class="p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
    <h3 class="text-lg font-semibold text-primary dark:text-primary mb-2">✅ Evidenzbasierter Trainingsplan erstellt</h3>
    <p class="text-foreground dark:text-foreground mb-2"><strong>${sanitizedName}</strong></p>
    <p class="text-sm text-muted-foreground">${sanitizedDescription}</p>
    <div class="mt-3 text-xs text-muted-foreground">
      Ziele: ${Array.isArray(goals) ? goals.join(', ') : 'Allgemeine Fitness'}
    </div>
    ${recommendedProgram ? `<div class="mt-2 text-xs text-muted-foreground">
      Basiert auf: ${recommendedProgram.coach} (${recommendedProgram.alias}) Methodik
    </div>` : ''}
    <div class="mt-4 p-3 bg-background/50 rounded-md">
      <p class="text-xs text-muted-foreground">Plan-ID: ${planData.id}</p>
      <p class="text-xs text-muted-foreground">Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>
      <p class="text-xs text-green-600">🔬 Research-based methodology</p>
    </div>
  </div>`;
}

function generateErrorHtml(error: any): string {
  return `<div class="p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 dark:from-destructive/20 dark:to-destructive/10 rounded-lg border border-destructive/20 dark:border-destructive/30">
    <h3 class="text-lg font-semibold text-destructive dark:text-destructive mb-2">❌ Fehler aufgetreten</h3>
    <p class="text-sm text-muted-foreground">Der evidenzbasierte Trainingsplan konnte nicht erstellt werden.</p>
    <p class="text-xs text-muted-foreground mt-2">Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.</p>
  </div>`;
}