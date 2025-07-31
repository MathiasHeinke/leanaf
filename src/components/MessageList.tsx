import React, { useRef, useCallback, useEffect, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { MessageItem } from './MessageItem';
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

const Row = React.memo<{ index: number; style: React.CSSProperties; data: any }>(
  ({ index, style, data }) => {
    const { msgs, coach, onAction, setH } = data;
    /* KEIN useCallback hier – wir geben setH 1:1 weiter */
    return (
      <MessageItem
        index={index}
        style={style}
        message={msgs[index]}
        coach={coach}
        onConversationAction={onAction}
        reportHeight={setH}           // stabile Referenz!
      />
    );
  }
);
Row.displayName = 'Row';

export const MessageList = React.memo(({
  messages,
  coach,
  onConversationAction
}: MessageListProps) => {
  /* ---------- refs ---------- */
  const listRef = useRef<List>(null);
  const rowHeights = useRef<number[]>([]);
  const pendingResetRef = useRef<number | null>(null);   // batch-reset

  /* ---------- helpers ---------- */
  const getSize = useCallback(
    (i: number) => rowHeights.current[i] ?? 120,
    []
  );

  const setRowHeight = useCallback((index: number, h: number) => {
    if (h <= 0) return;                       // unplausible Höhe ignorieren
    if (rowHeights.current[index] === h) return;

    rowHeights.current[index] = h;

    /* batch nur EINEN reset im nächsten Frame */
    if (pendingResetRef.current == null) {
      pendingResetRef.current = index;
      requestAnimationFrame(() => {
        listRef.current?.resetAfterIndex(pendingResetRef.current!, false);
        pendingResetRef.current = null;
      });
    }
  }, []);

  /* ---------- auto-scroll nur wenn am Ende ---------- */
  const atBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (scrollUpdateWasRequested) return; // programmatischer Scroll
    const list = listRef.current;
    if (!list) return;
    const { height } = list.props;        // sichtbarer Bereich
    const total = messages.reduce((s, _, i) => s + getSize(i), 0);
    const isAtBottom = scrollOffset + height >= total - 40;
    atBottomRef.current = isAtBottom;
    setShowScrollButton(!isAtBottom && messages.length > 0);
  }, [messages, getSize]);

  /* wenn neue Nachricht und User ist unten → autoscroll */
  useEffect(() => {
    if (!listRef.current) return;
    if (messages.length && atBottomRef.current) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  /* ---------- cleanup (heights kürzen) ---------- */
  useEffect(() => {
    if (rowHeights.current.length > messages.length) {
      rowHeights.current.length = messages.length;
    }
  }, [messages.length]);

  /* ---------- render ---------- */
  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Beginne ein Gespräch mit {coach.name}
      </div>
    );
  }

  const itemData = { msgs: messages, coach, onAction: onConversationAction, setH: setRowHeight };

  return (
    <div className="relative h-full" aria-live="polite" aria-label="Chat-Nachrichten">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            itemCount={messages.length}
            itemSize={getSize}
            height={height}
            width={width}
            overscanCount={4}
            itemData={itemData}
            itemKey={(index) => messages[index].id}
            onScroll={handleScroll}
            className="scrollbar-thin"
          >
            {Row}
          </List>
        )}
      </AutoSizer>

      {/* Jump to latest button when user scrolled up */}
      {showScrollButton && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            size="sm"
            onClick={() => {
              atBottomRef.current = true;
              setShowScrollButton(false);
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