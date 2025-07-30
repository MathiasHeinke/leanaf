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

// Ultra-kurze Greetings (25% der Zeit)
const ULTRA_SHORT_GREETINGS = {
  "lucy": ["Hey {firstName}! 💗", "Hi Schatz! 🌟", "Moin {firstName}! 💖"],
  "sascha": ["Moin {firstName}!", "Hey Großer!", "Na {firstName}!"],
  "kai": ["Hey! ⚡", "Servus! 🌊", "Yo! 💫"],
  "markus": ["Hajo {firstName}!", "Servus! 💪", "Morsche!"],
  "dr_vita_femina": ["Hallo {firstName}! 🌸", "Hi! 💗", "Guten Tag! ✨"],
  "dr_vita": ["Hallo {firstName}! 🌸", "Hi! 💗", "Guten Tag! ✨"],
  "vita": ["Hallo {firstName}! 🌸", "Hi! 💗", "Guten Tag! ✨"],
  "integral": ["Hallo {firstName}! 🌿", "Hi! ✨", "Guten Tag! 🌱"],
  "sophia": ["Hallo {firstName}! 🌿", "Hi! ✨", "Guten Tag! 🌱"]
};

// Kurze Greetings (50% der Zeit)
const SHORT_GREETINGS = {
  "lucy": ["Hey {firstName}! Wie geht's? 💗", "Hi Schatz! Was steht an? 🌟"],
  "sascha": ["Moin {firstName}! Wie liefs bis jetzt?", "Hey Großer! Was geht?", "Na {firstName}, bereit?"],
  "kai": ["Hey {firstName}! Energie gecheckt? ⚡", "Servus {firstName}! Wie ist der Flow? 🌊", "Yo {firstName}! Kopf frei? 💫"],
  "markus": ["Hajo {firstName}! Bock zu schaffe? 💪", "Servus! Bereit für Arbeit? 🏋️‍♂️"],
  "dr_vita_femina": ["Hallo {firstName}! Wie fühlen Sie sich? 🌸", "Hi! Alles in Balance? 💗"],
  "dr_vita": ["Hallo {firstName}! Wie fühlen Sie sich? 🌸", "Hi! Alles in Balance? 💗"],
  "vita": ["Hallo {firstName}! Wie fühlen Sie sich? 🌸", "Hi! Alles in Balance? 💗"],
  "integral": ["Hallo {firstName}! Alles in Harmonie? 🌿", "Hi! Bereit für Achtsamkeit? ✨"],
  "sophia": ["Hallo {firstName}! Alles in Harmonie? 🌿", "Hi! Bereit für Achtsamkeit? ✨"]
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
      "sascha": ["Moin {firstName}! Sascha hier - bereit durchzustarten? 💪"],
      "lucy": ["Hey {firstName}! 💗 Lucy hier - lass uns loslegen!"],
      "kai": ["Hey {firstName}! ⚡ Lass uns deine mentale Stärke boosten!"],
      "markus": ["Hajo {firstName}! Markus hier - Zeit zu schaffe! 🔥"]
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

  // Normal greetings fallback
  const normalGreetings = {
    "sascha": ["Moin {firstName}! Wie läuft's? Zeit für ehrliche Analyse! 💪"],
    "lucy": ["Hey {firstName}! 💗 Wie geht's dir heute? Lass uns schauen, was ansteht!"],
    "kai": ["Hey {firstName}! ⚡ Wie ist deine mentale Energie heute?"],
    "markus": ["Hajo {firstName}! Bock zu schaffe heute? Der Maggus ist bereit! 🔥"]
  };
  
  const greetings = normalGreetings[coachId] || normalGreetings.sascha;
  return greetings[0].replace('{firstName}', firstName || 'Du');
};