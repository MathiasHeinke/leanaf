import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, MessageSquare, Database, Wrench, FileText, StickyNote } from 'lucide-react';
import { useConversationDetail, useAdminNotes } from '@/hooks/useCoachDashboard';
import { MessagesTab } from './ConversationDetail/MessagesTab';
import { RagTab } from './ConversationDetail/RagTab';
import { ToolsTab } from './ConversationDetail/ToolsTab';
import { PlansTab } from './ConversationDetail/PlansTab';
import { AdminNotesPanel } from './ConversationDetail/AdminNotesPanel';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ConversationDetailProps {
  conversationId: string;
  onClose: () => void;
}

export const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversationId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('messages');
  const { data: detail, isLoading, error } = useConversationDetail(conversationId);
  const { data: adminNotes } = useAdminNotes(conversationId);

  // Parse conversation ID to extract metadata
  const [userId, coach, dateStr] = conversationId.split('-');
  const conversationDate = new Date(dateStr);

  const tabCounts = {
    messages: detail?.messages.length || 0,
    rag: detail?.rag.length || 0,
    tools: detail?.tools.length || 0,
    plans: detail?.plans.length || 0,
    notes: adminNotes?.length || 0,
  };

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Fehler</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p>Fehler beim Laden der Gesprächsdetails</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Gesprächsdetails</h2>
              <Badge variant="outline">{coach}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(conversationDate, 'EEEE, dd.MM.yyyy', { locale: de })} • 
              User: {userId.slice(0, 12)}...
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Lade Gesprächsdetails...</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b bg-card px-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="messages" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Nachrichten
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.messages}
                  </Badge>
                </TabsTrigger>
                
                <TabsTrigger value="rag" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  RAG
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.rag}
                  </Badge>
                </TabsTrigger>
                
                <TabsTrigger value="tools" className="text-xs">
                  <Wrench className="h-3 w-3 mr-1" />
                  Tools
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.tools}
                  </Badge>
                </TabsTrigger>
                
                <TabsTrigger value="plans" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Pläne
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.plans}
                  </Badge>
                </TabsTrigger>
                
                <TabsTrigger value="notes" className="text-xs">
                  <StickyNote className="h-3 w-3 mr-1" />
                  Admin
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tabCounts.notes}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="messages" className="h-full m-0">
                <MessagesTab messages={detail?.messages || []} />
              </TabsContent>

              <TabsContent value="rag" className="h-full m-0">
                <RagTab ragEvents={detail?.rag || []} />
              </TabsContent>

              <TabsContent value="tools" className="h-full m-0">
                <ToolsTab toolEvents={detail?.tools || []} />
              </TabsContent>

              <TabsContent value="plans" className="h-full m-0">
                <PlansTab plans={detail?.plans || []} />
              </TabsContent>

              <TabsContent value="notes" className="h-full m-0">
                <AdminNotesPanel 
                  conversationId={conversationId}
                  notes={adminNotes || []}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
};