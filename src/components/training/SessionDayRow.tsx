/**
 * SessionDayRow - Grouped sessions for one day
 * Shows date, activity icons with popovers, and aggregated totals
 */

import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionIconPopover } from './SessionIconPopover';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SessionData = any;

interface SessionDayRowProps {
  date: string;
  sessions: SessionData[];
  isFirst?: boolean;
  isLast?: boolean;
}

export const SessionDayRow: React.FC<SessionDayRowProps> = ({ 
  date, 
  sessions,
  isFirst = false,
  isLast = false
}) => {
  // Calculate aggregated metrics
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.total_duration_minutes || 0), 0);
  const totalVolumeKg = sessions.reduce((sum, s) => sum + (s.total_volume_kg || 0), 0);
  
  // Format date
  const displayDate = format(new Date(date), 'dd.MM', { locale: de });
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !isLast && "border-b border-border/30"
      )}
    >
      {/* Date */}
      <span className="text-xs text-muted-foreground w-12 font-medium flex-shrink-0">
        {displayDate}
      </span>
      
      {/* Session Icons */}
      <div className="flex gap-1.5 flex-shrink-0">
        {sessions.map((session) => (
          <SessionIconPopover key={session.id} session={session} />
        ))}
      </div>
      
      {/* Spacer */}
      <div className="flex-1 min-w-0" />
      
      {/* Aggregated Metrics */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
        {totalMinutes > 0 && (
          <span>{totalMinutes}min</span>
        )}
        {totalVolumeKg > 0 && (
          <span className="font-semibold text-foreground">
            {totalVolumeKg.toLocaleString('de-DE')}kg
          </span>
        )}
      </div>
      
      {/* Checkmark */}
      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
    </div>
  );
};

export default SessionDayRow;
