/**
 * Conversation Driver - ARES 3.0 PRO
 * 
 * Proaktive Gesprächsführung durch intelligente Themenverknüpfung.
 * Schlägt nächste Themen vor basierend auf:
 * - Aktuelles Gesprächsthema
 * - User-Ziele
 * - Bereits besprochene Themen
 * - Zeitlicher Kontext
 */

export type TopicId = 
  | 'nutrition' | 'training' | 'supplements' | 'sleep' | 'stress'
  | 'recovery' | 'weight_loss' | 'muscle_gain' | 'peptides' | 'bloodwork'
  | 'hormones' | 'mindset' | 'habits' | 'meal_timing' | 'protein'
  | 'deficit' | 'surplus' | 'NEAT' | 'cardio' | 'strength'
  | 'periodization' | 'longevity' | 'bio_age' | 'general';

export interface TopicConnection {
  relatedTopics: TopicId[];
  transitionPhrases: string[];
  relevanceConditions?: string[];  // z.B. "user_goal_contains_weight_loss"
}

export interface ConversationState {
  currentTopic: TopicId | null;
  discussedTopics: TopicId[];
  lastTopicChange: Date | null;
  topicDepth: number;  // Wie tief sind wir im aktuellen Thema? (1-5)
}

export interface ProactiveSuggestion {
  nextTopic: TopicId;
  transition: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC CONNECTIONS MAP
// Definiert welche Themen logisch zusammenhängen
// ═══════════════════════════════════════════════════════════════════════════════

export const TOPIC_CONNECTIONS: Record<TopicId, TopicConnection> = {
  nutrition: {
    relatedTopics: ['training', 'supplements', 'meal_timing', 'protein', 'weight_loss', 'muscle_gain'],
    transitionPhrases: [
      'Übrigens, wenn wir schon bei Ernährung sind...',
      'Das bringt mich zu einem verwandten Thema...',
      'Apropos Ernährung - '
    ]
  },
  training: {
    relatedTopics: ['recovery', 'nutrition', 'sleep', 'periodization', 'strength', 'cardio'],
    transitionPhrases: [
      'Was dein Training angeht...',
      'In dem Zusammenhang ist auch wichtig...',
      'Für optimale Ergebnisse sollten wir auch über...'
    ]
  },
  supplements: {
    relatedTopics: ['bloodwork', 'nutrition', 'recovery', 'sleep', 'peptides'],
    transitionPhrases: [
      'Bei Supplements ist es wichtig...',
      'Bevor wir über Supplements reden...',
      'In Kombination mit Supplements...'
    ]
  },
  sleep: {
    relatedTopics: ['recovery', 'stress', 'supplements', 'training', 'hormones'],
    transitionPhrases: [
      'Schlaf ist fundamental - ',
      'Da Schlaf so wichtig ist...',
      'Um deinen Schlaf zu optimieren...'
    ]
  },
  stress: {
    relatedTopics: ['sleep', 'training', 'mindset', 'recovery', 'hormones'],
    transitionPhrases: [
      'Stress beeinflusst auch...',
      'Im Kontext von Stress...',
      'Das hängt auch mit Stress zusammen...'
    ]
  },
  recovery: {
    relatedTopics: ['sleep', 'nutrition', 'training', 'stress', 'supplements'],
    transitionPhrases: [
      'Für die Regeneration...',
      'Recovery ist genauso wichtig wie Training...',
      'Deine Erholung optimieren wir durch...'
    ]
  },
  weight_loss: {
    relatedTopics: ['nutrition', 'deficit', 'NEAT', 'training', 'protein', 'cardio'],
    transitionPhrases: [
      'Für nachhaltigen Fettabbau...',
      'Um abzunehmen ist wichtig...',
      'Beim Thema Gewichtsverlust...'
    ]
  },
  muscle_gain: {
    relatedTopics: ['training', 'nutrition', 'protein', 'surplus', 'sleep', 'periodization'],
    transitionPhrases: [
      'Für Muskelaufbau brauchst du...',
      'Hypertrophie funktioniert am besten wenn...',
      'Um Muskeln aufzubauen...'
    ]
  },
  peptides: {
    relatedTopics: ['bloodwork', 'hormones', 'supplements', 'training', 'longevity'],
    transitionPhrases: [
      'Bei Peptiden ist wichtig...',
      'Bevor wir über Peptide sprechen...',
      'Peptide funktionieren am besten wenn...'
    ]
  },
  bloodwork: {
    relatedTopics: ['supplements', 'hormones', 'peptides', 'nutrition', 'bio_age'],
    transitionPhrases: [
      'Deine Blutwerte zeigen...',
      'Basierend auf den Blutwerten...',
      'Ein Blutbild würde helfen...'
    ]
  },
  hormones: {
    relatedTopics: ['bloodwork', 'sleep', 'stress', 'training', 'peptides', 'longevity'],
    transitionPhrases: [
      'Hormonell betrachtet...',
      'Deine Hormone beeinflussen...',
      'Im hormonellen Kontext...'
    ]
  },
  mindset: {
    relatedTopics: ['stress', 'habits', 'training', 'nutrition'],
    transitionPhrases: [
      'Mental ist auch wichtig...',
      'Dein Mindset spielt eine Rolle...',
      'Psychologisch betrachtet...'
    ]
  },
  habits: {
    relatedTopics: ['mindset', 'nutrition', 'training', 'sleep'],
    transitionPhrases: [
      'Gewohnheiten sind der Schlüssel...',
      'Langfristig geht es um Habits...',
      'Um das nachhaltig zu machen...'
    ]
  },
  meal_timing: {
    relatedTopics: ['nutrition', 'training', 'sleep', 'protein'],
    transitionPhrases: [
      'Beim Timing der Mahlzeiten...',
      'Wann du isst ist auch relevant...',
      'Meal-Timing kann helfen...'
    ]
  },
  protein: {
    relatedTopics: ['nutrition', 'muscle_gain', 'training', 'meal_timing'],
    transitionPhrases: [
      'Protein ist essentiell...',
      'Deine Proteinzufuhr...',
      'Beim Thema Protein...'
    ]
  },
  deficit: {
    relatedTopics: ['weight_loss', 'nutrition', 'NEAT', 'cardio', 'protein'],
    transitionPhrases: [
      'Im Defizit ist wichtig...',
      'Dein Kaloriendefizit...',
      'Beim Abnehmen im Defizit...'
    ]
  },
  surplus: {
    relatedTopics: ['muscle_gain', 'nutrition', 'training', 'protein'],
    transitionPhrases: [
      'Im Überschuss...',
      'Für den Aufbau im Surplus...',
      'Dein Kalorienüberschuss...'
    ]
  },
  NEAT: {
    relatedTopics: ['weight_loss', 'deficit', 'training', 'habits'],
    transitionPhrases: [
      'NEAT ist unterschätzt...',
      'Alltagsbewegung hilft auch...',
      'Neben Training ist NEAT wichtig...'
    ]
  },
  cardio: {
    relatedTopics: ['training', 'weight_loss', 'recovery', 'NEAT'],
    transitionPhrases: [
      'Cardio kann helfen...',
      'Beim Ausdauertraining...',
      'Kardiovaskulär...'
    ]
  },
  strength: {
    relatedTopics: ['training', 'muscle_gain', 'periodization', 'protein'],
    transitionPhrases: [
      'Für Kraftzuwachs...',
      'Dein Krafttraining...',
      'Stärker werden durch...'
    ]
  },
  periodization: {
    relatedTopics: ['training', 'recovery', 'muscle_gain', 'strength'],
    transitionPhrases: [
      'Die Periodisierung...',
      'Langfristig geplant...',
      'In Trainingsblöcken...'
    ]
  },
  longevity: {
    relatedTopics: ['bio_age', 'bloodwork', 'hormones', 'sleep', 'nutrition'],
    transitionPhrases: [
      'Für Langlebigkeit...',
      'Longevity-Perspektive...',
      'Langfristige Gesundheit...'
    ]
  },
  bio_age: {
    relatedTopics: ['longevity', 'bloodwork', 'hormones', 'sleep'],
    transitionPhrases: [
      'Dein biologisches Alter...',
      'Bio-Age-Marker zeigen...',
      'Um jünger zu altern...'
    ]
  },
  general: {
    relatedTopics: ['nutrition', 'training', 'sleep', 'stress'],
    transitionPhrases: [
      'Allgemein gesehen...',
      'Grundsätzlich...',
      'Was wäre denn dein Fokus?'
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const TOPIC_KEYWORDS: Record<TopicId, string[]> = {
  nutrition: ['ernährung', 'essen', 'kalorien', 'nahrung', 'diät', 'mahlzeit', 'frühstück', 'mittag', 'abend'],
  training: ['training', 'workout', 'übung', 'gym', 'sport', 'trainieren', 'einheit'],
  supplements: ['supplement', 'nahrungsergänzung', 'vitamin', 'mineral', 'omega', 'magnesium', 'zink'],
  sleep: ['schlaf', 'schlafen', 'müde', 'wach', 'nacht', 'morgen', 'aufwachen', 'einschlafen'],
  stress: ['stress', 'gestresst', 'überfordert', 'druck', 'angst', 'nervös'],
  recovery: ['regeneration', 'erholung', 'pause', 'rest', 'deload'],
  weight_loss: ['abnehmen', 'gewicht verlieren', 'fett', 'schlank', 'dünn'],
  muscle_gain: ['muskel', 'aufbau', 'masse', 'hypertrophie', 'zunehmen'],
  peptides: ['peptid', 'semaglutid', 'tirzepatid', 'ozempic', 'wegovy', 'mounjaro', 'bpc', 'tb500'],
  bloodwork: ['blutwert', 'blutbild', 'labor', 'test', 'marker'],
  hormones: ['hormon', 'testosteron', 'östrogen', 'cortisol', 'insulin', 'schilddrüse'],
  mindset: ['mindset', 'motivation', 'mental', 'kopf', 'psyche', 'einstellung'],
  habits: ['gewohnheit', 'routine', 'alltag', 'habit'],
  meal_timing: ['timing', 'wann essen', 'mahlzeitenfrequenz', 'intermittent'],
  protein: ['protein', 'eiweiß', 'aminosäure', 'shake'],
  deficit: ['defizit', 'kaloriendefizit', 'weniger essen'],
  surplus: ['überschuss', 'kalorienüberschuss', 'mehr essen', 'bulk'],
  NEAT: ['neat', 'alltagsbewegung', 'schritte', 'aktivität'],
  cardio: ['cardio', 'ausdauer', 'laufen', 'joggen', 'radfahren', 'hiit'],
  strength: ['kraft', 'stärke', 'schwer', 'gewichte', 'max'],
  periodization: ['periodisierung', 'block', 'phase', 'zyklus', 'mesozyklus'],
  longevity: ['longevity', 'langlebigkeit', 'altern', 'gesundheit'],
  bio_age: ['bio age', 'biologisches alter', 'epigenetik', 'methylierung'],
  general: []
};

/**
 * Erkennt das Hauptthema einer Nachricht
 */
export function detectTopic(message: string): TopicId {
  const lowerMessage = message.toLowerCase();
  let maxMatches = 0;
  let detectedTopic: TopicId = 'general';

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matches = keywords.filter(kw => lowerMessage.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedTopic = topic as TopicId;
    }
  }

  return detectedTopic;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROACTIVE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UserGoals {
  primary?: string;
  secondary?: string[];
  keywords?: string[];
}

/**
 * Generiert proaktive Themenvorschläge basierend auf Konversationszustand
 */
export function suggestNextTopic(
  state: ConversationState,
  userGoals?: UserGoals
): ProactiveSuggestion | null {
  if (!state.currentTopic || state.currentTopic === 'general') {
    return null;
  }

  const connections = TOPIC_CONNECTIONS[state.currentTopic];
  if (!connections) return null;

  // Filter bereits besprochene Themen
  const undiscussed = connections.relatedTopics.filter(
    topic => !state.discussedTopics.includes(topic)
  );

  if (undiscussed.length === 0) return null;

  // Priorisiere basierend auf User-Zielen
  let prioritized = undiscussed;
  
  if (userGoals?.keywords) {
    const goalRelevant = undiscussed.filter(topic => {
      const topicKeywords = TOPIC_KEYWORDS[topic] || [];
      return topicKeywords.some(kw => 
        userGoals.keywords!.some(gk => gk.toLowerCase().includes(kw))
      );
    });
    if (goalRelevant.length > 0) {
      prioritized = goalRelevant;
    }
  }

  // Wähle das beste nächste Thema
  const nextTopic = prioritized[0];
  const transition = connections.transitionPhrases[
    Math.floor(Math.random() * connections.transitionPhrases.length)
  ];

  // Bestimme Priorität
  const priority = userGoals?.keywords?.some(gk => 
    (TOPIC_KEYWORDS[nextTopic] || []).some(tk => gk.includes(tk))
  ) ? 'high' : state.topicDepth >= 3 ? 'medium' : 'low';

  return {
    nextTopic,
    transition,
    priority,
    reason: `Logische Verknüpfung von ${state.currentTopic} zu ${nextTopic}`
  };
}

/**
 * Generiert den Proaktivitäts-Abschnitt für den System-Prompt
 */
export function buildProactivePromptSection(
  suggestion: ProactiveSuggestion | null,
  state: ConversationState
): string {
  if (!suggestion) return '';
  
  // Nur bei hoher Priorität oder nach genug Tiefe im aktuellen Thema
  if (suggestion.priority === 'low' && state.topicDepth < 2) {
    return '';
  }

  const sections: string[] = [];
  sections.push('== PROAKTIVER GESPRÄCHSIMPULS ==');
  sections.push(`Aktuelles Thema: ${state.currentTopic}`);
  sections.push(`Vorschlag für nächstes Thema: ${suggestion.nextTopic}`);
  sections.push('');
  sections.push('### ANWEISUNG:');
  
  if (suggestion.priority === 'high') {
    sections.push(`Leite am Ende deiner Antwort sanft zu "${suggestion.nextTopic}" über.`);
    sections.push(`Beispiel-Überleitung: "${suggestion.transition}"`);
  } else {
    sections.push(`OPTIONAL: Wenn es natürlich passt, erwähne "${suggestion.nextTopic}".`);
    sections.push('Erzwinge es NICHT - nur wenn es zum Gesprächsfluss passt.');
  }
  
  sections.push('');
  sections.push('LIMITIERUNG: Max 1 proaktiver Vorschlag pro Antwort. Nicht aufdringlich!');

  return sections.join('\n');
}

/**
 * Aktualisiert den Konversationszustand
 */
export function updateConversationState(
  currentState: ConversationState,
  newMessage: string
): ConversationState {
  const detectedTopic = detectTopic(newMessage);
  
  // Prüfe ob Themenwechsel
  const isTopicChange = currentState.currentTopic !== detectedTopic && detectedTopic !== 'general';
  
  return {
    currentTopic: detectedTopic !== 'general' ? detectedTopic : currentState.currentTopic,
    discussedTopics: isTopicChange && currentState.currentTopic
      ? [...new Set([...currentState.discussedTopics, currentState.currentTopic])]
      : currentState.discussedTopics,
    lastTopicChange: isTopicChange ? new Date() : currentState.lastTopicChange,
    topicDepth: isTopicChange ? 1 : Math.min(5, currentState.topicDepth + 1)
  };
}

/**
 * Erstellt einen neuen, leeren Konversationszustand
 */
export function createInitialConversationState(): ConversationState {
  return {
    currentTopic: null,
    discussedTopics: [],
    lastTopicChange: null,
    topicDepth: 0
  };
}

export default {
  TOPIC_CONNECTIONS,
  detectTopic,
  suggestNextTopic,
  buildProactivePromptSection,
  updateConversationState,
  createInitialConversationState
};
