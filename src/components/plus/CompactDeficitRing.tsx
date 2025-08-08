import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';

interface CompactDeficitRingProps {
  data: UsePlusDataResult;
}

export const CompactDeficitRing: React.FC<CompactDeficitRingProps> = ({ data }) => {
  const { percent, status } = useMemo(() => {
    if (!data.goals?.calories || data.loading) {
      return { 
        percent: 0, 
        status: 'secondary' as const
      };
    }
    
    const remaining = data.remainingKcal || 0;
    const consumed = (data.goals.calories - remaining);
    const pct = Math.min(100, (consumed / data.goals.calories) * 100);
    
    let statusVariant: 'destructive' | 'secondary' | 'default' = 'default';
    if (remaining > 300) statusVariant = 'destructive';
    else if (remaining > 100) statusVariant = 'secondary';
    
    return { 
      percent: pct, 
      status: statusVariant
    };
  }, [data]);

  if (data.loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const circumference = 2 * Math.PI * 28;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="text-primary transition-all duration-300"
                />
              </svg>
              <Target className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
            </div>
            
            <div>
              <div className="text-lg font-bold">
                {Math.round(data.remainingKcal || 0)} kcal
              </div>
              <div className="text-xs text-muted-foreground">
                verbleibend
              </div>
            </div>
          </div>
          
          <Badge variant={status} className="text-xs">
            {status === 'destructive' ? 'Zu wenig' : 
             status === 'secondary' ? 'Noch Luft' : 'Ziel erreicht'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};