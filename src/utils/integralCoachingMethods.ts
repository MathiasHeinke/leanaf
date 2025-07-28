// Integral Theory Coaching Methods and Analysis Tools
// Based on Ken Wilber's AQAL (All Quadrants, All Lines) framework

export interface IntegralQuadrant {
  name: string;
  description: string;
  focus: string;
  examples: string[];
}

export interface DevelopmentalLevel {
  name: string;
  color: string;
  characteristics: string[];
  healthBehaviors: string[];
  coachingApproach: string[];
}

export interface IntegralAnalysis {
  currentLevel: DevelopmentalLevel;
  quadrantInsights: {
    individualInterior: string[];
    individualExterior: string[];
    collectiveInterior: string[];
    collectiveExterior: string[];
  };
  shadowAspects: string[];
  nextDevelopmentStep: string;
  integratedRecommendations: string[];
}

// The Four Quadrants of Integral Theory
export const INTEGRAL_QUADRANTS: Record<string, IntegralQuadrant> = {
  II: {
    name: 'Individual-Interior (Gedanken & Gefühle)',
    description: 'Subjektive Erfahrungen, Gedanken, Emotionen, Motivationen',
    focus: 'Inneres Erleben und mentale Zustände',
    examples: [
      'Selbstbild bezüglich Fitness',
      'Emotionale Beziehung zum Essen', 
      'Innere Motivation und Antrieb',
      'Glaubenssätze über Gesundheit',
      'Stress und emotionale Muster'
    ]
  },
  IE: {
    name: 'Individual-Exterior (Verhalten & Körper)',
    description: 'Objektive, messbare Aspekte des Individuums',
    focus: 'Verhalten, Körper, konkrete Handlungen',
    examples: [
      'Trainingsroutine und -häufigkeit',
      'Ernährungsgewohnheiten',
      'Biomarker und Körpermessungen',
      'Schlafverhalten',
      'Körperliche Fitness-Level'
    ]
  },
  CI: {
    name: 'Kollektiv-Interior (Kultur & Werte)',
    description: 'Geteilte Bedeutungen, Werte, Kultur',
    focus: 'Kulturelle Normen und Gruppenwerte',
    examples: [
      'Familiäre Essgewohnheiten',
      'Fitness-Community und deren Werte',
      'Gesellschaftliche Schönheitsideale',
      'Peer-Group Erwartungen',
      'Kulturelle Einstellung zu Gesundheit'
    ]
  },
  CE: {
    name: 'Kollektiv-Exterior (Systeme & Umgebung)',
    description: 'Systemische und strukturelle Faktoren',
    focus: 'Umgebung, Systeme, Infrastruktur',
    examples: [
      'Verfügbarkeit von Fitnessstudios',
      'Lebensmittelumgebung (Supermärkte, Restaurants)',
      'Arbeitszeiten und -struktur',
      'Finanzielle Ressourcen',
      'Geografische Faktoren'
    ]
  }
};

// Spiral Dynamics / Developmental Levels
export const DEVELOPMENTAL_LEVELS: Record<string, DevelopmentalLevel> = {
  BEIGE: {
    name: 'Beige (Survival)',
    color: '#F5F5DC',
    characteristics: ['Fokus auf Überleben', 'Instinktgetrieben', 'Kurzfristig orientiert'],
    healthBehaviors: ['Unregelmäßige Ernährung', 'Stressbedingte Entscheidungen'],
    coachingApproach: ['Grundbedürfnisse sicherstellen', 'Einfache, klare Struktur']
  },
  PURPLE: {
    name: 'Purple (Tribal)',
    color: '#800080',
    characteristics: ['Gruppenzugehörigkeit wichtig', 'Traditionen folgen', 'Sicherheit durch Gemeinschaft'],
    healthBehaviors: ['Befolgt Familientraditionen', 'Gruppendruck bei Entscheidungen'],
    coachingApproach: ['Familieneinbindung', 'Traditionsrespekt', 'Gruppenziele']
  },
  RED: {
    name: 'Red (Egocentric)',
    color: '#FF0000',
    characteristics: ['Macht und Durchsetzung', 'Impulsiv', 'Sofortige Belohnung'],
    healthBehaviors: ['Extreme Diäten', 'Intensive aber inkonsistente Workouts'],
    coachingApproach: ['Schnelle Erfolge zeigen', 'Herausforderungen stellen', 'Belohnungssystem']
  },
  BLUE: {
    name: 'Blue (Conformist)',
    color: '#0000FF',
    characteristics: ['Regeln und Ordnung', 'Pflichtbewusstsein', 'Richtig vs. Falsch'],
    healthBehaviors: ['Strenge Pläne befolgen', 'Disziplin als Tugend'],
    coachingApproach: ['Klare Regeln und Struktur', 'Langfristige Ziele', 'Disziplin würdigen']
  },
  ORANGE: {
    name: 'Orange (Achievement)',
    color: '#FFA500',
    characteristics: ['Leistung und Erfolg', 'Effizienz', 'Wissenschaftlich rational'],
    healthBehaviors: ['Datengetrieben', 'Optimierung', 'Wettbewerbsorientiert'],
    coachingApproach: ['Metriken und Tracking', 'Optimierungsstrategien', 'Erfolgsmessung']
  },
  GREEN: {
    name: 'Green (Pluralistic)',
    color: '#008000',
    characteristics: ['Gemeinschaft und Gleichberechtigung', 'Ganzheitlichkeit', 'Inklusion'],
    healthBehaviors: ['Work-Life-Balance', 'Nachhaltige Ansätze', 'Intuitive Ernährung'],
    coachingApproach: ['Ganzheitliche Perspektive', 'Individuelle Bedürfnisse', 'Balance betonen']
  },
  YELLOW: {
    name: 'Yellow (Integral)',
    color: '#FFFF00',
    characteristics: ['Systemisches Denken', 'Flexibilität', 'Lebenslange Entwicklung'],
    healthBehaviors: ['Adaptive Strategien', 'Selbstexperimente', 'Lebensphasenanpassung'],
    coachingApproach: ['Selbstverantwortung fördern', 'Systemische Betrachtung', 'Entwicklungsorientierung']
  },
  TURQUOISE: {
    name: 'Turquoise (Holistic)',
    color: '#40E0D0',
    characteristics: ['Globalverbundenheit', 'Spirituelle Integration', 'Ökologisches Bewusstsein'],
    healthBehaviors: ['Planetare Gesundheit', 'Energetische Ansätze', 'Bewusstseinsarbeit'],
    coachingApproach: ['Globale Perspektive', 'Spirituelle Dimension', 'Bewusstseinsevolution']
  }
};

export class IntegralHealthAnalyzer {
  
  static analyzeUserLevel(userProfile: any, behaviors: any): DevelopmentalLevel {
    // Simple heuristic-based assessment - in practice would be more sophisticated
    const scores = {
      BEIGE: 0, PURPLE: 0, RED: 0, BLUE: 0, 
      ORANGE: 0, GREEN: 0, YELLOW: 0, TURQUOISE: 0
    };
    
    // Analyze based on goal orientation
    if (userProfile?.goal?.includes('schnell') || userProfile?.goal?.includes('extrem')) {
      scores.RED += 2;
    }
    if (userProfile?.goal?.includes('gesund') || userProfile?.goal?.includes('nachhaltig')) {
      scores.GREEN += 2;
    }
    if (userProfile?.goal?.includes('optimal') || userProfile?.goal?.includes('data')) {
      scores.ORANGE += 2;
    }
    
    // Analyze behavioral patterns
    if (behaviors?.consistentRoutines) scores.BLUE += 1;
    if (behaviors?.trackingMetrics) scores.ORANGE += 1;
    if (behaviors?.holisticApproach) scores.GREEN += 1;
    if (behaviors?.systemicThinking) scores.YELLOW += 1;
    
    // Find highest scoring level
    const maxScore = Math.max(...Object.values(scores));
    const dominantLevel = Object.keys(scores).find(key => scores[key] === maxScore) || 'ORANGE';
    
    return DEVELOPMENTAL_LEVELS[dominantLevel];
  }
  
  static performQuadrantAnalysis(userData: any): IntegralAnalysis['quadrantInsights'] {
    return {
      individualInterior: [
        `Motivation: ${userData.profile?.goal || 'Nicht spezifiziert'}`,
        `Aktuelle Gedankenmuster basierend auf Zielsetzung`,
        'Emotionale Beziehung zu Ernährung und Training analysieren'
      ],
      individualExterior: [
        `Aktuelle Ernährung: ${userData.todaysTotals?.calories || 0}kcal`,
        `Training: ${userData.workoutDays || 0} Tage/Woche`,
        `Schlaf: ${userData.averageSleep || 'Unbekannt'} Stunden`
      ],
      collectiveInterior: [
        'Familiäre Essgewohnheiten und Werte erkunden',
        'Peer-Group Einflüsse auf Gesundheitsverhalten',
        'Kulturelle Prägungen bzgl. Körperbild'
      ],
      collectiveExterior: [
        'Arbeitsumgebung und Zeitstruktur',
        'Verfügbare Infrastruktur (Küche, Gym, etc.)',
        'Finanzielle Ressourcen für Gesundheit'
      ]
    };
  }
  
  static identifyShadowAspects(userData: any): string[] {
    const shadows = [];
    
    // Common shadow patterns in health/fitness
    if (userData.todaysTotals?.calories < 1200) {
      shadows.push('Mögliche Restriktion oder Kontrolldrang');
    }
    if (userData.workoutDays > 5) {
      shadows.push('Potentielle Exercise-Kompensation oder Perfektionismus');
    }
    if (!userData.sleepData || userData.averageSleep < 6) {
      shadows.push('Vernachlässigung der Regeneration - "Hustle Culture" Shadow');
    }
    
    shadows.push('Unbewusste Glaubenssätze über Körperwert');
    shadows.push('Projektion von Kontrollbedürfnissen auf Ernährung');
    
    return shadows;
  }
  
  static generateGeniusQuestions(currentLevel: DevelopmentalLevel, context: any): string[] {
    const questions = [];
    
    // Level-specific questioning
    switch (currentLevel.name.split(' ')[0]) {
      case 'Red':
        questions.push(
          'Was wäre möglich, wenn du deine Power für langfristige statt nur sofortige Ergebnisse nutzt?',
          'Welche Version von dir in 5 Jahren würde dich heute am meisten inspirieren?'
        );
        break;
      case 'Blue':
        questions.push(
          'Wie könnte "richtige" Ernährung für deinen einzigartigen Körper anders aussehen als die Regeln?',
          'Was wenn Disziplin manchmal bedeutet, flexibel zu sein?'
        );
        break;
      case 'Orange':
        questions.push(
          'Welche Metriken trackt du NICHT, die dein Wohlbefinden stark beeinflussen?',
          'Wie würde sich dein Ansatz ändern, wenn Glück das wichtigste KPI wäre?'
        );
        break;
      case 'Green':
        questions.push(
          'Wie könnte deine persönliche Gesundheit zu kollektivem Wohlbefinden beitragen?',
          'Was würde ein perfekt integriertes Leben für dich bedeuten?'
        );
        break;
      default:
        questions.push(
          'Welche Perspektive auf deine Gesundheit hast du noch nie eingenommen?',
          'Was ist der größte blinde Fleck in deinem aktuellen Ansatz?'
        );
    }
    
    return questions;
  }
  
  static createIntegratedRecommendations(analysis: Partial<IntegralAnalysis>): string[] {
    return [
      '🎯 Individual-Interior: Reflektiere täglich 5 Minuten über deine Motivation',
      '💪 Individual-Exterior: Implementiere 1 konkrete Verhaltensänderung pro Woche',
      '👥 Kollektiv-Interior: Kommuniziere deine Ziele mit wichtigen Personen',
      '🌍 Kollektiv-Exterior: Optimiere eine Umgebungsvariable (Küche, Gym-Access, etc.)',
      '🔄 Integration: Verbinde alle Quadranten in deiner wöchentlichen Planung',
      '📈 Entwicklung: Identifiziere bewusst deinen nächsten Wachstumsschritt'
    ];
  }
}

export const INTEGRAL_COACHING_PROMPTS = {
  quadrantMapping: "Analysiere die Situation aus allen 4 Quadranten der Integral Theory",
  developmentAssessment: "Bestimme die aktuelle Entwicklungsstufe und den nächsten Schritt",
  shadowWork: "Identifiziere unbewusste Muster und Projektionen",
  systemicView: "Betrachte das Problem aus systemischer Perspektive",
  geniusQuestioning: "Stelle Fragen, die neue Perspektiven eröffnen",
  integration: "Entwickle einen integrierenden Ansatz für alle Ebenen"
};