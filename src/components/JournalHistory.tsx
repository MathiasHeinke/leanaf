import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ChevronRight, Play, Pause, Brain, Camera, FileText, Mic, Edit3, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useMindsetJournal } from "@/hooks/useMindsetJournal";

interface JournalEntry {
  id: string;
  date: string;
  raw_text: string;
  mood_score?: number;
  sentiment_tag?: string;
  gratitude_items?: string[];
  ai_summary_md?: string;
  kai_insight?: string;
  transformation_themes?: string[];
  energy_level?: number;
  stress_indicators?: string[];
  manifestation_items?: string[];
  highlights?: string[];
  challenges?: string[];
  photo_url?: string;
  audio_url?: string;
  prompt_used?: string;
  created_at: string;
  entry_sequence_number?: number;
}

interface JournalData {
  date: string;
  displayDate: string;
  entries: JournalEntry[];
}

interface JournalHistoryProps {
  timeRange: 'week' | 'month' | 'year';
}

export const JournalHistory = ({ timeRange }: JournalHistoryProps) => {
  const [historyData, setHistoryData] = useState<JournalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const { user } = useAuth();
  const { saveJournalEntry } = useMindsetJournal();

  useEffect(() => {
    if (user) {
      loadJournalHistory();
    }
  }, [user, timeRange]);

  const loadJournalHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const daysToLoad = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);

      const { data: journalData, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group data by date
      const groupedData = new Map<string, JournalData>();
      
      // Initialize all days
      for (let i = 0; i < daysToLoad; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        groupedData.set(dateStr, {
          date: dateStr,
          displayDate: date.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit',
            weekday: 'short'
          }),
          entries: []
        });
      }

      // Add journal entries
      journalData?.forEach(entry => {
        const date = new Date(entry.created_at).toISOString().split('T')[0];
        const day = groupedData.get(date);
        if (day) {
          day.entries.push({
            id: entry.id,
            date: entry.date,
            raw_text: entry.raw_text,
            mood_score: entry.mood_score,
            sentiment_tag: entry.sentiment_tag,
            gratitude_items: entry.gratitude_items || [],
            ai_summary_md: entry.ai_summary_md,
            kai_insight: entry.kai_insight,
            transformation_themes: entry.transformation_themes || [],
            energy_level: entry.energy_level,
            stress_indicators: entry.stress_indicators || [],
            manifestation_items: entry.manifestation_items || [],
            highlights: entry.highlight ? [entry.highlight] : [],
            challenges: entry.challenge ? [entry.challenge] : [],
            photo_url: entry.photo_url,
            audio_url: entry.audio_url,
            prompt_used: entry.prompt_used,
            created_at: entry.created_at,
            entry_sequence_number: entry.entry_sequence_number
          });
        }
      });

      const historyArray = Array.from(groupedData.values())
        .filter(day => day.entries.length > 0)
        .sort((a, b) => b.date.localeCompare(a.date));

      setHistoryData(historyArray);
    } catch (error) {
      console.error('Error loading journal history:', error);
      toast.error('Fehler beim Laden der Journal-Daten');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const toggleEntryExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleAudioPlay = async (audioUrl: string, entryId: string) => {
    if (playingAudio === entryId) {
      // Stop playing
      setPlayingAudio(null);
      // Stop all audio elements
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    } else {
      // Start playing
      setPlayingAudio(entryId);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudio(null);
      audio.onerror = () => {
        setPlayingAudio(null);
        toast.error('Fehler beim Abspielen der Audio-Datei');
      };
      audio.play();
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry.id);
    setEditedText(entry.raw_text);
  };

  const handleSaveEdit = async (entry: JournalEntry) => {
    if (!editedText.trim()) return;

    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ 
          raw_text: editedText,
          updated_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Eintrag aktualisiert');
      setEditingEntry(null);
      setEditedText('');
      loadJournalHistory();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Fehler beim Aktualisieren des Eintrags');
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditedText('');
  };

  const getMoodBadgeColor = (score?: number) => {
    if (!score) return 'bg-muted text-muted-foreground border-muted';
    if (score >= 3) return 'bg-success/20 text-success border-success/30';
    if (score >= 1) return 'bg-primary/20 text-primary border-primary/30';
    if (score === 0) return 'bg-muted text-muted-foreground border-muted';
    if (score >= -2) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      case 'excited': return '🤩';
      case 'grateful': return '🙏';
      case 'reflective': return '🤔';
      case 'motivated': return '💪';
      default: return '😐';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">
          <Brain className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Lade Journal-Verlauf...</p>
        </div>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Noch keine Journal-Einträge</h3>
          <p className="text-muted-foreground mb-4">
            Nutze das Mindset Journal, um hier deinen Verlauf zu sehen!
          </p>
          <div className="text-sm text-muted-foreground">
            <p>🎤 Sprachaufnahmen</p>
            <p>📝 Gedanken & Reflexionen</p>
            <p>🧠 Coach-Analysen</p>
            <p>📸 Bilder & Momente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {historyData.map((day) => (
        <Card key={day.date}>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
                onClick={() => toggleExpanded(day.date)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {expandedDays.has(day.date) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <h3 className="font-semibold">{day.displayDate}</h3>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      {day.entries.length} Einträge
                    </Badge>
                    {day.entries.some(e => e.audio_url) && (
                      <Badge variant="secondary" className="text-xs">
                        <Mic className="h-3 w-3 mr-1" />
                        Audio
                      </Badge>
                    )}
                    {day.entries.some(e => e.photo_url) && (
                      <Badge variant="secondary" className="text-xs">
                        <Camera className="h-3 w-3 mr-1" />
                        Foto
                      </Badge>
                    )}
                    {day.entries.some(e => e.kai_insight) && (
                      <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                        <Brain className="h-3 w-3 mr-1" />
                        Coach
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {day.entries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                    {/* Entry Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatTime(entry.created_at)}
                        </span>
                        {entry.mood_score !== undefined && (
                          <Badge variant="outline" className={getMoodBadgeColor(entry.mood_score)}>
                            {getSentimentEmoji(entry.sentiment_tag)} {entry.mood_score}
                          </Badge>
                        )}
                        {entry.sentiment_tag && (
                          <Badge variant="outline" className="text-xs">
                            {entry.sentiment_tag}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {entry.audio_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAudioPlay(entry.audio_url!, entry.id)}
                            className="h-8 w-8 p-0"
                          >
                            {playingAudio === entry.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEntryExpanded(entry.id)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedEntries.has(entry.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Entry Content */}
                    {editingEntry === entry.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(entry)}
                            className="h-8"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Speichern
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="h-8"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground">
                        {entry.raw_text.length > 150 && !expandedEntries.has(entry.id) ? (
                          <>
                            {entry.raw_text.substring(0, 150)}...
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => toggleEntryExpanded(entry.id)}
                              className="h-auto p-0 ml-1 text-primary"
                            >
                              mehr lesen
                            </Button>
                          </>
                        ) : (
                          entry.raw_text
                        )}
                      </div>
                    )}

                    {/* Entry Details - Only shown when expanded */}
                    {expandedEntries.has(entry.id) && (
                      <div className="space-y-3 pt-3 border-t">
                        {/* Photo */}
                        {entry.photo_url && (
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Camera className="h-4 w-4" />
                              Foto
                            </h4>
                            <img 
                              src={entry.photo_url} 
                              alt="Journal Foto" 
                              className="w-full max-w-sm rounded-lg shadow-sm"
                            />
                          </div>
                        )}

                        {/* Gratitude Items */}
                        {entry.gratitude_items && entry.gratitude_items.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">🙏 Dankbarkeit</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {entry.gratitude_items.map((item, index) => (
                                <li key={index}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Kai Insight */}
                        {entry.kai_insight && (
                          <div className="bg-violet-50 dark:bg-violet-950/30 p-3 rounded-lg">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-violet-700 dark:text-violet-300">
                              <Brain className="h-4 w-4" />
                              Coach-Analyse
                            </h4>
                            <p className="text-sm text-violet-600 dark:text-violet-400">
                              {entry.kai_insight}
                            </p>
                          </div>
                        )}

                        {/* AI Summary */}
                        {entry.ai_summary_md && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">📝 KI-Zusammenfassung</h4>
                            <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert">
                              {entry.ai_summary_md}
                            </div>
                          </div>
                        )}

                        {/* Stress Indicators */}
                        {entry.stress_indicators && entry.stress_indicators.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">⚡ Stress-Indikatoren</h4>
                            <div className="flex flex-wrap gap-1">
                              {entry.stress_indicators.map((indicator, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {indicator}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transformation Themes */}
                        {entry.transformation_themes && entry.transformation_themes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">🔄 Transformations-Themen</h4>
                            <div className="flex flex-wrap gap-1">
                              {entry.transformation_themes.map((theme, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {theme}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Energy Level */}
                        {entry.energy_level !== undefined && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">⚡ Energie-Level</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${(entry.energy_level / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {entry.energy_level}/10
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Prompt Used */}
                        {entry.prompt_used && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">💭 Verwendeter Prompt</h4>
                            <p className="text-sm text-muted-foreground italic">
                              "{entry.prompt_used}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
};