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

interface MessageRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: ChatMessage[];
    coach: CoachProfile;
    onConversationAction?: (action: any) => void;
    setRowHeight: (index: number, height: number) => void;
  };
}

export const MessageRow = React.memo(({ index, style, data }: MessageRowProps) => {
  const { messages, coach, onConversationAction, setRowHeight } = data;
  const message = messages[index];
  const itemRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isUser = message.role === 'user';

  // Measure height after render - ONLY IF CHANGED
  useLayoutEffect(() => {
    if (itemRef.current) {
      const height = itemRef.current.getBoundingClientRect().height;
      // CRITICAL: Only call setRowHeight if height actually changed
      if (height !== lastHeightRef.current && height > 0) {
        lastHeightRef.current = height;
        setRowHeight(index, height);
      }

      // Set up ResizeObserver for responsive height updates - ONLY ONCE
      if (!resizeObserverRef.current && 'ResizeObserver' in window) {
        resizeObserverRef.current = new ResizeObserver(() => {
          if (itemRef.current) {
            const newHeight = itemRef.current.getBoundingClientRect().height;
            if (newHeight !== lastHeightRef.current && newHeight > 0) {
              lastHeightRef.current = newHeight;
              setRowHeight(index, newHeight);
            }
          }
        });
        resizeObserverRef.current.observe(itemRef.current);
      }
    }

    // Cleanup ResizeObserver on unmount only
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [index, setRowHeight]); // PROPER DEPENDENCIES

  const handleMediaLoad = useCallback(() => {
    if (itemRef.current) {
      const height = itemRef.current.getBoundingClientRect().height;
      // CRITICAL: Only call setRowHeight if height actually changed
      if (height !== lastHeightRef.current && height > 0) {
        lastHeightRef.current = height;
        setRowHeight(index, height);
      }
    }
  }, [index, setRowHeight]);

  return (
    <div style={style} className="px-4 py-2">
      <div 
        ref={itemRef} 
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
                // Whitelist only safe components
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
                  onLoad={handleMediaLoad}
                  onError={handleMediaLoad}
                />
              ))}
            </div>
          )}

          {message.video_url && (
            <video 
              src={message.video_url} 
              controls 
              className="mt-2 rounded-lg max-w-full h-auto"
              onLoadedMetadata={handleMediaLoad}
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

MessageRow.displayName = 'MessageRow';