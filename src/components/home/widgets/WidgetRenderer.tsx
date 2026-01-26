import React from 'react';
import { WidgetConfig } from '@/types/widgets';
import { NutritionWidget } from './NutritionWidget';
import { HydrationWidget } from './HydrationWidget';
import { SleepWidget } from './SleepWidget';
import { ProtocolWidget } from './ProtocolWidget';
import { TrainingWidget } from './TrainingWidget';
import { WeightWidget } from './WeightWidget';
import { HRVWidget } from './HRVWidget';
import { SupplementsWidget } from './SupplementsWidget';
import { BioAgeWidget } from './BioAgeWidget';

interface WidgetRendererProps {
  config: WidgetConfig;
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;
  onOpenBodySheet?: () => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ 
  config, 
  onOpenNutritionSheet,
  onOpenHydrationSheet,
  onOpenBodySheet
}) => {
  const { type, size } = config;

  switch (type) {
    case 'nutrition':
      return <NutritionWidget size={size} onOpenDaySheet={onOpenNutritionSheet} />;
    case 'hydration':
      return <HydrationWidget size={size} onOpenDaySheet={onOpenHydrationSheet} />;
    case 'sleep':
      return <SleepWidget size={size} />;
    case 'protocol':
      return <ProtocolWidget size={size} />;
    case 'training':
      return <TrainingWidget size={size} />;
    case 'weight':
      return <WeightWidget size={size} onOpenDaySheet={onOpenBodySheet} />;
    case 'hrv':
      return <HRVWidget size={size} />;
    case 'supplements':
      return <SupplementsWidget size={size} />;
    case 'bio_age':
      return <BioAgeWidget size={size} />;
    default:
      return null;
  }
};
