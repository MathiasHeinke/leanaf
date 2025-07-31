import React from 'react';
import { SimpleMessageItem } from './SimpleMessageItem';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  created_at?: string;
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
  avatar?: string;
  imageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  color?: string;
  accentColor?: string;
  personality: string;
}

interface SimpleMessageListProps {
  messages: ChatMessage[];
  coach: CoachProfile;
  onConversationAction?: (action: any) => void;
}

// Message clustering logic
const shouldShowFooter = (messages: ChatMessage[], index: number): boolean => {
  const currentMessage = messages[index];
  const nextMessage = messages[index + 1];
  
  // Always show footer for last message
  if (index === messages.length - 1) return true;
  
  // Show footer if next message is from different sender
  if (!nextMessage || nextMessage.role !== currentMessage.role) return true;
  
  // Show footer if time gap > 60 seconds
  const currentTime = new Date(currentMessage.created_at || currentMessage.timestamp || Date.now());
  const nextTime = new Date(nextMessage.created_at || nextMessage.timestamp || Date.now());
  const timeDiff = Math.abs(nextTime.getTime() - currentTime.getTime());
  
  return timeDiff > 60000; // 60 seconds
};

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
    <div className="flex-1 overflow-y-auto space-y-0.5 p-4">
      {messages.map((message, index) => (
        <div key={message.id} className="w-full">
          <SimpleMessageItem
            message={{
              ...message,
              timestamp: message.timestamp || new Date(message.created_at || Date.now())
            }}
            coach={{
              name: coach.name,
              avatar: coach.imageUrl || coach.avatar || '',
              primaryColor: coach.color || coach.primaryColor || '#3b82f6',
              secondaryColor: coach.accentColor || coach.secondaryColor || '#1d4ed8',
              personality: coach.personality
            }}
            showFooter={shouldShowFooter(messages, index)}
            onConversationAction={onConversationAction}
          />
        </div>
      ))}
    </div>
  );
});

SimpleMessageList.displayName = 'SimpleMessageList';