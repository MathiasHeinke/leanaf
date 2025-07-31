import React from 'react';
import { MessageItem } from './MessageItem';

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

interface SimpleMessageListProps {
  messages: ChatMessage[];
  coach: CoachProfile;
  onConversationAction?: (action: any) => void;
}

// Simple message list without virtualization - no render loops
export const SimpleMessageList = React.memo(({ 
  messages, 
  coach, 
  onConversationAction 
}: SimpleMessageListProps) => {
  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Beginne ein Gespräch mit {coach.name}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {messages.map((message, index) => (
        <div key={message.id} className="w-full">
          <MessageItem
            index={index}
            style={{}} // No virtualization style needed
            message={message}
            coach={coach}
            onConversationAction={onConversationAction}
            reportHeight={() => {}} // No-op - no virtualization
          />
        </div>
      ))}
    </div>
  );
});

SimpleMessageList.displayName = 'SimpleMessageList';