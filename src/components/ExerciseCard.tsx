import React from 'react';
import { SmartCard } from './SmartCard';
import { Play } from 'lucide-react';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  rpe?: number;
  instructions?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onConfirm?: () => void;
  onReject?: () => void;
  onPlayVideo?: () => void;
}

export const ExerciseCard = ({ 
  exercise, 
  onConfirm, 
  onReject,
  onPlayVideo 
}: ExerciseCardProps) => {
  const actions = [];
  
  if (onConfirm) {
    actions.push({
      label: '✔︎ Hinzufügen',
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

  return (
    <SmartCard
      tool="exercise"
      icon="💪"
      title="Übung"
      actions={actions}
      defaultCollapsed={true}
    >
      <div className="space-y-3">
        {(exercise.videoUrl || exercise.thumbnailUrl) && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            {exercise.thumbnailUrl && (
              <img 
                src={exercise.thumbnailUrl} 
                alt={exercise.name}
                className="w-full h-full object-cover"
              />
            )}
            {exercise.videoUrl && (
              <button
                onClick={onPlayVideo}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              >
                <Play className="w-8 h-8 text-white" />
              </button>
            )}
          </div>
        )}
        
        <div>
          <h4 className="font-medium text-sm mb-2">{exercise.name}</h4>
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Sätze:</span>
              <span className="ml-1 font-medium">{exercise.sets}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Wdh:</span>
              <span className="ml-1 font-medium">{exercise.reps}</span>
            </div>
            {exercise.weight && (
              <div>
                <span className="text-muted-foreground">Gewicht:</span>
                <span className="ml-1 font-medium">{exercise.weight}kg</span>
              </div>
            )}
            {exercise.rpe && (
              <div>
                <span className="text-muted-foreground">RPE:</span>
                <span className="ml-1 font-medium">{exercise.rpe}</span>
              </div>
            )}
          </div>
        </div>

        {exercise.instructions && exercise.instructions.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Ausführung:</p>
            <ul className="text-xs space-y-1">
              {exercise.instructions.slice(0, 2).map((instruction, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
              {exercise.instructions.length > 2 && (
                <li className="text-muted-foreground italic">
                  +{exercise.instructions.length - 2} weitere Schritte...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </SmartCard>
  );
};