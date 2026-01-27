import React from 'react';
import { Label } from '@/components/ui/label';
import { CheckCircle, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingFrequencySelectorProps {
  value: number;
  onChange: (sessions: number) => void;
}

const frequencyOptions = [
  { value: 0, label: '0', description: 'Kein Training' },
  { value: 2, label: '1-2', description: 'Leicht' },
  { value: 4, label: '3-4', description: 'Moderat' },
  { value: 6, label: '5+', description: 'Intensiv' },
];

export const TrainingFrequencySelector: React.FC<TrainingFrequencySelectorProps> = ({
  value,
  onChange,
}) => {
  // Map value to closest option
  const getSelectedOption = () => {
    if (value <= 0) return 0;
    if (value <= 2) return 2;
    if (value <= 4) return 4;
    return 6;
  };

  const selectedOption = getSelectedOption();

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm">
        <Dumbbell className="h-4 w-4 text-primary" />
        Trainingsfrequenz (pro Woche)
      </Label>
      <div className="grid grid-cols-4 gap-2">
        {frequencyOptions.map((option) => {
          const isSelected = selectedOption === option.value;
          return (
            <div
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'relative flex flex-col items-center p-2.5 rounded-xl border-2 cursor-pointer transition-all',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className={cn('font-bold text-base', isSelected && 'text-primary')}>
                {option.label}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {option.description}
              </div>
              {isSelected && (
                <CheckCircle className="absolute top-1 right-1 h-3.5 w-3.5 text-primary" />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Verbessert die TDEE-Berechnung zusammen mit dem Aktivitätslevel
      </p>
    </div>
  );
};

export default TrainingFrequencySelector;
