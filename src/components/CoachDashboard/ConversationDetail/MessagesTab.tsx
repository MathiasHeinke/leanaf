import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConvMessage } from '@/types/coach-dashboard';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { User, Bot, Database, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagesTabProps {
  messages: ConvMessage[];
}

export const MessagesTab: React.FC<MessagesTabProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Keine Nachrichten gefunden</p>
          <p className="text-sm">Dieses Gespräch enthält noch keine Nachrichten</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.message_role === 'assistant' && "flex-row-reverse"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
              message.message_role === 'user'
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            )}>
              {message.message_role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Message Content */}
            <div className={cn(
              "flex-1 max-w-[70%]",
              message.message_role === 'assistant' && "flex flex-col items-end"
            )}>
              <Card className={cn(
                "shadow-sm",
                message.message_role === 'user'
                  ? "bg-blue-50 border-blue-200"
                  : "bg-green-50 border-green-200"
              )}>
                <CardContent className="p-3">
                  {/* Message Header */}
                  <div className={cn(
                    "flex items-center gap-2 mb-2",
                    message.message_role === 'assistant' && "justify-end"
                  )}>
                    <span className="text-xs font-medium">
                      {message.message_role === 'user' ? 'User' : message.coach_personality}
                    </span>
                    
                    {/* Context indicators */}
                    {message.context_data?.tool && (
                      <Badge variant="outline" className="text-xs">
                        <Wrench className="h-2 w-2 mr-1" />
                        {message.context_data.tool}
                      </Badge>
                    )}
                    
                    {message.context_data?.rag_hit && (
                      <Badge variant="outline" className="text-xs">
                        <Database className="h-2 w-2 mr-1" />
                        RAG
                      </Badge>
                    )}
                  </div>

                  {/* Message Text */}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.message_content}
                  </div>

                  {/* Timestamp */}
                  <div className={cn(
                    "text-xs text-muted-foreground mt-2",
                    message.message_role === 'assistant' && "text-right"
                  )}>
                    {format(new Date(message.created_at), 'HH:mm:ss', { locale: de })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};