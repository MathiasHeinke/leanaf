import React from 'react';
import { SmartCard } from './SmartCard';

interface TrainingDay {
  day: string;
  focus: string;
  exercises?: Array<{
    name: string;
    sets: string;
    rpe?: string;
    load?: string;
  }>;
}

interface TrainingPlanCardProps {
  plan: TrainingDay[];
  onConfirm?: () => void;
  onReject?: () => void;
}

export const TrainingPlanCard = ({ 
  plan, 
  onConfirm, 
  onReject 
}: TrainingPlanCardProps) => {
  const actions = [];
  
  if (onConfirm) {
    actions.push({
      label: '✔︎ Plan übernehmen',
      variant: 'confirm' as const,
      onClick: onConfirm
    });
  }
  
  if (onReject) {
    actions.push({
      label: '✕ Verwerfen',
      variant: 'reject' as const,
      onClick: onReject
    });
  }

  return (
    <SmartCard
      tool="plan"
      icon="🏋️"
      title="Trainingsplan"
      actions={actions}
      defaultCollapsed={true}
    >
      <div className="space-y-3">
        {plan.slice(0, 3).map((day, index) => (
          <div key={index} className="border-b pb-2 last:border-b-0">
            <div className="font-medium text-sm">
              {day.day}: {day.focus}
            </div>
            {day.exercises && (
              <div className="mt-1 space-y-1">
                {day.exercises.slice(0, 2).map((exercise, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground pl-2">
                    {exercise.name} - {exercise.sets}
                    {exercise.rpe && ` @ RPE ${exercise.rpe}`}
                  </div>
                ))}
                {day.exercises.length > 2 && (
                  <div className="text-xs text-muted-foreground pl-2">
                    +{day.exercises.length - 2} weitere Übungen
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {plan.length > 3 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            +{plan.length - 3} weitere Trainingstage
          </div>
        )}
      </div>
    </SmartCard>
  );
};