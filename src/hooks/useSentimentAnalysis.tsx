import { useState, useCallback } from 'react';

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  emotion: 'happy' | 'sad' | 'angry' | 'frustrated' | 'excited' | 'anxious' | 'motivated' | 'tired' | 'neutral';
  confidence: number;
  intensity: number; // 0-1 scale
}

export const useSentimentAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSentiment = useCallback(async (text: string): Promise<SentimentResult> => {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        emotion: 'neutral',
        confidence: 0,
        intensity: 0
      };
    }

    setIsAnalyzing(true);
    
    try {
      // Simple sentiment analysis using keyword patterns
      const lowerText = text.toLowerCase();
      
      // Emotion keywords mapping
      const emotionPatterns = {
        happy: ['freue', 'glücklich', 'super', 'toll', 'fantastisch', 'klasse', 'perfekt', 'prima', 'großartig'],
        sad: ['traurig', 'deprimiert', 'niedergeschlagen', 'schlecht', 'mies', 'down'],
        angry: ['wütend', 'sauer', 'ärgerlich', 'verärgert', 'genervt', 'kotzt an'],
        frustrated: ['frustriert', 'verzweifelt', 'aufgeben', 'schaffe nicht', 'klappt nicht', 'nervt'],
        excited: ['aufgeregt', 'gespannt', 'motiviert', 'lust', 'energie', 'power'],
        anxious: ['ängstlich', 'sorge', 'unsicher', 'stress', 'nervös', 'beunruhigt'],
        motivated: ['motiviert', 'ziel', 'schaffen', 'durchziehen', 'dranbleiben', 'weiter'],
        tired: ['müde', 'erschöpft', 'kaputt', 'schlapp', 'energie los', 'ausgelaugt']
      };

      // Sentiment patterns
      const positiveWords = ['gut', 'super', 'toll', 'klasse', 'perfekt', 'prima', 'großartig', 'freue', 'glücklich', 'motiviert'];
      const negativeWords = ['schlecht', 'mies', 'traurig', 'frustriert', 'wütend', 'ärgerlich', 'stress', 'problem'];

      let detectedEmotion: SentimentResult['emotion'] = 'neutral';
      let maxMatches = 0;
      let intensity = 0;

      // Find dominant emotion
      Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
        const matches = patterns.filter(pattern => lowerText.includes(pattern)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          detectedEmotion = emotion as SentimentResult['emotion'];
          intensity = Math.min(matches / 3, 1); // Cap at 1.0
        }
      });

      // Determine overall sentiment
      const positiveMatches = positiveWords.filter(word => lowerText.includes(word)).length;
      const negativeMatches = negativeWords.filter(word => lowerText.includes(word)).length;
      
      let sentiment: SentimentResult['sentiment'] = 'neutral';
      if (positiveMatches > negativeMatches) {
        sentiment = 'positive';
      } else if (negativeMatches > positiveMatches) {
        sentiment = 'negative';
      }

      // Calculate confidence based on keyword matches
      const totalMatches = positiveMatches + negativeMatches + maxMatches;
      const confidence = Math.min(totalMatches / 5, 1); // Max confidence at 5+ matches

      return {
        sentiment,
        emotion: detectedEmotion,
        confidence,
        intensity
      };

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        sentiment: 'neutral',
        emotion: 'neutral',
        confidence: 0,
        intensity: 0
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyzeSentiment,
    isAnalyzing
  };
};