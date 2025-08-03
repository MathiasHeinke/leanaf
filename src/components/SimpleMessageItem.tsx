import React from 'react';
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
  showFooter?: boolean;
  onConversationAction?: (action: any) => void;
  onRetry?: () => void;
}

// Simple message item without any height reporting or layout effects
export const SimpleMessageItem = React.memo(({
  message,
  coach,
  showFooter = true,
  onConversationAction,
  onRetry
}: SimpleMessageItemProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Message bubble */}
      <div className={`rounded-xl px-4 py-3 max-w-[75%] whitespace-pre-wrap ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
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

      {/* NEU – Bild ist Teil der Bubble-Card */}
      {message.images && message.images.length > 0 && (
        <div className={`rounded-xl px-4 py-3 max-w-[75%] ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        }`}>
          <div className="mt-2 flex flex-wrap gap-2">
            {message.images.map((url, index) => (
              <img
                key={url}
                src={url}
                alt={`Upload ${index + 1}`}
                className="
                  rounded-lg
                  max-w-[220px]
                  max-h-[280px]
                  object-cover
                  shadow
                "
              />
            ))}
          </div>
        </div>
      )}

      {/* Video */}
      {message.video_url && (
        <div className={`max-w-[75%] ${isUser ? 'self-end' : ''}`}>
          <video
            src={message.video_url}
            controls
            className="max-w-xs max-h-48 rounded-lg border"
          />
        </div>
      )}

      {/* Action buttons */}
      {message.actions && message.actions.length > 0 && (
        <div className={`flex flex-wrap gap-2 max-w-[75%] ${isUser ? 'justify-end' : ''}`}>
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

      {/* Footer with Avatar & Timestamp - only for last message in cluster */}
      {showFooter && (
        <div className={`footer-row ${isUser ? 'user' : ''}`}>
          {!isUser && (
            <img 
              src={coach.avatar} 
              alt={coach.name}
              className="avatar"
            />
          )}
          <span className="time">
            {format(message.timestamp, 'HH:mm', { locale: de })}
          </span>
          {isUser && (
            <div className="avatar bg-primary rounded-full flex items-center justify-center text-primary-foreground text-[8px] font-medium">
              U
            </div>
          )}
        </div>
      )}
      
      {/* Show retry button for failed messages */}
      {onRetry && (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-xs"
          >
            🔄 Wiederholen
          </Button>
        </div>
      )}
    </div>
  );
});

SimpleMessageItem.displayName = 'SimpleMessageItem';