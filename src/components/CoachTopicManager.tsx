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
import { COACH_REGISTRY } from '@/lib/coachRegistry';
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
  Zap
} from "lucide-react";

interface CoachTopicConfig {
  id: string;
  coach_id: string;
  topic_category: string;
  topic_name: string;
  is_enabled: boolean;
  priority_level: number;
  search_keywords: any; // JSON array from Supabase
  knowledge_depth: 'standard' | 'advanced' | 'expert';
  update_frequency_hours: number;
  last_updated_at: string | null;
  success_rate: number;
}

interface CoachPipelineStatus {
  id: string;
  coach_id: string;
  is_active: boolean;
  total_knowledge_entries: number;
  last_pipeline_run: string | null;
  next_scheduled_run: string | null;
  current_topic_focus: string;
  knowledge_completion_rate: number;
  avg_embedding_quality: number;
  pipeline_health_score: number;
}

const AVAILABLE_COACHES = Object.values(COACH_REGISTRY).map(coach => ({
  id: coach.id,
  name: coach.displayName,
  description: coach.role
}));

const KNOWLEDGE_DEPTHS = {
  'standard': { label: 'Standard', color: 'bg-blue-100 text-blue-800' },
  'advanced': { label: 'Erweitert', color: 'bg-orange-100 text-orange-800' },
  'expert': { label: 'Expert', color: 'bg-red-100 text-red-800' }
};

export const CoachTopicManager: React.FC = () => {
  const [selectedCoach, setSelectedCoach] = useState('sascha');
  const [coachTopics, setCoachTopics] = useState<CoachTopicConfig[]>([]);
  const [coachStatus, setCoachStatus] = useState<CoachPipelineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newTopic, setNewTopic] = useState<{
    category: string;
    name: string;
    keywords: string;
    depth: 'standard' | 'advanced' | 'expert';
    priority: number;
  }>({
    category: '',
    name: '',
    keywords: '',
    depth: 'standard',
    priority: 2
  });
  const { toast } = useToast();

  const loadCoachData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading coach data for:', selectedCoach);
      
      // Lade Topic-Konfigurationen
      const { data: topics, error: topicsError } = await supabase
        .from('coach_topic_configurations')
        .select('*')
        .eq('coach_id', selectedCoach)
        .order('topic_category', { ascending: true })
        .order('priority_level', { ascending: false });

      console.log('Topics loaded:', topics);
      console.log('Topics error:', topicsError);

      if (topicsError) throw topicsError;

      // Lade Pipeline-Status
      const { data: status, error: statusError } = await supabase
        .from('coach_pipeline_status')
        .select('*')
        .eq('coach_id', selectedCoach)
        .maybeSingle();

      console.log('Status loaded:', status);
      console.log('Status error:', statusError);

      if (statusError && statusError.code !== 'PGRST116') throw statusError;

      const topicsArray = Array.isArray(topics) ? topics : [];
      console.log('Setting coach topics:', topicsArray);
      
      setCoachTopics(topicsArray as CoachTopicConfig[]);
      setCoachStatus(status);
      
      console.log('Coach data loaded successfully - Topics count:', topicsArray.length);
    } catch (error) {
      console.error('Error loading coach data:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Coach-Daten konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoachData();
  }, [selectedCoach]);

  const handleToggleTopic = async (topicId: string, enabled: boolean) => {
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('coach_topic_configurations')
        .update({ is_enabled: enabled })
        .eq('id', topicId);

      if (error) throw error;

      toast({
        title: enabled ? "Topic aktiviert" : "Topic deaktiviert",
        description: "Einstellung gespeichert",
      });
      
      await loadCoachData();
    } catch (error) {
      console.error('Error toggling topic:', error);
      toast({
        title: "Fehler",
        description: "Topic-Status konnte nicht geändert werden",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePriority = async (topicId: string, priority: number) => {
    try {
      const { error } = await supabase
        .from('coach_topic_configurations')
        .update({ priority_level: priority })
        .eq('id', topicId);

      if (error) throw error;

      await loadCoachData();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Fehler",
        description: "Priorität konnte nicht geändert werden",
        variant: "destructive"
      });
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.category || !newTopic.name) {
      toast({
        title: "Fehler",
        description: "Kategorie und Name sind erforderlich",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      
      const keywords = newTopic.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const { error } = await supabase
        .from('coach_topic_configurations')
        .insert({
          coach_id: selectedCoach,
          topic_category: newTopic.category,
          topic_name: newTopic.name,
          search_keywords: keywords,
          knowledge_depth: newTopic.depth,
          priority_level: newTopic.priority
        });

      if (error) throw error;

      toast({
        title: "Topic hinzugefügt",
        description: `${newTopic.name} wurde erfolgreich hinzugefügt`,
      });
      
      setNewTopic({
        category: '',
        name: '',
        keywords: '',
        depth: 'standard',
        priority: 2
      });
      
      await loadCoachData();
    } catch (error) {
      console.error('Error adding topic:', error);
      toast({
        title: "Fehler",
        description: "Topic konnte nicht hinzugefügt werden",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('coach_topic_configurations')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      toast({
        title: "Topic gelöscht",
        description: "Topic wurde erfolgreich entfernt",
      });
      
      await loadCoachData();
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast({
        title: "Fehler",
        description: "Topic konnte nicht gelöscht werden",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getTopicsByCategory = () => {
    console.log('Getting topics by category. coachTopics:', coachTopics);
    const categories: Record<string, CoachTopicConfig[]> = {};
    
    if (!Array.isArray(coachTopics) || coachTopics.length === 0) {
      console.log('No topics available for categorization');
      return {};
    }
    
    coachTopics.forEach(topic => {
      if (!categories[topic.topic_category]) {
        categories[topic.topic_category] = [];
      }
      categories[topic.topic_category].push(topic);
    });
    
    console.log('Categorized topics:', categories);
    return categories;
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3: return { label: 'Hoch', color: 'bg-red-100 text-red-800' };
      case 2: return { label: 'Mittel', color: 'bg-yellow-100 text-yellow-800' };
      case 1: return { label: 'Niedrig', color: 'bg-gray-100 text-gray-800' };
      default: return { label: 'Unbekannt', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const categorizedTopics = getTopicsByCategory();
  const totalTopics = coachTopics.length;
  const enabledTopics = coachTopics.filter(t => t.is_enabled).length;
  const completionRate = totalTopics > 0 ? (enabledTopics / totalTopics) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Coach-spezifische Topic-Verwaltung
          </CardTitle>
          <CardDescription>
            Verwalte Wissensgebiete und Themen für jeden Coach individuell
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="coach-select">Coach auswählen:</Label>
            <Select value={selectedCoach} onValueChange={setSelectedCoach}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_COACHES.map(coach => (
                  <SelectItem key={coach.id} value={coach.id}>
                    <div>
                      <div className="font-medium">{coach.name}</div>
                      <div className="text-xs text-muted-foreground">{coach.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div>Lade Coach-Daten...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Coach Status Overview */}
          {coachStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Coach Status: {AVAILABLE_COACHES.find(c => c.id === selectedCoach)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totalTopics}</div>
                    <div className="text-sm text-muted-foreground">Total Topics</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{enabledTopics}</div>
                    <div className="text-sm text-muted-foreground">Aktive Topics</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(coachStatus.knowledge_completion_rate || 0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Wissen vollständig</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(coachStatus.pipeline_health_score || 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Pipeline Health</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Topic-Aktivierung</span>
                    <span>{Math.round(completionRate)}%</span>
                  </div>
                  <Progress value={completionRate} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="topics" className="space-y-6">
            <TabsList>
              <TabsTrigger value="topics">Topic Management</TabsTrigger>
              <TabsTrigger value="add">Neues Topic</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Topics Management */}
            <TabsContent value="topics" className="space-y-4">
              {Object.keys(categorizedTopics).length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <div className="text-lg font-medium">Keine Topics konfiguriert</div>
                    <div className="text-muted-foreground">
                      Füge Topics hinzu, um die Pipeline für {AVAILABLE_COACHES.find(c => c.id === selectedCoach)?.name} zu konfigurieren
                    </div>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(categorizedTopics).map(([category, topics]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        {category}
                        <Badge variant="outline">{topics.length} Topics</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {topics.map(topic => (
                          <div key={topic.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={topic.is_enabled}
                                onCheckedChange={(enabled) => handleToggleTopic(topic.id, enabled)}
                                disabled={isUpdating}
                              />
                              
                              <div>
                                <div className="font-medium">{topic.topic_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Keywords: {Array.isArray(topic.search_keywords) ? topic.search_keywords.join(', ') : JSON.stringify(topic.search_keywords)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Select
                                value={topic.priority_level.toString()}
                                onValueChange={(value) => handleUpdatePriority(topic.id, parseInt(value))}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">Hoch</SelectItem>
                                  <SelectItem value="2">Mittel</SelectItem>
                                  <SelectItem value="1">Niedrig</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Badge className={KNOWLEDGE_DEPTHS[topic.knowledge_depth].color}>
                                {KNOWLEDGE_DEPTHS[topic.knowledge_depth].label}
                              </Badge>
                              
                              <Badge className={getPriorityLabel(topic.priority_level).color}>
                                {getPriorityLabel(topic.priority_level).label}
                              </Badge>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTopic(topic.id)}
                                disabled={isUpdating}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Add New Topic */}
            <TabsContent value="add">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Neues Topic hinzufügen
                  </CardTitle>
                  <CardDescription>
                    Füge ein neues Wissensgebiet für {AVAILABLE_COACHES.find(c => c.id === selectedCoach)?.name} hinzu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kategorie</Label>
                      <Input
                        placeholder="z.B. Periodization"
                        value={newTopic.category}
                        onChange={(e) => setNewTopic(prev => ({ ...prev, category: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Topic Name</Label>
                      <Input
                        placeholder="z.B. Linear Periodization"
                        value={newTopic.name}
                        onChange={(e) => setNewTopic(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Suchbegriffe (komma-getrennt)</Label>
                    <Input
                      placeholder="linear periodization, training phases, strength progression"
                      value={newTopic.keywords}
                      onChange={(e) => setNewTopic(prev => ({ ...prev, keywords: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Wissenstiefe</Label>
                      <Select
                        value={newTopic.depth}
                        onValueChange={(value) => 
                          setNewTopic(prev => ({ ...prev, depth: value as 'standard' | 'advanced' | 'expert' }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="advanced">Erweitert</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Priorität</Label>
                      <Select
                        value={newTopic.priority.toString()}
                        onValueChange={(value) => setNewTopic(prev => ({ ...prev, priority: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">Hoch</SelectItem>
                          <SelectItem value="2">Mittel</SelectItem>
                          <SelectItem value="1">Niedrig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleAddTopic}
                    disabled={isUpdating || !newTopic.category || !newTopic.name}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Topic hinzufügen
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Topic Verteilung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.entries(categorizedTopics).map(([category, topics]) => (
                      <div key={category} className="flex justify-between items-center mb-2">
                        <span className="text-sm">{category}</span>
                        <Badge variant="outline">{topics.length}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Prioritäts-Verteilung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {[3, 2, 1].map(priority => {
                      const count = coachTopics.filter(t => t.priority_level === priority).length;
                      const label = getPriorityLabel(priority);
                      return (
                        <div key={priority} className="flex justify-between items-center mb-2">
                          <Badge className={label.color}>{label.label}</Badge>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};