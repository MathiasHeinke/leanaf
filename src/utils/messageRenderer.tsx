import React from 'react';
import { SmartCard } from '@/components/SmartCard';
import { SupplementCard } from '@/components/SupplementCard';
import { MealCard } from '@/components/MealCard';
import { ExerciseCard } from '@/components/ExerciseCard';
import { MindsetCard } from '@/components/MindsetCard';
import { TrainingPlanCard } from '@/components/TrainingPlanCard';
import { EnhancedTrainingPlanCard } from '@/components/EnhancedTrainingPlanCard';
import { SimpleMessageItem } from '@/components/SimpleMessageItem';
import { ToolActionButton } from '@/components/ToolActionButton';
import AresMetaCoachCard from '@/components/coach/cards/AresMetaCoachCard';
import AresTotalAssessmentCard from '@/components/coach/cards/AresTotalAssessmentCard';
import AresUltimateWorkoutCard from '@/components/coach/cards/AresUltimateWorkoutCard';
import AresSuperNutritionCard from '@/components/coach/cards/AresSuperNutritionCard';

export interface CardMessage {
  id: string;
  role: 'assistant';
  type: 'card';
  tool: 'supplement' | 'meal' | 'exercise' | 'mindset' | 'plan' | 'workout_plan' | 'trainingsplan' | 'aresMetaCoach' | 'aresTotalAssessment' | 'aresUltimateWorkoutPlan' | 'aresSuperNutrition';
  card?: 'enhanced_training_plan' | 'workout_plan' | 'trainingsplan' | 'aresMetaCoach' | 'aresTotalAssessment' | 'aresUltimateWorkoutPlan' | 'aresSuperNutrition';
  payload: any;
  created_at: string;
  coach_personality: string;
  content?: string; // Add content field for compatibility
  isStreaming?: boolean; // Add streaming support
  pendingTools?: Array<{
    tool: string;
    label: string;
    description?: string;
    confidence: number;
    contextData?: any;
  }>;
}

export interface TextMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  coach_name?: string;
  coach_avatar?: string;
  coach_color?: string;
  coach_accent_color?: string;
  images?: string[];
  mode?: string;
  metadata?: any;
  timestamp?: Date; // Add for compatibility
  status?: 'sending' | 'sent' | 'failed'; // Add status field
  isStreaming?: boolean; // Add streaming support
  pendingTools?: Array<{
    tool: string;
    label: string;
    description?: string;
    confidence: number;
    contextData?: any;
  }>;
}

export type UnifiedMessage = CardMessage | TextMessage;

export function renderMessage(
  message: UnifiedMessage, 
  onToolAction?: (tool: string, data?: any) => void,
  onRetryMessage?: (messageId: string) => void
): React.ReactElement {
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
      
      // ARES Tool Cards
      case 'aresMetaCoach':
        return (
          <AresMetaCoachCard
            key={cardMessage.id}
            analysis={cardMessage.payload.analysis}
            query={cardMessage.payload.query}
            timestamp={cardMessage.payload.timestamp}
            ares_signature={cardMessage.payload.ares_signature}
          />
        );
      
      case 'aresTotalAssessment':
        return (
          <AresTotalAssessmentCard
            key={cardMessage.id}
            assessment={cardMessage.payload.assessment}
            user_query={cardMessage.payload.user_query}
            generated_at={cardMessage.payload.generated_at}
            ares_authority={cardMessage.payload.ares_authority}
          />
        );
      
      case 'aresUltimateWorkoutPlan':
        return (
          <AresUltimateWorkoutCard
            key={cardMessage.id}
            plan={cardMessage.payload.plan}
            user_input={cardMessage.payload.user_input}
            created_at={cardMessage.payload.created_at}
            ares_seal={cardMessage.payload.ares_seal}
          />
        );
      
      case 'aresSuperNutrition':
        return (
          <AresSuperNutritionCard
            key={cardMessage.id}
            plan={cardMessage.payload.plan}
            user_context={cardMessage.payload.user_context}
            created_at={cardMessage.payload.created_at}
            ares_nutrition_seal={cardMessage.payload.ares_nutrition_seal}
          />
        );

      case 'plan':
      case 'workout_plan':
      case 'trainingsplan':
        // Check if it's an enhanced training plan
        if (cardMessage.card === 'enhanced_training_plan') {
          return (
            <EnhancedTrainingPlanCard
              key={cardMessage.id}
              name={cardMessage.payload.name}
              plan={cardMessage.payload.plan || []}
              goal={cardMessage.payload.goal}
              daysPerWeek={cardMessage.payload.daysPerWeek}
              description={cardMessage.payload.description}
              principles={cardMessage.payload.principles}
              userStats={cardMessage.payload.userStats}
              coachStyle={cardMessage.payload.coachStyle}
              progressionPlan={cardMessage.payload.progressionPlan}
              savedPlanId={cardMessage.payload.savedPlanId}
            />
          );
        }
        
        // Use standard TrainingPlanCard component
        return (
          <TrainingPlanCard
            key={cardMessage.id}
            plan={cardMessage.payload.plan || cardMessage.payload.days || []}
            onConfirm={cardMessage.payload.onConfirm}
            onReject={cardMessage.payload.onReject}
            htmlContent={cardMessage.payload.html}
          />
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
  
  // Default to text message rendering with tool buttons
  const textMessage = message as TextMessage;
  
  return (
    <div key={textMessage.id}>
      <SimpleMessageItem
        message={{
          ...textMessage,
          timestamp: new Date(textMessage.created_at)
        }}
        coach={{
          name: textMessage.coach_name || 'Coach',
          avatar: textMessage.coach_avatar || '/placeholder.svg',
          primaryColor: textMessage.coach_color || '#3b82f6',
          secondaryColor: textMessage.coach_accent_color || '#1d4ed8',
          personality: textMessage.coach_personality || ''
        }}
        onRetry={textMessage.status === 'failed' ? () => onRetryMessage?.(textMessage.id) : undefined}
      />
      
      {/* Render tool action buttons if present */}
      {textMessage.pendingTools && textMessage.pendingTools.length > 0 && textMessage.role === 'assistant' && (
        <div className="mt-3 flex flex-wrap gap-2 justify-start">
          {textMessage.pendingTools.map((pendingTool, index) => (
            <ToolActionButton
              key={`${pendingTool.tool}-${index}`}
              tool={pendingTool.tool}
              label={pendingTool.label}
              description={pendingTool.description}
              onClick={() => onToolAction?.(pendingTool.tool, pendingTool.contextData)}
              isVisible={true}
            />
          ))}
        </div>
      )}
    </div>
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