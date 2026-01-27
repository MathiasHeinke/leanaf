import { Dumbbell, Moon, Droplets, Activity, Scale, Utensils, Pill, Brain, Heart } from 'lucide-react';
import React from 'react';

export type WidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'flat';

export type WidgetType = 
  | 'protocol' 
  | 'training' 
  | 'sleep' 
  | 'hydration' 
  | 'nutrition' 
  | 'weight' 
  | 'hrv' 
  | 'supplements' 
  | 'bio_age';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  enabled: boolean;
  order: number;
}

export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  description: string;
  availableSizes: WidgetSize[];
  defaultSize: WidgetSize;
  icon: React.ComponentType<{ className?: string }>;
}

// Widget Registry mit allen verfügbaren Widgets
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { 
    type: 'nutrition', 
    label: 'Ernährung', 
    description: 'Kalorien & Makros', 
    availableSizes: ['flat', 'medium', 'wide', 'large'], 
    defaultSize: 'wide', 
    icon: Utensils 
  },
  { 
    type: 'hydration', 
    label: 'Wasser', 
    description: 'Hydration Tracking', 
    availableSizes: ['small', 'medium', 'flat'], 
    defaultSize: 'flat', 
    icon: Droplets 
  },
  { 
    type: 'protocol', 
    label: 'ARES Protokoll', 
    description: 'Phase & Fortschritt', 
    availableSizes: ['small', 'medium', 'large', 'wide', 'flat'], 
    defaultSize: 'flat', 
    icon: Brain 
  },
  { 
    type: 'training', 
    label: 'Training', 
    description: 'Workouts pro Woche', 
    availableSizes: ['small', 'medium', 'large', 'wide', 'flat'], 
    defaultSize: 'medium', 
    icon: Dumbbell 
  },
  { 
    type: 'sleep', 
    label: 'Schlaf', 
    description: 'Schlafdauer & Qualität', 
    availableSizes: ['small', 'medium', 'large', 'flat'], 
    defaultSize: 'medium', 
    icon: Moon 
  },
  { 
    type: 'weight', 
    label: 'Gewicht', 
    description: 'Aktuelles Gewicht', 
    availableSizes: ['small', 'medium', 'large', 'wide', 'flat'], 
    defaultSize: 'small', 
    icon: Scale 
  },
  { 
    type: 'hrv', 
    label: 'HRV', 
    description: 'Herzratenvariabilität', 
    availableSizes: ['small', 'medium', 'large', 'wide', 'flat'], 
    defaultSize: 'small', 
    icon: Activity 
  },
  { 
    type: 'supplements', 
    label: 'Supplements', 
    description: 'Einnahme heute', 
    availableSizes: ['small', 'medium', 'large', 'wide', 'flat'], 
    defaultSize: 'small', 
    icon: Pill 
  },
  { 
    type: 'bio_age', 
    label: 'Bio-Alter', 
    description: 'Biologisches Alter', 
    availableSizes: ['small', 'medium', 'large', 'wide', 'flat'], 
    defaultSize: 'small', 
    icon: Heart 
  },
];

// Default widget configuration
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: '3', type: 'protocol', size: 'flat', enabled: true, order: 0 },
  { id: '1', type: 'nutrition', size: 'wide', enabled: true, order: 1 },
  { id: '2', type: 'hydration', size: 'flat', enabled: true, order: 2 },
  { id: '4', type: 'training', size: 'medium', enabled: true, order: 3 },
  { id: '5', type: 'sleep', size: 'medium', enabled: true, order: 4 },
  { id: '6', type: 'weight', size: 'small', enabled: true, order: 5 },
  { id: '7', type: 'hrv', size: 'small', enabled: false, order: 6 },
  { id: '8', type: 'supplements', size: 'small', enabled: false, order: 7 },
  { id: '9', type: 'bio_age', size: 'small', enabled: false, order: 8 },
];
