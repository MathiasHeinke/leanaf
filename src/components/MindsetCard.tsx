import React from 'react';
import { SmartCard } from './SmartCard';
import { Heart, Brain } from 'lucide-react';

interface MindsetReflection {
  sentiment: 'positive' | 'neutral' | 'negative';
  quote: string;
  author?: string;
  reflection?: string;
  breathingExercise?: {
    name: string;
    duration: number;
    instructions: string;
  };
}

interface MindsetCardProps {
  mindset: MindsetReflection;
  onConfirm?: () => void;
  onReject?: () => void;
  onStartBreathing?: () => void;
}

export const MindsetCard = ({ 
  mindset, 
  onConfirm, 
  onReject,
  onStartBreathing 
}: MindsetCardProps) => {
  const actions = [];
  
  if (onConfirm) {
    actions.push({
      label: '✔︎ Speichern',
      variant: 'confirm' as const,
      onClick: onConfirm
    });
  }
  
  if (onReject) {
    actions.push({
      label: '✕ Überspringen',
      variant: 'reject' as const,
      onClick: onReject
    });
  }

  const getSentimentEmoji = () => {
    switch (mindset.sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      default: return '😐';
    }
  };

  const getSentimentColor = () => {
    switch (mindset.sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <SmartCard
      tool="mindset"
      icon="🧠"
      title="Mindset-Journal"
      actions={actions}
      defaultCollapsed={true}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getSentimentEmoji()}</span>
          <span className={`text-xs font-medium ${getSentimentColor()}`}>
            {mindset.sentiment === 'positive' ? 'Positiv' : 
             mindset.sentiment === 'negative' ? 'Herausfordernd' : 'Neutral'}
          </span>
        </div>
        
        <blockquote className="border-l-2 border-primary pl-3 py-1">
          <p className="text-sm italic text-foreground">"{mindset.quote}"</p>
          {mindset.author && (
            <cite className="text-xs text-muted-foreground mt-1 block">
              — {mindset.author}
            </cite>
          )}
        </blockquote>

        {mindset.reflection && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1 mb-2">
              <Heart className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium">Reflektion</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mindset.reflection}
            </p>
          </div>
        )}

        {mindset.breathingExercise && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium">{mindset.breathingExercise.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {mindset.breathingExercise.duration} Min
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {mindset.breathingExercise.instructions}
            </p>
            {onStartBreathing && (
              <button
                onClick={onStartBreathing}
                className="w-full text-xs py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center justify-center gap-1"
              >
                <Brain className="w-3 h-3" />
                Atemübung starten
              </button>
            )}
          </div>
        )}
      </div>
    </SmartCard>
  );
};