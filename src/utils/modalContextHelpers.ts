import { UserProfile } from '@/schemas/user-profile';
import { ChatMessage } from '@/utils/memoryManager';

export interface ModalPrefillData {
  weight?: {
    value: number;
    date: string;
  };
  supplements?: Array<{
    id: string;
    name: string;
    checked: boolean;
  }>;
  diary?: {
    mood: number;
    energy: number;
    sleep: number;
  };
  workout?: {
    lastWorkoutType: string;
    frequentExercises: string[];
  };
  plan?: {
    goal: string;
    experience: string;
    availableTime: number;
  };
}

/**
 * Intelligente Vorbefüllung von Modal-Daten basierend auf User-Profil und Chat-Verlauf
 */
export function prefillModalState(
  profile?: UserProfile, 
  recentMessages?: ChatMessage[],
  profileData?: any // Für zusätzliche Daten aus Supabase
): ModalPrefillData {
  const defaults: ModalPrefillData = {};

  if (!profile) return defaults;

  // 1. Weight Modal - Verwende availableMinutes als Fallback für Gewicht
  // (Da UserProfile kein body.weight hat, nutzen wir andere Daten)
  defaults.weight = {
    value: 70, // Standardwert
    date: new Date().toISOString().split('T')[0]
  };

  // 2. Supplement Modal - Einfache Standard-Supplements
  defaults.supplements = [
    { id: 'protein', name: 'Protein', checked: false },
    { id: 'vitamin-d', name: 'Vitamin D', checked: false },
    { id: 'omega-3', name: 'Omega-3', checked: false }
  ];

  // 3. Diary Modal - Standard-Werte basierend auf Erfahrung
  const experienceLevel = profile.experienceYears || 0;
  defaults.diary = {
    mood: experienceLevel > 2 ? 7 : 5, // Erfahrene User sind motivierter
    energy: experienceLevel > 2 ? 7 : 5,
    sleep: 7
  };

  // 4. Workout Modal - Häufige Übungen aus Chat-Verlauf
  if (recentMessages && recentMessages.length > 0) {
    const workoutMentions = recentMessages
      .filter(msg => msg.content.toLowerCase().includes('training') || 
                    msg.content.toLowerCase().includes('übung'))
      .map(msg => msg.content)
      .join(' ');

    // Einfache Extraktion häufiger Übungen
    const exercises = ['Liegestütze', 'Kniebeugen', 'Klimmzüge', 'Plank', 'Burpees'];
    const frequentExercises = exercises.filter(exercise => 
      workoutMentions.toLowerCase().includes(exercise.toLowerCase())
    );

    defaults.workout = {
      lastWorkoutType: profile.goal?.includes('Muskelaufbau') ? 'Krafttraining' : 'Cardio',
      frequentExercises: frequentExercises.slice(0, 3)
    };
  }

  // 5. Plan Modal - Aus User-Profil
  if (profile.goal || profile.experienceYears || profile.availableMinutes) {
    defaults.plan = {
      goal: profile.goal || 'Fitness verbessern',
      experience: profile.experienceYears ? 
        profile.experienceYears > 2 ? 'Fortgeschritten' : 'Anfänger' : 'Anfänger',
      availableTime: profile.availableMinutes || 30
    };
  }

  return defaults;
}

/**
 * Hilfsfunktion um relevante Context-Daten aus Chat-Nachrichten zu extrahieren
 */
export function extractContextFromMessages(messages: ChatMessage[]): {
  recentWorkouts: string[];
  moodTrends: number[];
  mentionedSupplements: string[];
} {
  const context = {
    recentWorkouts: [] as string[],
    moodTrends: [] as number[],
    mentionedSupplements: [] as string[]
  };

  const recentMessages = messages.slice(-10); // Letzte 10 Nachrichten

  recentMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    
    // Workout-Erwähnungen
    if (content.includes('training') || content.includes('workout')) {
      const workoutMatch = content.match(/(liegestütze|kniebeugen|klimmzüge|laufen|radfahren|schwimmen)/gi);
      if (workoutMatch) {
        context.recentWorkouts.push(...workoutMatch);
      }
    }

    // Supplement-Erwähnungen
    const supplementMatch = content.match(/(protein|vitamin|kreatin|omega|magnesium|zink)/gi);
    if (supplementMatch) {
      context.mentionedSupplements.push(...supplementMatch);
    }

    // Mood-Hinweise (einfache Sentiment-Analyse)
    if (content.includes('müde') || content.includes('schlecht')) {
      context.moodTrends.push(3);
    } else if (content.includes('gut') || content.includes('motiviert')) {
      context.moodTrends.push(8);
    } else if (content.includes('ok') || content.includes('normal')) {
      context.moodTrends.push(5);
    }
  });

  return context;
}