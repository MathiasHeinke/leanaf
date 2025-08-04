import React, { useRef, useLayoutEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Button } from '@/components/ui/button';
import { BadgeSvg } from './BadgeSvg';

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
  const lastHeight = useRef(0);

  // Measure function for media load events
  const handleMediaLoad = useCallback(() => {
    if (!ref.current) return;
    const h = ref.current.getBoundingClientRect().height;
    if (h !== lastHeight.current && h > 0) {
      lastHeight.current = h;
      reportHeight(index, h);
    }
  }, [index, reportHeight]);

  // Initial measurement only on mount
  useLayoutEffect(() => {
    if (!ref.current) return;
    const h = ref.current.getBoundingClientRect().height;
    lastHeight.current = h;
    reportHeight(index, h);
  }, []); // Only run on mount

  const isUser = message.role === 'user';
  const timeString = message.timestamp.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div ref={ref} style={style} className="px-4 py-2">
      {/* Main message bubble */}
      <div 
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
        role="group"
        aria-label={`Nachricht von ${isUser ? 'dir' : coach.name}`}
      >
        <div className={`p-3 max-w-[75%] rounded-2xl shadow-sm ${
          isUser 
            ? 'bg-primary text-primary-foreground rounded-br-md' 
            : 'bg-muted rounded-bl-md'
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
          
          {/* Images inside bubble */}
          {message.images && message.images.length > 0 && (
            <div className="mt-2">
              {message.images.map((url, idx) => (
                <img
                  key={url}
                  src={url}
                  alt={`Hochgeladenes Bild ${idx + 1}`}
                  className="rounded-lg max-w-[220px] max-h-[280px] object-cover shadow"
                  onLoad={handleMediaLoad}
                  onError={handleMediaLoad}
                />
              ))}
            </div>
          )}

          {/* Video inside bubble */}
          {message.video_url && (
            <video 
              src={message.video_url} 
              controls 
              className="mt-2 rounded-lg max-w-full h-auto"
              onLoadedMetadata={handleMediaLoad}
              controlsList="nodownload"
            />
          )}

          {/* Action buttons inside bubble */}
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
        </div>
      </div>
      
      {/* Footer with avatar and time - BELOW the bubble */}
      <div className={`flex mt-1 text-xs items-center ${
        isUser ? 'justify-end' : 'justify-start'
      }`}>
        {/* Coach side: Avatar left, time right */}
        {!isUser && (
          <>
            <Avatar className="h-6 w-6 flex-shrink-0 mr-2">
              <AvatarImage src={coach.avatar} alt={coach.name} />
              <AvatarFallback className="text-xs">
                {coach.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">{timeString}</span>
          </>
        )}
        
        {/* User side: Time left, avatar right */}
        {isUser && (
          <>
            <span className="text-muted-foreground mr-2">{timeString}</span>
            <div className="h-6 w-6 flex-shrink-0">
              <BadgeSvg className="w-full h-full" />
            </div>
          </>
        )}
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';