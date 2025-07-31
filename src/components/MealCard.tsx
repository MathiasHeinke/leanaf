import React from 'react';
import { SmartCard } from './SmartCard';

interface MealAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image?: string;
  portionSize?: number;
}

interface MealCardProps {
  meal: MealAnalysis;
  onConfirm?: () => void;
  onReject?: () => void;
  onPortionChange?: (size: number) => void;
}

export const MealCard = ({ 
  meal, 
  onConfirm, 
  onReject,
  onPortionChange 
}: MealCardProps) => {
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
      label: '✕ Verwerfen',
      variant: 'reject' as const,
      onClick: onReject
    });
  }

  return (
    <SmartCard
      tool="meal"
      icon="🍽️"
      title="Mahlzeit-Analyse"
      actions={actions}
      defaultCollapsed={true}
    >
      <div className="space-y-3">
        {meal.image && (
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <img 
              src={meal.image} 
              alt={meal.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div>
          <h4 className="font-medium text-sm mb-2">{meal.name}</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-primary">{meal.calories}</div>
              <div className="text-muted-foreground">kcal</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{meal.protein}g</div>
              <div className="text-muted-foreground">Protein</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-600">{meal.carbs}g</div>
              <div className="text-muted-foreground">Kohlenhydrate</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-yellow-600">{meal.fats}g</div>
              <div className="text-muted-foreground">Fett</div>
            </div>
          </div>
        </div>

        {onPortionChange && (
          <div className="pt-2 border-t">
            <label className="text-xs text-muted-foreground block mb-1">
              Portionsgröße: {meal.portionSize || 100}%
            </label>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={meal.portionSize || 100}
              onChange={(e) => onPortionChange(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>
    </SmartCard>
  );
};