import React, { useRef, useEffect, useCallback, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { MessageRow } from './MessageRow';
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

export const MessageList = React.memo(({ 
  messages, 
  coach, 
  onConversationAction
}: MessageListProps) => {
  const listRef = useRef<List>(null);
  const rowHeights = useRef<number[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const pendingUpdates = useRef<Set<number>>(new Set());
  const updateFrameRef = useRef<number | null>(null);

  // Stabilized onConversationAction handler
  const stableActionHandler = useRef(onConversationAction);
  stableActionHandler.current = onConversationAction;
  
  const handleConversationAction = useCallback((action: any) => {
    stableActionHandler.current?.(action);
  }, []);

  const getSize = useCallback((index: number) => rowHeights.current[index] ?? 120, []);

  // Intelligent auto-scroll: only scroll if user is at bottom
  useEffect(() => {
    if (messages.length > 0 && listRef.current && isAtBottom) {
      // Small delay to allow for rendering
      requestAnimationFrame(() => {
        listRef.current?.scrollToItem(messages.length - 1, 'end');
      });
    }
  }, [messages.length, isAtBottom]);

  // Detect if user manually scrolled away from bottom
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: any) => {
    if (listRef.current) {
      const list = listRef.current;
      const totalHeight = messages.reduce((sum, _, index) => sum + getSize(index), 0);
      const visibleHeight = list.props.height;
      const isNearBottom = scrollOffset + visibleHeight >= totalHeight - 50;
      setIsAtBottom(isNearBottom);
    }
  }, [messages, getSize]);

  // Optimized row height setter with batching
  const setRowHeight = useCallback((index: number, height: number) => {
    // CRITICAL: Only update if height actually changed AND is valid
    if (rowHeights.current[index] !== height && height > 0) {
      rowHeights.current[index] = height;
      
      // Batch updates using requestAnimationFrame
      pendingUpdates.current.add(index);
      
      if (updateFrameRef.current === null) {
        updateFrameRef.current = requestAnimationFrame(() => {
          if (listRef.current && pendingUpdates.current.size > 0) {
            const minIndex = Math.min(...pendingUpdates.current);
            listRef.current.resetAfterIndex(minIndex);
            pendingUpdates.current.clear();
          }
          updateFrameRef.current = null;
        });
      }
    }
  }, []);

  // Memory cleanup - prevent rowHeights array from growing indefinitely
  useEffect(() => {
    const currentLength = messages.length;
    if (rowHeights.current.length > currentLength) {
      rowHeights.current = rowHeights.current.slice(0, currentLength);
    }
  }, [messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateFrameRef.current) {
        cancelAnimationFrame(updateFrameRef.current);
      }
    };
  }, []);

  // Memoized item data to prevent Row re-renders
  const itemData = React.useMemo(() => ({
    messages,
    coach,
    onConversationAction: handleConversationAction,
    setRowHeight
  }), [messages, coach, handleConversationAction, setRowHeight]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Beginne ein Gespräch mit {coach.name}
      </div>
    );
  }

  return (
    <div className="relative h-full" aria-live="polite" aria-label="Chat-Nachrichten">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            ref={listRef}
            itemCount={messages.length}
            itemSize={getSize}
            itemData={itemData}
            itemKey={(index) => messages[index].id}
            overscanCount={5}
            onScroll={handleScroll}
            className="scrollbar-thin"
          >
            {MessageRow}
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