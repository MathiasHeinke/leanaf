import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

interface SimpleMessageItemProps {
  message: ChatMessage;
  coach: CoachProfile;
  onConversationAction?: (action: any) => void;
}

// Simple message item without any height reporting or layout effects
export const SimpleMessageItem = React.memo(({
  message,
  coach,
  onConversationAction
}: SimpleMessageItemProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        {isUser ? (
          <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
            U
          </div>
        ) : (
          <img 
            src={coach.avatar} 
            alt={coach.name}
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </Avatar>

      {/* Message content */}
      <div className={`flex-1 space-y-2 ${isUser ? 'text-right' : ''}`}>
        {/* Message bubble */}
        <div className={`inline-block max-w-[80%] px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted'
        }`}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown 
              components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-muted pl-4 italic">{children}</blockquote>
            }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.images.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt={`Upload ${index + 1}`}
                className="max-w-xs max-h-48 rounded-lg object-cover border"
              />
            ))}
          </div>
        )}

        {/* Video */}
        {message.video_url && (
          <video
            src={message.video_url}
            controls
            className="max-w-xs max-h-48 rounded-lg border"
          />
        )}

        {/* Action buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onConversationAction?.(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs text-muted-foreground ${isUser ? 'text-right' : ''}`}>
          {format(message.timestamp, 'HH:mm', { locale: de })}
        </div>
      </div>
    </div>
  );
});

SimpleMessageItem.displayName = 'SimpleMessageItem';