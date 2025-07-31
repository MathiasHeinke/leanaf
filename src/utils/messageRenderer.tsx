import React from 'react';
import { SmartCard } from '@/components/SmartCard';
import { SupplementCard } from '@/components/SupplementCard';
import { MealCard } from '@/components/MealCard';
import { ExerciseCard } from '@/components/ExerciseCard';
import { MindsetCard } from '@/components/MindsetCard';
import { SimpleMessageItem } from '@/components/SimpleMessageItem';

export interface CardMessage {
  id: string;
  role: 'assistant';
  type: 'card';
  tool: 'supplement' | 'meal' | 'exercise' | 'mindset' | 'plan';
  payload: any;
  created_at: string;
  coach_personality: string;
}

export interface TextMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  images?: string[];
  mode?: string;
  metadata?: any;
  timestamp?: Date; // Add for compatibility
}

export type UnifiedMessage = CardMessage | TextMessage;

export function renderMessage(message: UnifiedMessage): React.ReactElement {
  // Check if it's a card message
  if ('type' in message && message.type === 'card') {
    const cardMessage = message as CardMessage;
    
    switch (cardMessage.tool) {
      case 'supplement':
        return (
          <SupplementCard
            key={cardMessage.id}
            supplements={cardMessage.payload.supplements || []}
            onConfirm={cardMessage.payload.onConfirm}
            onReject={cardMessage.payload.onReject}
          />
        );
      
      case 'meal':
        return (
          <MealCard
            key={cardMessage.id}
            meal={cardMessage.payload.meal}
          />
        );
      
      case 'exercise':
        return (
          <ExerciseCard
            key={cardMessage.id}
            exercise={cardMessage.payload.exercise}
          />
        );
      
      case 'mindset':
        return (
          <MindsetCard
            key={cardMessage.id}
            mindset={cardMessage.payload.mindset || {
              sentiment: 'positive',
              quote: cardMessage.payload.quote || 'Stay positive!',
              author: cardMessage.payload.author,
              reflection: cardMessage.payload.reflection,
              breathingExercise: cardMessage.payload.exercise
            }}
          />
        );
      
      case 'plan':
        // For training plans, use a generic SmartCard for now
        return (
          <SmartCard
            key={cardMessage.id}
            tool="plan"
            icon="🏋️‍♂️"
            title="Trainingsplan"
            defaultCollapsed={true}
          >
            <div className="space-y-2">
              {cardMessage.payload.days?.map((day: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="font-medium">{day.name}</span>
                  <span className="text-muted-foreground">{day.type}</span>
                </div>
              ))}
            </div>
          </SmartCard>
        );
      
      default:
        // Fallback to generic SmartCard
        return (
          <SmartCard
            key={cardMessage.id}
            tool={cardMessage.tool}
            icon="💡"
            title="Strukturierte Antwort"
            defaultCollapsed={true}
          >
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(cardMessage.payload, null, 2)}
            </pre>
          </SmartCard>
        );
    }
  }
  
  // Default to text message rendering
  const textMessage = message as TextMessage;
  return (
    <SimpleMessageItem
      key={textMessage.id}
      message={{
        ...textMessage,
        timestamp: new Date(textMessage.created_at)
      }}
      coach={{
        name: 'Coach',
        avatar: '/placeholder.svg',
        primaryColor: 'blue',
        secondaryColor: 'blue',
        personality: textMessage.coach_personality
      }}
    />
  );
}

// Helper function to create card messages from backend responses
export function createCardMessage(
  tool: CardMessage['tool'],
  payload: any,
  coachPersonality: string = 'motivierend'
): CardMessage {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'assistant',
    type: 'card',
    tool,
    payload,
    created_at: new Date().toISOString(),
    coach_personality: coachPersonality
  };
}