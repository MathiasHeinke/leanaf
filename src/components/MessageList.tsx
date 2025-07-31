import React from 'react';
import { FixedSizeList as List } from 'react-window';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
  video_url?: string;
  actions?: Array<{
    type: 'exercise_recognition' | 'exercise_confirmation';
    label: string;
    data: any;
  }>;
}

interface CoachProfile {
  name: string;
  avatar: string;
  primaryColor: string;
  secondaryColor: string;
  personality: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  coach: CoachProfile;
  onConversationAction?: (action: any) => void;
  height: number;
}

const MessageItem = React.memo(({ 
  message, 
  coach, 
  onConversationAction,
  style 
}: { 
  message: ChatMessage; 
  coach: CoachProfile; 
  onConversationAction?: (action: any) => void;
  style: React.CSSProperties;
}) => {
  const isUser = message.role === 'user';

  return (
    <div style={style} className="px-4 py-2">
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={coach.avatar} alt={coach.name} />
            <AvatarFallback className="text-xs">{coach.name[0]}</AvatarFallback>
          </Avatar>
        )}
        
        <Card className={`p-3 max-w-[80%] ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted'
        }`}>
          <div className="text-sm whitespace-pre-wrap">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          
          {message.images && message.images.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {message.images.map((image, idx) => (
                <img
                  key={idx}
                  src={image}
                  alt="Uploaded"
                  className="rounded-lg max-w-full h-auto"
                />
              ))}
            </div>
          )}

          {message.video_url && (
            <video 
              src={message.video_url} 
              controls 
              className="mt-2 rounded-lg max-w-full h-auto"
            />
          )}

          {message.actions && message.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.actions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => onConversationAction?.(action)}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </Card>

        {isUser && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs">Du</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export const MessageList = React.memo(({ 
  messages, 
  coach, 
  onConversationAction,
  height 
}: MessageListProps) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Beginne ein Gespräch mit {coach.name}
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={120} // Estimate - will auto-adjust
      width="100%"
      className="scrollbar-thin"
    >
      {({ index, style }) => (
        <MessageItem
          style={style}
          message={messages[index]}
          coach={coach}
          onConversationAction={onConversationAction}
        />
      )}
    </List>
  );
});

MessageList.displayName = 'MessageList';