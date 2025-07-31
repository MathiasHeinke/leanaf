import React, { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
}

interface MessageItemProps {
  message: ChatMessage;
  coach: CoachProfile;
  onConversationAction?: (action: any) => void;
  style: React.CSSProperties;
  setRowHeight: (height: number) => void;
}

const MessageItem = React.memo(({ 
  message, 
  coach, 
  onConversationAction,
  style,
  setRowHeight
}: MessageItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const isUser = message.role === 'user';

  // Measure height after render
  useLayoutEffect(() => {
    if (itemRef.current) {
      const height = itemRef.current.getBoundingClientRect().height;
      setRowHeight(height);
    }
  });

  const handleImageLoad = useCallback(() => {
    if (itemRef.current) {
      const height = itemRef.current.getBoundingClientRect().height;
      setRowHeight(height);
    }
  }, [setRowHeight]);

  return (
    <div style={style} className="px-4 py-2">
      <div ref={itemRef} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
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
                  onLoad={handleImageLoad}
                  onError={handleImageLoad}
                />
              ))}
            </div>
          )}

          {message.video_url && (
            <video 
              src={message.video_url} 
              controls 
              className="mt-2 rounded-lg max-w-full h-auto"
              onLoadedMetadata={handleImageLoad}
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

MessageItem.displayName = 'MessageItem';

export const MessageList = React.memo(({ 
  messages, 
  coach, 
  onConversationAction
}: MessageListProps) => {
  const listRef = useRef<List>(null);
  const rowHeights = useRef<number[]>([]);

  const getSize = useCallback((index: number) => rowHeights.current[index] ?? 120, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  const setRowHeight = useCallback((index: number, height: number) => {
    if (rowHeights.current[index] !== height) {
      rowHeights.current[index] = height;
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <MessageItem
      style={style}
      message={messages[index]}
      coach={coach}
      onConversationAction={onConversationAction}
      setRowHeight={(height: number) => setRowHeight(index, height)}
    />
  ), [messages, coach, onConversationAction, setRowHeight]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Beginne ein Gespräch mit {coach.name}
      </div>
    );
  }

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={width}
          ref={listRef}
          itemCount={messages.length}
          itemSize={getSize}
          itemKey={(index) => messages[index].id}
          overscanCount={5}
          className="scrollbar-thin"
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
});

MessageList.displayName = 'MessageList';