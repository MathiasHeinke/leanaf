import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardRow } from '@/types/coach-dashboard';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  Brain, 
  Archive, 
  Database, 
  Wrench, 
  MessageCircle,
  User,
  Clock
} from 'lucide-react';

interface ConversationTableProps {
  conversations: DashboardRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'reviewed':
      return <Brain className="h-3 w-3 text-blue-500" />;
    case 'archived':
      return <Archive className="h-3 w-3 text-gray-500" />;
    default:
      return <Eye className="h-3 w-3 text-orange-500" />;
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'reviewed':
      return 'Verstanden';
    case 'archived':
      return 'Abgelegt';
    default:
      return 'Gelesen';
  }
};

const hashUserId = (userId: string): string => {
  return `usr_${userId.slice(0, 12)}`;
};

export const ConversationTable: React.FC<ConversationTableProps> = ({
  conversations,
  selectedId,
  onSelect,
}) => {
  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Keine Gespräche gefunden</p>
          <p className="text-sm">Passen Sie die Filter an oder wählen Sie einen anderen Zeitraum</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {conversations.map((conversation) => (
          <Card
            key={conversation.conversation_id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border",
              selectedId === conversation.conversation_id
                ? "ring-2 ring-primary shadow-md"
                : "hover:border-primary/50"
            )}
            onClick={() => onSelect(conversation.conversation_id)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {conversation.coach}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {hashUserId(conversation.user_id)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(conversation.admin_status)}
                    <span className="text-xs text-muted-foreground">
                      {getStatusLabel(conversation.admin_status)}
                    </span>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{conversation.user_msgs + conversation.coach_msgs}</span>
                    </div>
                    
                    {conversation.used_rag && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Database className="h-3 w-3" />
                        <span>RAG</span>
                      </div>
                    )}
                    
                    {conversation.used_tool && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Wrench className="h-3 w-3" />
                        <span>Tools</span>
                      </div>
                    )}

                    {conversation.plan_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {conversation.plan_count} Plan{conversation.plan_count > 1 ? 'e' : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(conversation.last_msg_at), {
                      addSuffix: true,
                      locale: de
                    })}
                  </div>
                </div>

                {/* Tools List (if any) */}
                {conversation.tool_list.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {conversation.tool_list.map((tool, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Timeline */}
                <div className="text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>
                      Gestartet: {new Date(conversation.started_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-blue-600">{conversation.user_msgs} User</span>
                      <span>•</span>
                      <span className="text-green-600">{conversation.coach_msgs} Coach</span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};