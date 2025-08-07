import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProgressivePrompt {
  id: string;
  prompt_level: number;
  category: string;
  question_text: string;
  follow_up_text?: string;
  context_tags: string[];
}

interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  raw_text?: string;
  timestamp?: string;
  entry_sequence_number?: number;
  ai_analysis_metadata?: any;
  photo_url?: string;
  emotional_scores?: any;
  wellness_score?: number;
  mood_score?: number;
  gratitude_items?: string[];
  created_at: string;
}

interface JournalAnalysis {
  text_analysis: any;
  photo_analysis?: any;
  wellness_score: number;
  insights: string[];
}

export function useEnhancedMindsetJournal() {
  // Get current user from Supabase auth
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  const [currentPrompt, setCurrentPrompt] = useState<ProgressivePrompt | null>(null);
  const [todaysEntries, setTodaysEntries] = useState<JournalEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<JournalAnalysis | null>(null);

  // Load progressive prompt based on context
  const loadProgressivePrompt = async () => {
    if (!user) return;

    try {
      // Get current time context
      const hour = new Date().getHours();
      let category = 'midday';
      if (hour < 11) category = 'morning';
      else if (hour > 17) category = 'evening';

      // Determine prompt level based on today's entries
      const promptLevel = todaysEntries.length === 0 ? 1 : 
                         todaysEntries.length < 3 ? 2 : 3;

      // Get unused prompts for this context
      const usedPromptIds = todaysEntries
        .map(entry => entry.ai_analysis_metadata?.prompt_id)
        .filter(Boolean);

      let query = supabase
        .from('progressive_prompts')
        .select('*')
        .eq('category', category)
        .eq('prompt_level', promptLevel);

      if (usedPromptIds.length > 0) {
        query = query.not('id', 'in', `(${usedPromptIds.join(',')})`);
      }

      const { data: prompts, error } = await query.limit(1);

      if (error) {
        console.error('Error loading progressive prompt:', error);
        return;
      }

      if (prompts && prompts.length > 0) {
        setCurrentPrompt(prompts[0]);
      } else {
        // Fallback to any prompt if no unused ones found
        const { data: fallbackPrompts } = await supabase
          .from('progressive_prompts')
          .select('*')
          .eq('category', category)
          .limit(1);
        
        if (fallbackPrompts && fallbackPrompts.length > 0) {
          setCurrentPrompt(fallbackPrompts[0]);
        }
      }
    } catch (error) {
      console.error('Error in loadProgressivePrompt:', error);
    }
  };

  // Load today's entries
  const loadTodaysEntries = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading today\'s entries:', error);
        return;
      }

      setTodaysEntries(entries || []);
    } catch (error) {
      console.error('Error in loadTodaysEntries:', error);
    }
  };

  // Load recent entries for context
  const loadRecentEntries = async () => {
    if (!user) return;

    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading recent entries:', error);
        return;
      }

      setRecentEntries(entries || []);
    } catch (error) {
      console.error('Error in loadRecentEntries:', error);
    }
  };

  // Save journal entry with enhanced features
  const saveJournalEntry = async (content: string, photoFile?: File) => {
    if (!user || !content.trim()) return;

    setIsLoading(true);
    setIsAnalyzing(true);

    try {
      // Get next sequence number for today
      const today = new Date().toISOString().split('T')[0];
      const { data: sequenceData, error: sequenceError } = await supabase
        .rpc('get_next_entry_sequence', {
          p_user_id: user.id,
          p_date: today
        });

      if (sequenceError) {
        console.error('Error getting sequence number:', sequenceError);
      }

      const sequenceNumber = sequenceData || 1;

      // Handle photo upload if provided
      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${sequenceNumber}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('journal-photos')
          .upload(fileName, photoFile);

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('journal-photos')
            .getPublicUrl(uploadData.path);
          photoUrl = publicUrl;
        }
      }

      // Create journal entry
      const now = new Date();
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          date: now.toISOString().split('T')[0],
          raw_text: content.trim(),
          timestamp: now.toISOString(),
          entry_sequence_number: sequenceNumber,
          photo_url: photoUrl,
          ai_analysis_metadata: {
            prompt_id: currentPrompt?.id,
            prompt_text: currentPrompt?.question_text,
            entry_context: {
              sequence: sequenceNumber,
              time_of_day: now.getHours() < 11 ? 'morning' : 
                          now.getHours() > 17 ? 'evening' : 'midday'
            }
          }
        })
        .select()
        .single();

      if (entryError) {
        throw new Error(`Failed to save journal entry: ${entryError.message}`);
      }

      // Trigger AI analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions
        .invoke('advanced-journal-analysis', {
          body: {
            entryText: content,
            photoUrl: photoUrl,
            userId: user.id,
            entryId: entry.id
          }
        });

      if (analysisError) {
        console.error('Error in AI analysis:', analysisError);
      } else if (analysisResult?.analysis) {
        setLastAnalysis(analysisResult.analysis);
      }

      // Reload data
      await loadTodaysEntries();
      await loadRecentEntries();
      await loadProgressivePrompt();

      return entry;
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  // Get today's wellness summary
  const getTodaysWellnessSummary = () => {
    if (todaysEntries.length === 0) return null;

    const totalScore = todaysEntries
      .filter(entry => entry.wellness_score)
      .reduce((sum, entry) => sum + (entry.wellness_score || 0), 0);
    
    const entriesWithScore = todaysEntries.filter(entry => entry.wellness_score);
    const averageScore = entriesWithScore.length > 0 ? 
      Math.round(totalScore / entriesWithScore.length) : 50;

    return {
      entriesCount: todaysEntries.length,
      averageWellnessScore: averageScore,
      lastEntryTime: todaysEntries[todaysEntries.length - 1]?.timestamp
    };
  };

  // Get formatted entry display
  const getFormattedEntryTime = (entry: JournalEntry) => {
    const time = new Date(entry.timestamp || entry.created_at).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${entry.entry_sequence_number || 1}. Eintrag heute - ${time}`;
  };

  // Initialize
  useEffect(() => {
    if (user) {
      loadTodaysEntries();
      loadRecentEntries();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProgressivePrompt();
    }
  }, [user, todaysEntries.length]);

  return {
    currentPrompt,
    todaysEntries,
    recentEntries,
    isLoading,
    isAnalyzing,
    lastAnalysis,
    saveJournalEntry,
    loadProgressivePrompt,
    getTodaysWellnessSummary,
    getFormattedEntryTime,
    entryCount: todaysEntries.length
  };
}