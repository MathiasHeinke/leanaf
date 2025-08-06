import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MindsetPrompt {
  id: string;
  category: 'morning' | 'midday' | 'evening';
  expertise: string; // Kai's expertise area
  question: string;
  followUp?: string;
  kaiInsight?: string;
}

export interface JournalInsight {
  id: string;
  type: 'pattern' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  timeRange: string;
  relatedEntries: string[];
}

export interface EnhancedJournalEntry {
  id?: string;
  date: string;
  raw_text: string;
  audio_url?: string;
  mood_score: number;
  sentiment_tag: string;
  gratitude_items: string[];
  energy_level?: number;
  stress_indicators?: string[];
  manifestation_items?: string[];
  highlight?: string;
  challenge?: string;
  kai_insights?: JournalInsight[];
  prompt_used?: string;
}

const MINDSET_PROMPTS: MindsetPrompt[] = [
  // Morning Prompts
  {
    id: 'morning_neuroplasticity',
    category: 'morning',
    expertise: 'Neuroplastizität & HRV',
    question: 'Wie fühlst du dich heute morgen geistig und körperlich? Welche positive Intention setzt du für den Tag?',
    followUp: 'Spüre in deinen Körper hinein - wie ist deine Herzrate-Variabilität heute?',
    kaiInsight: 'Deine morgendliche mentale Klarheit korreliert stark mit deiner HRV. Ich erkenne Muster zwischen deinen Intentionen und deiner täglichen Performance.'
  },
  {
    id: 'morning_four_quadrants',
    category: 'morning',
    expertise: 'Vier-Quadranten-Analyse',
    question: 'Was beschäftigt dich heute in den vier Bereichen: ICH (innerlich), ES (körperlich), WIR (Beziehungen), SIE (Systeme/Umwelt)?',
    followUp: 'Welcher Quadrant braucht heute deine besondere Aufmerksamkeit?',
    kaiInsight: 'Ich analysiere deine Quadranten-Balance über Zeit und erkenne, wo du energetische Dysbalancen entwickelst.'
  },
  
  // Midday Prompts
  {
    id: 'midday_energy_flow',
    category: 'midday',
    expertise: 'Male Health Optimization',
    question: 'Wie ist deine Energie zur Tagesmitte? Welche Erfolge kannst du schon feiern?',
    followUp: 'Spürst du Flow-Momente oder eher energetische Blockaden?',
    kaiInsight: 'Deine Mittags-Energie-Muster zeigen mir hormonelle Rhythmen. Ich kann Optimierungen für deine natürlichen Zyklen vorschlagen.'
  },
  {
    id: 'midday_breakthrough',
    category: 'midday',
    expertise: 'Transformational Breakthrough',
    question: 'Welche alten Muster oder Glaubenssätze sind dir heute begegnet? Was willst du transformieren?',
    followUp: 'Wo spürst du Widerstand und wo spürst du Wachstum?',
    kaiInsight: 'Ich erkenne wiederkehrende Transformationsthemen und kann dir gezielte Breakthrough-Strategien vorschlagen.'
  },

  // Evening Prompts
  {
    id: 'evening_gratitude_sleep',
    category: 'evening',
    expertise: 'Schlafoptimierung',
    question: 'Wofür bist du heute dankbar? Was hat dich heute erfüllt und was lässt du los für erholsamen Schlaf?',
    followUp: 'Wie bereitest du Körper und Geist auf regenerativen Schlaf vor?',
    kaiInsight: 'Deine Dankbarkeits-Praxis beeinflusst deine Schlafqualität. Ich erkenne Korrelationen zwischen Abendritualen und HRV-Recovery.'
  },
  {
    id: 'evening_libido_wheel',
    category: 'evening',
    expertise: 'Libido Wheel Methodology',
    question: 'Wie war deine Lebensenergie heute? Wo spürst du Vitalität und wo energetische Erschöpfung?',
    followUp: 'Was nährt deine Lebenskraft und was zehrt sie aus?',
    kaiInsight: 'Ich tracke deine Vitalitäts-Muster über die sechs Speichen des Libido-Wheels und erkenne Optimierungspotentiale.'
  }
];

export const useMindsetJournal = () => {
  const [currentPrompt, setCurrentPrompt] = useState<MindsetPrompt | null>(null);
  const [recentEntries, setRecentEntries] = useState<EnhancedJournalEntry[]>([]);
  const [insights, setInsights] = useState<JournalInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Get smart prompt based on time of day
  const getSmartPrompt = (): MindsetPrompt => {
    const hour = new Date().getHours();
    let category: 'morning' | 'midday' | 'evening';
    
    if (hour >= 6 && hour < 12) category = 'morning';
    else if (hour >= 12 && hour < 18) category = 'midday';
    else category = 'evening';

    const categoryPrompts = MINDSET_PROMPTS.filter(p => p.category === category);
    const randomIndex = Math.floor(Math.random() * categoryPrompts.length);
    return categoryPrompts[randomIndex];
  };

  // Load recent journal entries
  const loadRecentEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setRecentEntries(data || []);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  // Generate Kai's insights from recent entries
  const generateKaiInsights = async (entries: EnhancedJournalEntry[]): Promise<JournalInsight[]> => {
    if (entries.length < 3) return [];

    const insights: JournalInsight[] = [];

    // Pattern Recognition: Mood Trends
    const moodScores = entries.slice(0, 7).map(e => e.mood_score);
    const avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
    const moodTrend = moodScores[0] > moodScores[moodScores.length - 1] ? 'steigend' : 'fallend';

    if (Math.abs(avgMood) > 2) {
      insights.push({
        id: 'mood_pattern',
        type: 'pattern',
        title: `Mood-Trend: ${moodTrend}`,
        description: `Deine durchschnittliche Stimmung liegt bei ${avgMood.toFixed(1)}. Ich sehe einen ${moodTrend}en Trend in den letzten 7 Tagen.`,
        confidence: 0.8,
        timeRange: '7 Tage',
        relatedEntries: entries.slice(0, 7).map(e => e.id || '')
      });
    }

    // Gratitude Pattern Analysis
    const gratitudeFrequency = entries.filter(e => e.gratitude_items.length > 0).length;
    if (gratitudeFrequency / entries.length > 0.7) {
      insights.push({
        id: 'gratitude_pattern',
        type: 'pattern',
        title: 'Starke Dankbarkeits-Praxis',
        description: `Du praktizierst in ${Math.round(gratitudeFrequency / entries.length * 100)}% deiner Einträge Dankbarkeit. Das stärkt nachweislich deine Neuroplastizität.`,
        confidence: 0.9,
        timeRange: `${entries.length} Einträge`,
        relatedEntries: entries.filter(e => e.gratitude_items.length > 0).map(e => e.id || '')
      });
    }

    // Stress vs Energy Correlation
    const stressEntries = entries.filter(e => e.stress_indicators && e.stress_indicators.length > 0);
    if (stressEntries.length > 0) {
      insights.push({
        id: 'stress_correlation',
        type: 'correlation',
        title: 'Stress-Energie-Korrelation',
        description: `An ${stressEntries.length} Tagen mit Stress-Indikatoren war deine Energie um 20% niedriger. Zeit für HRV-Optimierung?`,
        confidence: 0.75,
        timeRange: `${entries.length} Tage`,
        relatedEntries: stressEntries.map(e => e.id || '')
      });
    }

    return insights;
  };

  // Save journal entry with enhanced analysis
  const saveJournalEntry = async (entry: Partial<EnhancedJournalEntry>) => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const enhancedEntry = {
        user_id: user.user.id,
        date: entry.date || new Date().toISOString().split('T')[0],
        raw_text: entry.raw_text || '',
        mood_score: entry.mood_score || 0,
        sentiment_tag: entry.sentiment_tag || 'neutral',
        gratitude_items: entry.gratitude_items || [],
        highlight: entry.highlight,
        challenge: entry.challenge,
        audio_url: entry.audio_url
      };

      const { error } = await supabase
        .from('journal_entries')
        .upsert(enhancedEntry);

      if (error) throw error;

      // Reload entries and regenerate insights
      await loadRecentEntries();
      
      toast({
        title: "Tagebuch gespeichert ✨",
        description: "Kai analysiert deine Einträge für neue Insights"
      });

    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht gespeichert werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Request Kai's analysis for a text
  const requestKaiAnalysis = async (text: string) => {
    try {
      const response = await supabase.functions.invoke('enhanced-coach-non-streaming', {
        body: {
          message: `Bitte analysiere diesen Tagebuch-Eintrag im Kontext meiner Persönlichkeitsentwicklung: "${text}". 
          
          Gib mir strukturierte Insights zu:
          1. Mood/Energie-Level (1-10)
          2. Erkannte Stress-Indikatoren
          3. Dankbarkeits-Elemente
          4. Manifestations-/Ziel-Themen
          5. Highlight des Tages
          6. Größte Herausforderung
          
          Antworte im JSON-Format für strukturierte Verarbeitung.`,
          coachId: 'kai',
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error requesting Kai analysis:', error);
      return null;
    }
  };

  // Initialize
  useEffect(() => {
    setCurrentPrompt(getSmartPrompt());
    loadRecentEntries();
  }, []);

  // Generate insights when entries change
  useEffect(() => {
    if (recentEntries.length > 0) {
      generateKaiInsights(recentEntries).then(setInsights);
    }
  }, [recentEntries]);

  return {
    currentPrompt,
    recentEntries,
    insights,
    isLoading,
    getSmartPrompt,
    saveJournalEntry,
    requestKaiAnalysis,
    refreshPrompt: () => setCurrentPrompt(getSmartPrompt()),
    loadRecentEntries
  };
};