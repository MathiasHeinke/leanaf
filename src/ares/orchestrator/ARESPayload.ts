export type ARESEvent =
  | { type: 'TEXT'; text: string; clientEventId?: string }
  | { type: 'MEDIA'; images: string[]; text?: string; clientEventId?: string };

export type ARESContext = {
  userId: string;
  coachId: 'ares';
  timezone?: string;
  locale?: string;
  platform?: 'web'|'ios'|'android';
  meta?: Record<string, unknown>;
};

export type ARESReply = {
  reply: string;
  traceId?: string | null;
};