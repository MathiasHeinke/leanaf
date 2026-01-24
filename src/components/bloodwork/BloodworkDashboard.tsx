// Bloodwork Dashboard Component
// Status overview of all current marker values

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkerStatusBadge, TrendArrow, getStatusBorderClass, getStatusPriority } from './MarkerStatusBadge';
import { BloodworkEntry, MarkerEvaluation, BloodworkTrend, MARKER_CATEGORIES, getMarkerCategory } from './types';
import { useBloodwork } from '@/hooks/useBloodwork';
import { Activity, TrendingUp, AlertTriangle, CheckCircle, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BloodworkDashboardProps {
  entries: BloodworkEntry[];
  onMarkerClick?: (markerKey: string) => void;
}

export function BloodworkDashboard({ entries, onMarkerClick }: BloodworkDashboardProps) {
  const { getLatestEvaluations, detectTrends } = useBloodwork();

  const evaluations = useMemo(() => getLatestEvaluations(), [getLatestEvaluations]);
  const trends = useMemo(() => detectTrends(), [detectTrends]);

  // Create a map of trends by marker
  const trendMap = useMemo(() => {
    const map = new Map<string, BloodworkTrend>();
    trends.forEach(t => map.set(t.markerName, t));
    return map;
  }, [trends]);

  // Group evaluations by category
  const groupedEvaluations = useMemo(() => {
    const groups: Record<string, MarkerEvaluation[]> = {};
    
    evaluations.forEach(eval_ => {
      const category = getMarkerCategory(eval_.markerName) || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(eval_);
    });

    // Sort within each category by status priority
    Object.values(groups).forEach(group => {
      group.sort((a, b) => getStatusPriority(b.status) - getStatusPriority(a.status));
    });

    return groups;
  }, [evaluations]);

  // Calculate summary stats
  const stats = useMemo(() => {
    let optimal = 0, normal = 0, borderline = 0, critical = 0;
    evaluations.forEach(e => {
      switch (e.status) {
        case 'optimal': optimal++; break;
        case 'normal': normal++; break;
        case 'borderline_low':
        case 'borderline_high': borderline++; break;
        case 'low':
        case 'high': critical++; break;
      }
    });
    return { optimal, normal, borderline, critical, total: evaluations.length };
  }, [evaluations]);

  if (entries.length === 0 || evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TestTube className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Keine Blutwerte vorhanden</h3>
          <p className="text-sm text-muted-foreground text-center">
            Trage deinen ersten Bluttest ein, um dein Dashboard zu sehen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Optimal</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.optimal}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Normal</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.normal}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Grenzwertig</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.borderline}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kritisch</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Section */}
      {trends.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Aktuelle Trends
            </CardTitle>
            <CardDescription>
              Veränderungen seit dem letzten Bluttest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trends.slice(0, 8).map(trend => (
                <Badge
                  key={trend.markerName}
                  variant="outline"
                  className={cn(
                    'cursor-pointer hover:bg-muted',
                    trend.direction === 'improving' && 'border-emerald-500/50',
                    trend.direction === 'declining' && 'border-red-500/50'
                  )}
                  onClick={() => onMarkerClick?.(trend.markerName)}
                >
                  {trend.displayName}
                  <TrendArrow 
                    direction={trend.direction} 
                    changePercent={trend.changePercent}
                    className="ml-1"
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marker Grid by Category */}
      {Object.entries(MARKER_CATEGORIES).map(([catKey, category]) => {
        const categoryEvals = groupedEvaluations[catKey];
        if (!categoryEvals || categoryEvals.length === 0) return null;

        return (
          <Card key={catKey}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{category.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryEvals.map(eval_ => {
                  const trend = trendMap.get(eval_.markerName);
                  
                  return (
                    <Card
                      key={eval_.markerName}
                      className={cn(
                        'cursor-pointer hover:bg-muted/50 transition-all hover:scale-[1.02]',
                        getStatusBorderClass(eval_.status)
                      )}
                      onClick={() => onMarkerClick?.(eval_.markerName)}
                    >
                      <div className="p-3">
                        <div className="text-xs text-muted-foreground truncate">
                          {eval_.displayName}
                        </div>
                        <div className="text-lg font-bold mt-0.5">
                          {eval_.value.toFixed(eval_.value % 1 === 0 ? 0 : 1)}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            {eval_.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <MarkerStatusBadge status={eval_.status} size="sm" showIcon={false} />
                          {trend && (
                            <TrendArrow direction={trend.direction} />
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
