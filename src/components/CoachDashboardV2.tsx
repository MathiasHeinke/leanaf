import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConversationTable } from './CoachDashboard/ConversationTable';
import { ConversationDetail } from './CoachDashboard/ConversationDetail';
import { FilterBar } from './CoachDashboard/FilterBar';
import { useConversations } from '@/hooks/useCoachDashboard';
import { DashboardFilters } from '@/types/coach-dashboard';
import { Loader2, Users, MessageSquare, Wrench, Database } from 'lucide-react';
import { subDays } from 'date-fns';

export const CoachDashboardV2: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    from: subDays(new Date(), 7), // Last 7 days by default
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  const { data: conversations, isLoading, error } = useConversations(filters);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!conversations) return { totalConversations: 0, totalMessages: 0, toolUsage: 0, ragUsage: 0 };
    
    return {
      totalConversations: conversations.length,
      totalMessages: conversations.reduce((sum, conv) => sum + conv.user_msgs + conv.coach_msgs, 0),
      toolUsage: conversations.filter(conv => conv.used_tool).length,
      ragUsage: conversations.filter(conv => conv.used_rag).length,
    };
  }, [conversations]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Fehler beim Laden des Dashboards: {error.message}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Neu laden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with Stats */}
      <div className="border-b bg-card p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Coach Monitoring Dashboard v2</h1>
            <Badge variant="secondary" className="text-xs">
              Live-Updates alle 30s
            </Badge>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Gespräche</p>
                    <p className="text-lg font-semibold">{stats.totalConversations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nachrichten</p>
                    <p className="text-lg font-semibold">{stats.totalMessages}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tool-Nutzung</p>
                    <p className="text-lg font-semibold">{stats.toolUsage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">RAG-Nutzung</p>
                    <p className="text-lg font-semibold">{stats.ragUsage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Conversations List */}
        <div className="flex flex-col w-full md:w-1/2 border-r bg-background">
          <div className="border-b bg-card p-4">
            <FilterBar value={filters} onChange={setFilters} />
          </div>
          
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Lade Gespräche...</span>
              </div>
            ) : (
              <ConversationTable
                conversations={conversations || []}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Conversation Detail */}
        <div className="hidden md:flex flex-col w-1/2 bg-muted/30">
          {selectedConversationId ? (
            <ConversationDetail
              conversationId={selectedConversationId}
              onClose={() => setSelectedConversationId(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Kein Gespräch ausgewählt</p>
                <p className="text-sm">Wählen Sie ein Gespräch aus der Liste aus</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};