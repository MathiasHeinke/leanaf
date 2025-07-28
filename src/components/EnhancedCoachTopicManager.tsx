import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Brain, 
  Target, 
  Settings, 
  Plus,
  Trash2,
  Star,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Search,
  Upload,
  Database,
  Filter,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface CoachTopicConfig {
  id: string;
  coach_id: string;
  topic_category: string;
  topic_name: string;
  is_enabled: boolean;
  priority_level: number;
  search_keywords: string[];
  knowledge_depth: string;
  update_frequency_hours: number;
  last_updated_at: string | null;
  success_rate: number;
  created_at?: string;
  updated_at?: string;
}

interface PerplexityTopic {
  title: string;
  category: string;
  content: string;
  relevance_score: number;
  sources: string[];
  id?: string;
  loaded_to_rag?: boolean;
  assigned_to_coach?: boolean;
}

interface CoachPipelineStatus {
  id: string;
  coach_id: string;
  is_active: boolean;
  total_knowledge_entries: number;
  last_pipeline_run: string | null;
  next_scheduled_run: string | null;
  current_topic_focus: string | null;
  knowledge_completion_rate: number;
  avg_embedding_quality: number;
  pipeline_health_score: number;
}

interface AvailableCoach {
  id: string;
  name: string;
  description: string;
}

const TRAINING_CATEGORIES = [
  'Periodization', 'VO2max Training', 'Military Conditioning', 'Biomechanics',
  'Strength Training', 'Recovery', 'Metabolic Conditioning', 'Sports Psychology'
];

const KNOWLEDGE_DEPTHS = {
  standard: { label: 'Standard', color: 'bg-blue-100 text-blue-800' },
  advanced: { label: 'Erweitert', color: 'bg-purple-100 text-purple-800' },
  expert: { label: 'Experte', color: 'bg-red-100 text-red-800' }
};

export const EnhancedCoachTopicManager = () => {
  const [availableCoaches, setAvailableCoaches] = useState<AvailableCoach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState('');
  const [coachTopics, setCoachTopics] = useState<CoachTopicConfig[]>([]);
  const [coachStatus, setCoachStatus] = useState<CoachPipelineStatus | null>(null);
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(true);
  const [perplexityResults, setPerplexityResults] = useState<PerplexityTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingToRAG, setIsLoadingToRAG] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newTopic, setNewTopic] = useState({
    category: '',
    name: '',
    keywords: '',
    depth: 'standard' as const
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableCoaches();
  }, []);

  useEffect(() => {
    if (selectedCoach) {
      loadCoachData();
    }
  }, [selectedCoach]);

  const loadAvailableCoaches = async () => {
    setIsLoadingCoaches(true);
    try {
      const { data: coachData, error } = await supabase
        .from('coach_specializations')
        .select('coach_id, name, specialization_description')
        .order('name');

      if (error) throw error;

      const coaches: AvailableCoach[] = (coachData || []).map(coach => ({
        id: coach.coach_id,
        name: coach.name,
        description: coach.specialization_description
      }));

      console.log('🏃‍♂️ Loaded coaches from database:', coaches);
      setAvailableCoaches(coaches);
      
      // Set default coach to first available
      if (coaches.length > 0 && !selectedCoach) {
        setSelectedCoach(coaches[0].id);
      }
    } catch (error) {
      console.error('Error loading coaches:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Coaches konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCoaches(false);
    }
  };

  const loadCoachData = async () => {
    console.log('🔍 Loading coach data for:', selectedCoach);
    setIsLoadingTopics(true);
    try {
      // Load existing topics for selected coach
      const { data: topicsData, error: topicsError } = await supabase
        .from('coach_topic_configurations')
        .select('*')
        .eq('coach_id', selectedCoach)
        .order('priority_level', { ascending: false });

      console.log('📊 Raw topics data:', topicsData);
      console.log('❌ Topics error:', topicsError);

      if (topicsError) throw topicsError;

      // Load coach pipeline status
      const { data: statusData, error: statusError } = await supabase
        .from('coach_pipeline_status')
        .select('*')
        .eq('coach_id', selectedCoach)
        .single();

      if (statusError && statusError.code !== 'PGRST116') {
        console.error('Status error:', statusError);
      }

      console.log('✅ Setting coach topics:', topicsData?.length, 'topics');
      console.log('📝 Sample topic:', topicsData?.[0]);
      
      // Cast the data to ensure search_keywords is properly typed
      const typedTopicsData = (topicsData || []).map(topic => ({
        ...topic,
        search_keywords: Array.isArray(topic.search_keywords) 
          ? topic.search_keywords as string[]
          : []
      })) as CoachTopicConfig[];
      
      setCoachTopics(typedTopicsData);
      setCoachStatus(statusData || null);

      console.log(`Loaded ${topicsData?.length || 0} topics for coach ${selectedCoach}`);
    } catch (error) {
      console.error('Error loading coach data:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Coach-Daten konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const searchPerplexityTopics = async (category?: string) => {
    setIsSearching(true);
    try {
      const searchArea = category || 'alle Bereiche';
      
      toast({
        title: "🔍 Perplexity-Suche gestartet",
        description: `Suche nach neuen Topics in: ${searchArea}`,
      });

      const { data, error } = await supabase.functions.invoke('perplexity-knowledge-pipeline', {
        body: { 
          area: category,
          coach_id: selectedCoach,
          search_mode: 'topic_discovery'
        }
      });

      if (error) throw error;

      const newTopics: PerplexityTopic[] = (data.results || []).map((result: any) => ({
        title: result.topic,
        category: result.category,
        content: result.content || 'Neu gefundenes Topic aus Perplexity',
        relevance_score: result.relevance_score || 0.8,
        sources: result.sources || [],
        loaded_to_rag: false,
        assigned_to_coach: false
      }));

      setPerplexityResults(prev => [...prev, ...newTopics]);
      
      toast({
        title: "✅ Suche abgeschlossen",
        description: `${newTopics.length} neue Topics gefunden`,
      });

    } catch (error) {
      console.error('Perplexity search error:', error);
      toast({
        title: "❌ Suche fehlgeschlagen",
        description: error.message || "Fehler bei der Perplexity-Suche",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const loadTopicToRAG = async (topic: PerplexityTopic, index: number) => {
    setIsLoadingToRAG(prev => [...prev, index.toString()]);
    try {
      // First, create knowledge base entry
      const { data: knowledgeEntry, error: knowledgeError } = await supabase
        .from('coach_knowledge_base')
        .insert({
          title: topic.title,
          content: topic.content,
          coach_id: selectedCoach,
          expertise_area: topic.category,
          knowledge_type: 'perplexity_discovery',
          source_url: topic.sources[0] || null,
          tags: [topic.category, 'perplexity', selectedCoach],
          priority_level: Math.round(topic.relevance_score * 5)
        })
        .select()
        .single();

      if (knowledgeError) throw knowledgeError;

      // Generate embeddings for the new knowledge
      const { error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
        body: { knowledgeId: knowledgeEntry.id }
      });

      if (embeddingError) {
        console.warn('Embedding generation failed:', embeddingError);
      }

      // Update topic status
      setPerplexityResults(prev => 
        prev.map((t, i) => 
          i === index ? { ...t, loaded_to_rag: true } : t
        )
      );

      toast({
        title: "✅ Topic in RAG geladen",
        description: `"${topic.title}" wurde erfolgreich zur Wissensbasis hinzugefügt`,
      });

    } catch (error) {
      console.error('Error loading to RAG:', error);
      toast({
        title: "❌ RAG-Fehler",
        description: "Topic konnte nicht zur Wissensbasis hinzugefügt werden",
        variant: "destructive"
      });
    } finally {
      setIsLoadingToRAG(prev => prev.filter(id => id !== index.toString()));
    }
  };

  const assignTopicToCoach = async (topic: PerplexityTopic, index: number) => {
    try {
      const { error } = await supabase
        .from('coach_topic_configurations')
        .insert({
          coach_id: selectedCoach,
          topic_category: topic.category,
          topic_name: topic.title,
          is_enabled: true,
          priority_level: Math.round(topic.relevance_score * 5),
          search_keywords: [topic.title.toLowerCase(), topic.category.toLowerCase()],
          knowledge_depth: 'standard'
        });

      if (error) throw error;

      setPerplexityResults(prev => 
        prev.map((t, i) => 
          i === index ? { ...t, assigned_to_coach: true } : t
        )
      );

      await loadCoachData(); // Refresh coach topics

      toast({
        title: "✅ Topic zugeordnet",
        description: `"${topic.title}" wurde ${selectedCoach} zugeordnet`,
      });

    } catch (error) {
      console.error('Error assigning topic:', error);
      toast({
        title: "❌ Zuordnung fehlgeschlagen",
        description: "Topic konnte nicht zugeordnet werden",
        variant: "destructive"
      });
    }
  };

  const updateTopicPriority = async (topicId: string, newPriority: number) => {
    try {
      const { error } = await supabase
        .from('coach_topic_configurations')
        .update({ priority_level: newPriority })
        .eq('id', topicId);

      if (error) throw error;
      await loadCoachData();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const getTopicsByCategory = () => {
    console.log('🗂️ Categorizing topics. Total topics:', coachTopics.length);
    console.log('📊 Topics array:', coachTopics);
    
    const categories: Record<string, CoachTopicConfig[]> = {};
    coachTopics.forEach(topic => {
      console.log('Processing topic:', topic.topic_name, 'Category:', topic.topic_category);
      if (!categories[topic.topic_category]) {
        categories[topic.topic_category] = [];
      }
      categories[topic.topic_category].push(topic);
    });
    
    console.log('📂 Final categories:', Object.keys(categories));
    console.log('📊 Categories with counts:', Object.entries(categories).map(([cat, topics]) => `${cat}: ${topics.length}`));
    
    return categories;
  };

  const filteredPerplexityResults = perplexityResults.filter(topic => {
    const matchesQuery = !searchQuery || 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || topic.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Coach Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Coach-Auswahl
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCoaches ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Select value={selectedCoach} onValueChange={setSelectedCoach}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Coach auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {availableCoaches.map(coach => (
                  <SelectItem key={coach.id} value={coach.id}>
                    <div>
                      <div className="font-medium">{coach.name}</div>
                      <div className="text-sm text-muted-foreground">{coach.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="topics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="topics">Aktuelle Topics</TabsTrigger>
          <TabsTrigger value="discover">Perplexity-Suche</TabsTrigger>
          <TabsTrigger value="manage">RAG-Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Current Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Aktuelle Topics für {availableCoaches.find(c => c.id === selectedCoach)?.name || 'Coach'}
              </CardTitle>
              <CardDescription>
                {coachTopics.length} Topics konfiguriert
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTopics ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : coachTopics.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Keine Topics für diesen Coach gefunden. Nutzen Sie die Perplexity-Suche, um neue Topics zu entdecken.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {Object.entries(getTopicsByCategory()).map(([category, topics]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-semibold text-lg">{category}</h4>
                      <div className="grid gap-2">
                        {topics.map(topic => (
                          <div key={topic.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{topic.topic_name}</span>
                                <Badge className={KNOWLEDGE_DEPTHS[topic.knowledge_depth as keyof typeof KNOWLEDGE_DEPTHS]?.color || 'bg-gray-100 text-gray-800'}>
                                  {KNOWLEDGE_DEPTHS[topic.knowledge_depth as keyof typeof KNOWLEDGE_DEPTHS]?.label || topic.knowledge_depth}
                                </Badge>
                                <Badge variant="outline">Priorität {topic.priority_level}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Erfolgsrate: {topic.success_rate}% | 
                                Update alle {topic.update_frequency_hours}h
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateTopicPriority(topic.id, Math.max(1, topic.priority_level - 1))}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateTopicPriority(topic.id, Math.min(5, topic.priority_level + 1))}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Switch checked={topic.is_enabled} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Perplexity Discovery Tab */}
        <TabsContent value="discover" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Perplexity Topic-Entdeckung
              </CardTitle>
              <CardDescription>
                Finden Sie neue relevante Topics für {availableCoaches.find(c => c.id === selectedCoach)?.name || 'Coach'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Controls */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => searchPerplexityTopics()} 
                  disabled={isSearching}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isSearching ? 'Suche läuft...' : 'Alle Kategorien durchsuchen'}
                </Button>
                {TRAINING_CATEGORIES.slice(0, 3).map(category => (
                  <Button
                    key={category}
                    variant="outline"
                    onClick={() => searchPerplexityTopics(category)}
                    disabled={isSearching}
                    size="sm"
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* Search Progress */}
              {isSearching && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Suche nach neuen Topics...</span>
                  </div>
                  <Progress value={60} className="w-full" />
                </div>
              )}

              {/* Filter Controls */}
              {perplexityResults.length > 0 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Topics filtern..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Kategorie wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle Kategorien</SelectItem>
                      {TRAINING_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Results Display */}
              {filteredPerplexityResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Gefundene Topics ({filteredPerplexityResults.length})</h4>
                  <div className="grid gap-3">
                    {filteredPerplexityResults.map((topic, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{topic.title}</span>
                              <Badge variant="secondary">{topic.category}</Badge>
                              <Badge variant="outline">
                                Relevanz: {Math.round(topic.relevance_score * 100)}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {topic.content.substring(0, 200)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadTopicToRAG(topic, index)}
                            disabled={isLoadingToRAG.includes(index.toString()) || topic.loaded_to_rag}
                            className="flex items-center gap-2"
                          >
                            {isLoadingToRAG.includes(index.toString()) ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                Wird geladen...
                              </>
                            ) : topic.loaded_to_rag ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                In RAG geladen
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Ins RAG laden
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => assignTopicToCoach(topic, index)}
                            disabled={topic.assigned_to_coach || !topic.loaded_to_rag}
                          >
                            {topic.assigned_to_coach ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Zugeordnet
                              </>
                            ) : (
                              <>
                                <Target className="h-4 w-4 mr-1" />
                                Coach zuordnen
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RAG Management Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                RAG-Wissensbasis verwalten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">RAG-Management</h3>
                <p className="text-muted-foreground mb-4">
                  Hier können Sie die Wissensbasis für {availableCoaches.find(c => c.id === selectedCoach)?.name || 'Coach'} verwalten
                </p>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Erweiterte Einstellungen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coachStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{coachStatus.total_knowledge_entries}</div>
                    <div className="text-sm text-muted-foreground">Wissenseinträge</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{Math.round(coachStatus.knowledge_completion_rate)}%</div>
                    <div className="text-sm text-muted-foreground">Vollständigkeit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{Math.round(coachStatus.avg_embedding_quality * 100)}%</div>
                    <div className="text-sm text-muted-foreground">Embedding-Qualität</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{Math.round(coachStatus.pipeline_health_score)}%</div>
                    <div className="text-sm text-muted-foreground">Pipeline-Health</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};