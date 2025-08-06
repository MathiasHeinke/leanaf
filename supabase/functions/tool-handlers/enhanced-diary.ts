// Enhanced diary tool handler with Kai's expertise integration
export default async function handleEnhancedDiary(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Enhanced sentiment analysis with Kai's psychology expertise
  function analyzeEnhancedSentiment(text: string): { 
    mood_score: number; 
    sentiment_tag: string; 
    energy_level: number;
    stress_indicators: string[];
  } {
    const positiveWords = [
      'gut', 'super', 'toll', 'dankbar', 'glücklich', 'freude', 'erfolg', 'stolz', 
      'wunderbar', 'großartig', 'erfüllt', 'flow', 'energie', 'kraft', 'klarheit',
      'motivation', 'inspiration', 'begeistert', 'lebendig', 'entspannt'
    ];
    
    const negativeWords = [
      'schlecht', 'müde', 'stress', 'schwer', 'traurig', 'frustriert', 'ärger', 
      'sorge', 'problem', 'schwierig', 'erschöpft', 'überfordert', 'angst',
      'zweifel', 'blockiert', 'leer', 'antriebslos', 'nervös', 'unruhig'
    ];

    const energyWords = [
      'energie', 'kraft', 'power', 'vitality', 'lebendig', 'dynamisch', 
      'aktiv', 'motiviert', 'flow', 'fokussiert'
    ];

    const stressWords = [
      'stress', 'druck', 'hektik', 'überfordert', 'zeitdruck', 'termine',
      'deadline', 'konflikt', 'sorgen', 'angst', 'nervös', 'unruhig'
    ];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    const energyCount = energyWords.filter(word => lowerText.includes(word)).length;
    const stressIndicators = stressWords.filter(word => lowerText.includes(word));
    
    let mood_score = 0;
    let sentiment_tag = 'neutral';
    
    if (positiveCount > negativeCount) {
      mood_score = Math.min(5, positiveCount);
      sentiment_tag = 'positive';
    } else if (negativeCount > positiveCount) {
      mood_score = Math.max(-5, -negativeCount);
      sentiment_tag = 'negative';
    }

    // Energy level calculation (1-10)
    const energy_level = Math.min(10, Math.max(1, 5 + energyCount - stressIndicators.length));
    
    return { mood_score, sentiment_tag, energy_level, stress_indicators: stressIndicators };
  }
  
  // Enhanced gratitude extraction with manifestation detection
  function extractGratitudeAndManifestation(text: string): { 
    gratitude_items: string[]; 
    manifestation_items: string[];
  } {
    // Gratitude patterns
    const gratitudePatterns = [
      /(?:dankbar für|bin dankbar|grateful for|thankful for)\s+([^.!?]+)/gi,
      /(?:schätze|wertschätze|appreciate)\s+([^.!?]+)/gi,
      /(?:freue mich über|bin froh über)\s+([^.!?]+)/gi
    ];
    
    // Manifestation patterns
    const manifestationPatterns = [
      /(?:freue mich auf|kann es kaum erwarten|will erreichen|ziel ist)\s+([^.!?]+)/gi,
      /(?:wünsche mir|träume von|stelle mir vor)\s+([^.!?]+)/gi,
      /(?:morgen will ich|nächste woche|bald werde ich)\s+([^.!?]+)/gi
    ];
    
    let gratitude_items: string[] = [];
    let manifestation_items: string[] = [];
    
    // Extract gratitude
    gratitudePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      gratitude_items.push(...matches.map(match => match[1].trim()));
    });
    
    // Extract manifestations
    manifestationPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      manifestation_items.push(...matches.map(match => match[1].trim()));
    });
    
    return {
      gratitude_items: gratitude_items.slice(0, 3),
      manifestation_items: manifestation_items.slice(0, 3)
    };
  }

  // Kai's Four-Quadrant Analysis
  function analyzeQuadrants(text: string): {
    ich_quadrant: string[];  // Internal individual (thoughts, feelings)
    es_quadrant: string[];   // External individual (body, behavior)
    wir_quadrant: string[];  // Internal collective (relationships, culture)
    sie_quadrant: string[];  // External collective (systems, environment)
  } {
    const lowerText = text.toLowerCase();
    
    const ichKeywords = ['denke', 'fühle', 'glaube', 'werte', 'vision', 'intention', 'bewusstsein'];
    const esKeywords = ['körper', 'training', 'ernährung', 'schlaf', 'gewicht', 'gesundheit', 'action'];
    const wirKeywords = ['beziehung', 'familie', 'freunde', 'team', 'gemeinschaft', 'kommunikation'];
    const sieKeywords = ['arbeit', 'system', 'gesellschaft', 'umwelt', 'struktur', 'organisation'];

    return {
      ich_quadrant: ichKeywords.filter(word => lowerText.includes(word)),
      es_quadrant: esKeywords.filter(word => lowerText.includes(word)),
      wir_quadrant: wirKeywords.filter(word => lowerText.includes(word)),
      sie_quadrant: sieKeywords.filter(word => lowerText.includes(word))
    };
  }

  // Detect transformation themes
  function detectTransformationThemes(text: string): string[] {
    const transformationKeywords = [
      'veränderung', 'transformation', 'wachstum', 'entwicklung', 'breakthrough',
      'durchbruch', 'muster', 'gewohnheit', 'glaubenssatz', 'blockade', 'lösung'
    ];
    
    const lowerText = text.toLowerCase();
    return transformationKeywords.filter(word => lowerText.includes(word));
  }

  const sentiment = analyzeEnhancedSentiment(lastUserMsg);
  const { gratitude_items, manifestation_items } = extractGratitudeAndManifestation(lastUserMsg);
  const quadrants = analyzeQuadrants(lastUserMsg);
  const transformationThemes = detectTransformationThemes(lastUserMsg);
  const excerpt = lastUserMsg.length > 120 ? lastUserMsg.slice(0, 120) + '...' : lastUserMsg;

  // Generate Kai's contextual insight
  const generateKaiInsight = () => {
    const insights = [];
    
    if (sentiment.energy_level >= 8) {
      insights.push("🔥 Hohe Energie! Perfekt für neuroplastische Veränderungen.");
    }
    
    if (sentiment.stress_indicators.length > 0) {
      insights.push("💡 Stress erkannt. HRV-Training könnte helfen.");
    }
    
    if (gratitude_items.length > 0) {
      insights.push("🙏 Dankbarkeit stärkt deine neuronalen Verbindungen.");
    }
    
    if (manifestation_items.length > 0) {
      insights.push("🎯 Manifestation aktiviert! Dein Gehirn programmiert sich neu.");
    }
    
    if (transformationThemes.length > 0) {
      insights.push("🔄 Transformation im Fokus. Zeit für Breakthrough-Arbeit.");
    }

    // Quadrant-specific insights
    const activeQuadrants = Object.entries(quadrants).filter(([_, keywords]) => keywords.length > 0);
    if (activeQuadrants.length === 1) {
      const [quadrant] = activeQuadrants[0];
      insights.push(`🎯 Fokus auf ${quadrant.toUpperCase()}-Quadrant. Balance die anderen Bereiche.`);
    }
    
    return insights.join(' ');
  };

  return {
    role: 'assistant',
    type: 'card',
    card: 'enhanced_diary',
    payload: {
      raw_text: lastUserMsg,
      mood_score: sentiment.mood_score,
      sentiment_tag: sentiment.sentiment_tag,
      energy_level: sentiment.energy_level,
      stress_indicators: sentiment.stress_indicators,
      gratitude_items,
      manifestation_items,
      quadrant_analysis: quadrants,
      transformation_themes: transformationThemes,
      excerpt,
      kai_insight: generateKaiInsight(),
      date: new Date().toISOString().split('T')[0],
      ts: Date.now(),
      actions: [{
        type: 'save_enhanced_diary',
        label: 'Mit Kai\'s Analyse speichern',
        data: {
          raw_text: lastUserMsg,
          mood_score: sentiment.mood_score,
          sentiment_tag: sentiment.sentiment_tag,
          energy_level: sentiment.energy_level,
          stress_indicators: sentiment.stress_indicators,
          gratitude_items,
          manifestation_items,
          quadrant_analysis: quadrants,
          transformation_themes: transformationThemes,
          kai_insight: generateKaiInsight(),
          date: new Date().toISOString().split('T')[0]
        }
      }]
    },
    meta: { clearTool: true }
  };
}