import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  Eye, 
  Archive, 
  MessageSquare, 
  User, 
  Clock, 
  Search,
  Filter,
  RefreshCw,
  Brain,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface CoachConversation {
  id: string;
  user_id: string;
  message_role: string;
  message_content: string;
  coach_personality: string;
  conversation_date: string;
  created_at: string;
  context_data?: any;
}

interface ConversationSummary {
  user_id: string;
  coach_id: string;
  message_count: number;
  rolling_summary?: string;
  last_activity: string;
  conversation_ids: string[];
}

interface AdminNote {
  id: string;
  conversation_id: string;
  note: string;
  status: string;
  created_at: string;
  admin_user_id: string;
}

export const CoachConversationMonitor: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<'gelesen' | 'verstanden' | 'abgelegt'>('gelesen');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCoach, setFilterCoach] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load conversations and summaries
  const loadConversations = async () => {
    setLoading(true);
    try {
      // Get detailed conversations
      const { data: convs, error: convsError } = await supabase
        .from('coach_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (convsError) throw convsError;

      // Get conversation summaries
      const { data: summaries, error: summariesError } = await supabase
        .from('coach_chat_memory')
        .select('*')
        .order('updated_at', { ascending: false });

      if (summariesError) throw summariesError;

      // Group conversations by user and coach
      const groupedConversations: { [key: string]: ConversationSummary } = {};
      
      convs?.forEach(conv => {
        const key = `${conv.user_id}-${conv.coach_personality}`;
        if (!groupedConversations[key]) {
          groupedConversations[key] = {
            user_id: conv.user_id,
            coach_id: conv.coach_personality,
            message_count: 0,
            last_activity: conv.created_at,
            conversation_ids: []
          };
        }
        groupedConversations[key].message_count++;
        groupedConversations[key].conversation_ids.push(conv.id);
        if (conv.created_at > groupedConversations[key].last_activity) {
          groupedConversations[key].last_activity = conv.created_at;
        }
      });

      // Merge with rolling summaries
      summaries?.forEach(summary => {
        const key = `${summary.user_id}-${summary.coach_id}`;
        if (groupedConversations[key]) {
          groupedConversations[key].rolling_summary = summary.rolling_summary;
          groupedConversations[key].message_count = Math.max(
            groupedConversations[key].message_count,
            summary.message_count
          );
        }
      });

      setConversations(convs || []);
      setConversationSummaries(Object.values(groupedConversations));

    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Fehler beim Laden der Gespräche');
    } finally {
      setLoading(false);
    }
  };

  // Save admin note and status
  const saveAdminNote = async () => {
    if (!selectedConversation || !newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('admin_conversation_notes')
        .insert({
          conversation_id: selectedConversation,
          note: newNote,
          status: newStatus,
          admin_user_id: user?.id
        });

      if (error) throw error;
      
      // Refresh notes
      await loadAdminNotes();
      
      setNewNote('');
      toast.success(`Gespräch als "${newStatus}" markiert`);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Fehler beim Speichern der Notiz');
    }
  };

  // Load admin notes from database
  const loadAdminNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_conversation_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminNotes(data || []);
    } catch (error) {
      console.error('Error loading admin notes:', error);
    }
  };

  useEffect(() => {
    loadConversations();
    loadAdminNotes();
  }, []);

  const filteredSummaries = conversationSummaries.filter(summary => {
    const matchesSearch = searchTerm === '' || 
      summary.rolling_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCoach = filterCoach === 'all' || summary.coach_id === filterCoach;
    
    const conversationNotes = adminNotes.filter(note => 
      summary.conversation_ids.includes(note.conversation_id)
    );
    const hasStatus = conversationNotes.length > 0 ? conversationNotes[conversationNotes.length - 1].status : 'unbearbeitet';
    const matchesStatus = filterStatus === 'all' || hasStatus === filterStatus;
    
    return matchesSearch && matchesCoach && matchesStatus;
  });

  const getConversationStatus = (conversationIds: string[]) => {
    const notes = adminNotes.filter(note => conversationIds.includes(note.conversation_id));
    if (notes.length === 0) return 'unbearbeitet';
    return notes[notes.length - 1].status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'gelesen': return 'bg-blue-100 text-blue-800';
      case 'verstanden': return 'bg-yellow-100 text-yellow-800';
      case 'abgelegt': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'gelesen': return <Eye className="w-3 h-3" />;
      case 'verstanden': return <Brain className="w-3 h-3" />;
      case 'abgelegt': return <Archive className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const uniqueCoaches = [...new Set(conversationSummaries.map(s => s.coach_id))];

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Coach-Gespräche Monitor
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gelesen, verstanden, abgelegt. 💾
              </p>
            </div>
            <Button 
              onClick={loadConversations} 
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Gespräche durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <Select value={filterCoach} onValueChange={setFilterCoach}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Coach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Coaches</SelectItem>
                {uniqueCoaches.map(coach => (
                  <SelectItem key={coach} value={coach}>{coach}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="unbearbeitet">Unbearbeitet</SelectItem>
                <SelectItem value="gelesen">Gelesen</SelectItem>
                <SelectItem value="verstanden">Verstanden</SelectItem>
                <SelectItem value="abgelegt">Abgelegt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gesamt Gespräche</p>
                <p className="text-2xl font-bold">{conversationSummaries.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gelesen</p>
                <p className="text-2xl font-bold text-blue-600">
                  {conversationSummaries.filter(s => getConversationStatus(s.conversation_ids) === 'gelesen').length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verstanden</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {conversationSummaries.filter(s => getConversationStatus(s.conversation_ids) === 'verstanden').length}
                </p>
              </div>
              <Brain className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abgelegt</p>
                <p className="text-2xl font-bold text-green-600">
                  {conversationSummaries.filter(s => getConversationStatus(s.conversation_ids) === 'abgelegt').length}
                </p>
              </div>
              <Archive className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gespräche Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredSummaries.map((summary) => {
                  const status = getConversationStatus(summary.conversation_ids);
                  return (
                    <div
                      key={`${summary.user_id}-${summary.coach_id}`}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedConversation === summary.conversation_ids[0] ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedConversation(summary.conversation_ids[0])}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {summary.user_id.slice(0, 8)}...
                          </span>
                        </div>
                        <Badge variant="outline" className={getStatusColor(status)}>
                          {getStatusIcon(status)}
                          <span className="ml-1 capitalize">{status}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {summary.coach_id}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {summary.message_count} Nachrichten
                        </span>
                      </div>
                      
                      {summary.rolling_summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {summary.rolling_summary}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(summary.last_activity), 'PPp', { locale: de })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation Details & Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gespräch Details & Aktionen</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <div className="space-y-4">
                {/* Conversation Messages */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-medium mb-3">Nachrichten</h4>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {conversations
                        .filter(conv => conv.id === selectedConversation || 
                          conversationSummaries.find(s => s.conversation_ids.includes(selectedConversation))
                            ?.conversation_ids.includes(conv.id))
                        .slice(0, 20)
                        .map((conv) => (
                          <div key={conv.id} className={`p-3 rounded ${
                            conv.message_role === 'user' ? 'bg-blue-50 ml-4' : 'bg-green-50 mr-4'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={conv.message_role === 'user' ? 'default' : 'secondary'} className="text-xs">
                                {conv.message_role === 'user' ? 'User' : conv.coach_personality}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(conv.created_at), 'HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm">{conv.message_content.slice(0, 200)}{conv.message_content.length > 200 ? '...' : ''}</p>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Admin Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium">Admin Aktion</h4>
                  
                  <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gelesen">Gelesen</SelectItem>
                      <SelectItem value="verstanden">Verstanden</SelectItem>
                      <SelectItem value="abgelegt">Abgelegt</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Textarea
                    placeholder="Admin Notiz hinzufügen..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  
                  <Button 
                    onClick={saveAdminNote}
                    disabled={!newNote.trim()}
                    className="w-full"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Als "{newStatus}" markieren
                  </Button>
                </div>

                {/* Previous Notes */}
                <div className="space-y-2">
                  <h4 className="font-medium">Verlauf</h4>
                  {adminNotes
                    .filter(note => note.conversation_id === selectedConversation)
                    .map(note => (
                      <div key={note.id} className="p-2 bg-muted/30 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getStatusColor(note.status)}>
                            {getStatusIcon(note.status)}
                            <span className="ml-1 capitalize">{note.status}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), 'PPp', { locale: de })}
                          </span>
                        </div>
                        <p>{note.note}</p>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Wähle ein Gespräch aus der Liste aus</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};