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
import { PeptidesWidget } from './PeptidesWidget';

interface WidgetRendererProps {
  config: WidgetConfig;
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;
  onOpenBodySheet?: () => void;
  onOpenPeptidesSheet?: () => void;
  onOpenTrainingSheet?: () => void;
  onOpenSupplementsSheet?: () => void;
  onOpenSleepSheet?: () => void;
  onOpenBioAgeSheet?: () => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ 
  config, 
  onOpenNutritionSheet,
  onOpenHydrationSheet,
  onOpenBodySheet,
  onOpenPeptidesSheet,
  onOpenTrainingSheet,
  onOpenSupplementsSheet,
  onOpenSleepSheet,
  onOpenBioAgeSheet
}) => {
  const { type, size } = config;

  switch (type) {
    case 'nutrition':
      return <NutritionWidget size={size} onOpenDaySheet={onOpenNutritionSheet} />;
    case 'hydration':
      return <HydrationWidget size={size} onOpenDaySheet={onOpenHydrationSheet} />;
    case 'sleep':
      return <SleepWidget size={size} onOpenSheet={onOpenSleepSheet} />;
    case 'protocol':
      return <ProtocolWidget size={size} />;
    case 'training':
      return <TrainingWidget size={size} onOpenSheet={onOpenTrainingSheet} />;
    case 'weight':
      return <WeightWidget size={size} onOpenDaySheet={onOpenBodySheet} />;
    case 'hrv':
      return <HRVWidget size={size} />;
    case 'supplements':
      return <SupplementsWidget size={size} onOpenSheet={onOpenSupplementsSheet} />;
    case 'bio_age':
      return <BioAgeWidget size={size} onOpenSheet={onOpenBioAgeSheet} />;
    case 'peptides':
      return <PeptidesWidget size={size} onOpenSheet={onOpenPeptidesSheet} />;
    default:
      return null;
  }
};
