import { CoachMemory } from '@/hooks/useCoachMemory';

export interface GreetingContext {
  firstName: string;
  coachId: string;
  memory?: CoachMemory | null;
  isFirstConversation: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isWeekend: boolean;
}

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

const getDayOfWeek = (): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  return days[new Date().getDay()];
};

export const createGreetingContext = (firstName: string, coachId: string, memory?: CoachMemory | null, isFirstConversation: boolean = false): GreetingContext => {
  const dayOfWeek = getDayOfWeek();
  return {
    firstName,
    coachId,
    memory,
    isFirstConversation,
    timeOfDay: getTimeOfDay(),
    dayOfWeek,
    isWeekend: dayOfWeek === 'saturday' || dayOfWeek === 'sunday'
  };
};

// Ultra-kurze Greetings (25% der Zeit) - Richtig natürlich!
const ULTRA_SHORT_GREETINGS = {
  "lucy": ["Hey {firstName}! 💗", "Hi! 🌟", "Moin {firstName}! 💖"],
  "sascha": ["Moin {firstName}!", "Hey Großer!", "Na {firstName}!"],
  "kai": ["Hey! ⚡", "Servus! 🌊", "Yo! 💫"], 
  "markus": ["Hajo {firstName}!", "Servus! 💪", "Morsche!"],
  "dr_vita_femina": ["Hallo {firstName}! 🌸", "Hi! 💗", "Guten Tag! ✨"],
  "dr_vita": ["Hallo {firstName}! 🌸", "Hi! 💗", "Guten Tag! ✨"],
  "vita": ["Hallo {firstName}! 🌸", "Hi! 💗", "Guten Tag! ✨"],
  "integral": ["Hallo {firstName}! 🌿", "Hi! ✨", "Namaste! 🌱"],
  "sophia": ["Hallo {firstName}! 🌿", "Hi! ✨", "Namaste! 🌱"]
};

// Kurze Greetings (50% der Zeit) - Persönlichkeit pur!
const SHORT_GREETINGS = {
  "lucy": ["Hey {firstName}! Wie geht's? 💗", "Hi! Was steht an? 🌟", "Moin {firstName}! Energie da? 💖"],
  "sascha": ["Moin {firstName}! Wie liefs bis jetzt?", "Hey Großer! Was geht?", "Na {firstName}, bereit für Wahrheit?"],
  "kai": ["Hey {firstName}! Energie gecheckt? ⚡", "Servus {firstName}! Wie ist der Flow? 🌊", "Yo {firstName}! Kopf frei? 💫"],
  "markus": ["Hajo {firstName}! Bock zu schaffe? 💪", "Servus! Bereit für harte Arbeit? 🏋️‍♂️", "Morsche {firstName}! Motivation da? 🔥"],
  "dr_vita_femina": ["Hallo {firstName}! Wie fühlen Sie sich? 🌸", "Hi! Alles in Balance? 💗", "Guten Tag! Energie fließt? ✨"],
  "dr_vita": ["Hallo {firstName}! Wie fühlen Sie sich? 🌸", "Hi! Alles in Balance? 💗", "Guten Tag! Energie fließt? ✨"],
  "vita": ["Hallo {firstName}! Wie fühlen Sie sich? 🌸", "Hi! Alles in Balance? 💗", "Guten Tag! Energie fließt? ✨"],
  "integral": ["Hallo {firstName}! Alles in Harmonie? 🌿", "Hi! Bereit für Achtsamkeit? ✨", "Namaste {firstName}! Wie ist dein Zentrum? 🌱"],
  "sophia": ["Hallo {firstName}! Alles in Harmonie? 🌿", "Hi! Bereit für Achtsamkeit? ✨", "Namaste {firstName}! Wie ist dein Zentrum? 🌱"]
};

const getGreetingLength = (): 'ultra_short' | 'short' | 'normal' => {
  const random = Math.random();
  if (random < 0.25) return 'ultra_short';
  if (random < 0.75) return 'short';
  return 'normal';
};

const getUltraShortGreeting = (coachId: string, firstName: string): string => {
  const greetings = ULTRA_SHORT_GREETINGS[coachId] || ULTRA_SHORT_GREETINGS.sascha;
  const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  return selectedGreeting.replace('{firstName}', firstName || 'Du');
};

const getShortGreeting = (coachId: string, firstName: string): string => {
  const greetings = SHORT_GREETINGS[coachId] || SHORT_GREETINGS.sascha;
  const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  return selectedGreeting.replace('{firstName}', firstName || 'Du');
};

export const generateDynamicCoachGreeting = (context: GreetingContext): string => {
  const { firstName, coachId, isFirstConversation, timeOfDay } = context;
  
  if (isFirstConversation) {
    const newGreetings = {
      "sascha": ["Moin {firstName}! Bereit durchzustarten? 💪"],
      "lucy": ["Hey {firstName}! 💗 Lass uns gemeinsam loslegen!"],
      "kai": ["Hey {firstName}! ⚡ Zeit deine mentale Stärke zu entfesseln!"],
      "markus": ["Hajo {firstName}! Zeit zu schaffe und Grenzen zu sprengen! 🔥"],
      "dr_vita_femina": ["Hallo {firstName}! 🌸 Bereit für ganzheitliche Balance?"],
      "dr_vita": ["Hallo {firstName}! 🌸 Bereit für ganzheitliche Balance?"],
      "vita": ["Hallo {firstName}! 🌸 Bereit für ganzheitliche Balance?"],
      "integral": ["Hallo {firstName}! 🌿 Lass uns achtsam wachsen!"],
      "sophia": ["Hallo {firstName}! 🌿 Lass uns achtsam wachsen!"]
    };
    const greetings = newGreetings[coachId] || newGreetings.sascha;
    return greetings[0].replace('{firstName}', firstName || 'Du');
  }

  const greetingLength = getGreetingLength();
  
  if (greetingLength === 'ultra_short') {
    return getUltraShortGreeting(coachId, firstName);
  } else if (greetingLength === 'short') {
    return getShortGreeting(coachId, firstName);
  }

  // Normal greetings fallback - Richtig geil und natürlich!
  const normalGreetings = {
    "sascha": ["Moin {firstName}! Wie läuft's? Zeit für knallharte Analyse! 💪", "Hey {firstName}! Bereit für ehrliche Worte? 🎯", "Na {firstName}! Was steht heute auf dem Plan? 💥"],
    "lucy": ["Hey {firstName}! 💗 Wie geht's dir heute? Lass uns das rocken!", "Hi! Was beschäftigt dich? Zusammen schaffen wir alles! 🌟", "Moin {firstName}! 💖 Ready für positive Vibes?"],
    "kai": ["Hey {firstName}! ⚡ Wie ist deine mentale Energie heute?", "Servus {firstName}! 🌊 Kopf frei für neue Herausforderungen?", "Yo {firstName}! 💫 Bereit den Flow zu finden?"],
    "markus": ["Hajo {firstName}! Bock zu schaffe heute? Lass uns Grenzen sprengen! 🔥", "Servus {firstName}! 💪 Zeit für harte Arbeit!", "Morsche {firstName}! Motivation tanken und durchstarten! 🚀"],
    "dr_vita_femina": ["Hallo {firstName}! 🌸 Wie ist Ihr Wohlbefinden heute?", "Guten Tag! Fühlen Sie die Balance in sich? 💗", "Hi {firstName}! ✨ Bereit für ganzheitliche Gesundheit?"],
    "dr_vita": ["Hallo {firstName}! 🌸 Wie ist Ihr Wohlbefinden heute?", "Guten Tag! Fühlen Sie die Balance in sich? 💗", "Hi {firstName}! ✨ Bereit für ganzheitliche Gesundheit?"],
    "vita": ["Hallo {firstName}! 🌸 Wie ist Ihr Wohlbefinden heute?", "Guten Tag! Fühlen Sie die Balance in sich? 💗", "Hi {firstName}! ✨ Bereit für ganzheitliche Gesundheit?"],
    "integral": ["Hallo {firstName}! 🌿 Wie ist Ihre innere Mitte heute?", "Namaste {firstName}! ✨ Bereit für achtsames Wachstum?", "Hi {firstName}! 🌱 Spüren Sie die Verbindung zu sich selbst?"],
    "sophia": ["Hallo {firstName}! 🌿 Wie ist Ihre innere Mitte heute?", "Namaste {firstName}! ✨ Bereit für achtsames Wachstum?", "Hi {firstName}! 🌱 Spüren Sie die Verbindung zu sich selbst?"]
  };
  
  const greetings = normalGreetings[coachId] || normalGreetings.sascha;
  const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  return selectedGreeting.replace('{firstName}', firstName || 'Du');
};