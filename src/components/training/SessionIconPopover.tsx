/**
 * SessionIconPopover - Clickable session icon with detail overlay
 * Shows session details on click/tap (mobile) or hover (desktop)
 */

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  TRAINING_TYPE_LABELS, 
  TRAINING_TYPE_ICONS, 
  SPLIT_TYPE_LABELS,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_EMOJIS,
  type TrainingType,
  type SplitType,
  type TrainingSession,
  type CardioType
} from '@/types/training';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SessionData = any;

interface SessionIconPopoverProps {
  session: SessionData;
}

// Helper: Get display label for training type
const getTypeLabel = (session: SessionData): string => {
  const trainingType = session.training_type as TrainingType | null;
  const splitType = session.split_type as SplitType | null;
  const sessionData = session.session_data as Record<string, unknown> | null;
  
  // For Zone2/VO2max, show activity type if available
  if ((trainingType === 'zone2' || trainingType === 'vo2max') && sessionData?.activity) {
    const activity = sessionData.activity as CardioType | 'other';
    if (CARDIO_ACTIVITY_LABELS[activity]) {
      return CARDIO_ACTIVITY_LABELS[activity];
    }
  }
  
  // For strength training, show split type
  if (splitType && SPLIT_TYPE_LABELS[splitType]) {
    return SPLIT_TYPE_LABELS[splitType];
  }
  
  if (trainingType && TRAINING_TYPE_LABELS[trainingType]) {
    return TRAINING_TYPE_LABELS[trainingType];
  }
  
  return 'Training';
};

// Helper: Get icon for training type
const getTypeIcon = (session: SessionData): string => {
  const trainingType = session.training_type as TrainingType | null;
  const sessionData = session.session_data as Record<string, unknown> | null;
  
  // For Zone2/VO2max, show activity emoji if available
  if ((trainingType === 'zone2' || trainingType === 'vo2max') && sessionData?.activity) {
    const activity = sessionData.activity as CardioType | 'other';
    if (CARDIO_ACTIVITY_EMOJIS[activity]) {
      return CARDIO_ACTIVITY_EMOJIS[activity];
    }
  }
  
  if (trainingType && TRAINING_TYPE_ICONS[trainingType]) {
    return TRAINING_TYPE_ICONS[trainingType];
  }
  
  return '🏋️';
};

export const SessionIconPopover: React.FC<SessionIconPopoverProps> = ({ session }) => {
  const typeLabel = getTypeLabel(session);
  const typeIcon = getTypeIcon(session);
  const trainingType = session.training_type as TrainingType | null;
  const splitType = session.split_type as SplitType | null;
  const sessionData = session.session_data as Record<string, unknown> | null;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label={`${typeLabel} Details anzeigen`}
        >
          <span className="text-lg">{typeIcon}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{typeIcon}</span>
          <span className="font-semibold text-foreground">{typeLabel}</span>
        </div>
        
        {/* Metrics */}
        <div className="space-y-1 text-sm text-muted-foreground">
          {/* Training type label if different from display label */}
          {trainingType && TRAINING_TYPE_LABELS[trainingType] && splitType && (
            <div className="flex justify-between">
              <span>Typ:</span>
              <span>{TRAINING_TYPE_LABELS[trainingType]}</span>
            </div>
          )}
          
          {/* Split type for strength training */}
          {splitType && SPLIT_TYPE_LABELS[splitType] && trainingType === 'rpt' && (
            <div className="flex justify-between">
              <span>Split:</span>
              <span>{SPLIT_TYPE_LABELS[splitType]}</span>
            </div>
          )}
          
          {/* Duration */}
          {session.total_duration_minutes && (
            <div className="flex justify-between">
              <span>Dauer:</span>
              <span>{session.total_duration_minutes} min</span>
            </div>
          )}
          
          {/* Volume for strength */}
          {session.total_volume_kg && (
            <div className="flex justify-between">
              <span>Volumen:</span>
              <span>{session.total_volume_kg.toLocaleString('de-DE')} kg</span>
            </div>
          )}
          
          {/* Distance for cardio */}
          {sessionData?.distance_km && (
            <div className="flex justify-between">
              <span>Distanz:</span>
              <span>{(sessionData.distance_km as number).toFixed(1)} km</span>
            </div>
          )}
          
          {/* Sauna temp */}
          {sessionData?.sauna_temp && (
            <div className="flex justify-between">
              <span>Temperatur:</span>
              <span>{sessionData.sauna_temp as number}°C</span>
            </div>
          )}
        </div>
        
        {/* Notes if available */}
        {session.notes && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2 line-clamp-3">
            {session.notes}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SessionIconPopover;
