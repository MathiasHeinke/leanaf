import React, { useRef, useLayoutEffect, useCallback } from 'react';
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

interface Props {
  index: number;
  style: React.CSSProperties;
  message: ChatMessage;
  coach: CoachProfile;
  onConversationAction?: (type: string, data?: any) => void;
  reportHeight: (index: number, h: number) => void;   // Index mitgeben!
}

export const MessageItem = React.memo(({
  index,
  style,
  message,
  coach,
  onConversationAction,
  reportHeight
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastH = useRef(0);
  const indexRef = useRef(index);
  const reportHeightRef = useRef(reportHeight);

  // Keep refs updated without causing re-renders
  indexRef.current = index;
  reportHeightRef.current = reportHeight;

  /** Completely stable measure function - no dependencies that change */
  const measure = useCallback(() => {
    if (ref.current) {
      const h = ref.current.getBoundingClientRect().height;
      if (h !== lastH.current && h > 0) {
        lastH.current = h;
        reportHeightRef.current(indexRef.current, h);  // Use refs - no dependencies!
      }
    }
  }, []);                               // Empty deps - completely stable

  useLayoutEffect(() => {               // Runs only once after mount
    measure();
  }, []);                               // Empty deps - no re-triggers

  const isUser = message.role === 'user';

  return (
    <div ref={ref} style={style} className="px-4 py-2">
      <div 
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
        role="group"
        aria-label={`Nachricht von ${isUser ? 'dir' : coach.name}`}
      >
        {!isUser && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={coach.avatar} alt={coach.name} />
            <AvatarFallback className="text-xs">
              {coach.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <Card className={`p-3 max-w-[80%] ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted'
        }`}>
          <div className="text-sm whitespace-pre-wrap">
            <ReactMarkdown
              skipHtml={true}
              components={{
                // Whitelist nur sichere Components
                p: ({ children }) => <p>{children}</p>,
                strong: ({ children }) => <strong>{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
                ul: ({ children }) => <ul className="list-disc ml-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                code: ({ children }) => <code className="bg-muted px-1 rounded">{children}</code>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {children}
                  </a>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {message.images && message.images.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {message.images.map((image, idx) => (
                <img
                  key={idx}
                  src={image}
                  alt={`Hochgeladenes Bild ${idx + 1}`}
                  className="rounded-lg max-w-full h-auto"
                  onLoad={measure}  // Höhe nach Bildladen messen
                  onError={measure}
                />
              ))}
            </div>
          )}

          {message.video_url && (
            <video 
              src={message.video_url} 
              controls 
              className="mt-2 rounded-lg max-w-full h-auto"
              onLoadedMetadata={measure}  // Höhe nach Video-Metadaten messen
              controlsList="nodownload"
            />
          )}

          {message.actions && message.actions.length > 0 && (
            <div className={`mt-3 flex gap-2 ${
              message.actions.length > 3 ? 'flex-col' : 'flex-wrap'
            }`}>
              {message.actions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => onConversationAction?.(action.type, action.data)}
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