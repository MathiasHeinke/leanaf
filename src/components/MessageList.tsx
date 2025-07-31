import React, { useRef, useCallback, useEffect, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { MessageItem } from './MessageItem';           // auslagern!
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

/** separat, 100% stabil */
const Row = React.memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: any;
}) => {
  const { messages, coach, onConversationAction, setRowHeight } = data;
  
  /* Stable Callback pro Zeile - NICHT jedes Render neu! */
  const reportHeight = React.useCallback(
    (h: number) => setRowHeight(index, h),
    [index, setRowHeight]      // ändert sich nur, wenn **index** wechselt
  );

  return (
    <MessageItem
      index={index}
      style={style}
      message={messages[index]}
      coach={coach}
      onConversationAction={onConversationAction}
      reportHeight={reportHeight}  // STABILE Referenz!
    />
  );
});
Row.displayName = 'Row';

export const MessageList = React.memo(({ messages, coach, onConversationAction }: MessageListProps) => {
  const listRef = useRef<List>(null);
  const heights = useRef<number[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);

  /** Row-Height Setter (stable) mit zusätzlicher Absicherung */
  const setRowHeight = useCallback((index: number, h: number) => {
    if (h > 0 && heights.current[index] !== h) {  // Prüfe h > 0 UND wirklich neu
      heights.current[index] = h;
      // batchen, sonst mehrere msgs mit Bildern -> zig Resets
      requestAnimationFrame(() => listRef.current?.resetAfterIndex(index));
    }
  }, []);

  /** Größe pro Item */
  const getSize = useCallback((i: number) => heights.current[i] ?? 120, []);

  /** Scroll auf neue Nachricht - nur wenn am Bottom */
  useEffect(() => {
    if (messages.length && isAtBottom) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToItem(messages.length - 1, 'end');
      });
    }
  }, [messages.length, isAtBottom]);

  // Detect if user manually scrolled away from bottom
  const handleScroll = useCallback(({ scrollOffset }: any) => {
    if (listRef.current) {
      const list = listRef.current;
      const totalHeight = messages.reduce((sum, _, index) => sum + getSize(index), 0);
      const visibleHeight = list.props.height;
      const isNearBottom = scrollOffset + visibleHeight >= totalHeight - 50;
      setIsAtBottom(isNearBottom);
    }
  }, [messages, getSize]);

  // Memory cleanup - prevent rowHeights array from growing indefinitely
  useEffect(() => {
    const currentLength = messages.length;
    if (heights.current.length > currentLength) {
      heights.current = heights.current.slice(0, currentLength);
    }
  }, [messages.length]);

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Beginne ein Gespräch mit {coach.name}
      </div>
    );
  }

  /** itemData vermeidet Inline-Funktion */
  const itemData = { messages, coach, onConversationAction, setRowHeight };

  return (
    <div className="relative h-full" aria-live="polite" aria-label="Chat-Nachrichten">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={messages.length}
            itemSize={getSize}
            itemData={itemData}
            itemKey={(index) => messages[index].id}
            overscanCount={5}
            onScroll={handleScroll}
            className="scrollbar-thin"
          >
            {Row}
          </List>
        )}
      </AutoSizer>

      {/* Jump to latest button when user scrolled up */}
      {!isAtBottom && messages.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            size="sm"
            onClick={() => {
              setIsAtBottom(true);
              listRef.current?.scrollToItem(messages.length - 1, 'end');
            }}
            className="shadow-lg"
          >
            ↓ Zur neuesten Nachricht
          </Button>
        </div>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';