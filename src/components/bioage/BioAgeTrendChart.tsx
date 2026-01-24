import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLongtermBioAge } from "@/hooks/useLongtermBioAge";
import { format, subMonths, isAfter } from "date-fns";
import { de } from "date-fns/locale";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, Calendar } from "lucide-react";

interface BioAgeTrendChartProps {
  chronologicalAge: number;
  monthsToShow?: number;
}

export function BioAgeTrendChart({ chronologicalAge, monthsToShow = 12 }: BioAgeTrendChartProps) {
  const { measurements, loading } = useLongtermBioAge();

  const chartData = useMemo(() => {
    const cutoffDate = subMonths(new Date(), monthsToShow);
    
    return measurements
      .filter((m) => m.measured_at && isAfter(new Date(m.measured_at), cutoffDate))
      .sort((a, b) => new Date(a.measured_at!).getTime() - new Date(b.measured_at!).getTime())
      .map((m) => ({
        date: format(new Date(m.measured_at!), 'MMM yy', { locale: de }),
        fullDate: format(new Date(m.measured_at!), 'dd. MMM yyyy', { locale: de }),
        bioAge: m.biological_age,
        chronoAge: m.chronological_age_years,
        difference: m.age_difference,
        pace: m.dunedin_pace,
      }));
  }, [measurements, monthsToShow]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].bioAge;
    const last = chartData[chartData.length - 1].bioAge;
    const diff = last - first;
    return {
      direction: diff < -0.5 ? 'down' : diff > 0.5 ? 'up' : 'stable',
      value: Math.abs(diff).toFixed(1),
    };
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Lade Trend-Daten...</div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Noch keine Trend-Daten</h3>
          <p className="text-sm text-muted-foreground">
            Füge deine erste Bio-Age Messung hinzu, um Trends zu sehen
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Bio-Age Trend ({monthsToShow} Monate)
          </CardTitle>
          {trend && (
            <Badge
              variant="outline"
              className={
                trend.direction === 'down'
                  ? 'text-green-600 border-green-600/50'
                  : trend.direction === 'up'
                  ? 'text-red-600 border-red-600/50'
                  : 'text-muted-foreground'
              }
            >
              {trend.direction === 'down' ? (
                <TrendingDown className="w-3 h-3 mr-1" />
              ) : trend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <Minus className="w-3 h-3 mr-1" />
              )}
              {trend.direction === 'down' ? '-' : trend.direction === 'up' ? '+' : ''}
              {trend.value} Jahre
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bioAgeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium mb-1">{data.fullDate}</p>
                      <div className="space-y-1">
                        <p>
                          Bio-Age: <span className="font-medium">{data.bioAge} Jahre</span>
                        </p>
                        <p>
                          Chrono-Age: <span className="font-medium">{data.chronoAge} Jahre</span>
                        </p>
                        <p className={data.difference < 0 ? 'text-green-600' : 'text-red-600'}>
                          Differenz: {data.difference > 0 ? '+' : ''}
                          {data.difference} Jahre
                        </p>
                        {data.pace && (
                          <p className="text-muted-foreground">
                            PACE: {data.pace.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={chronologicalAge}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{
                  value: `Chrono: ${chronologicalAge}`,
                  position: 'right',
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))',
                }}
              />
              <Area
                type="monotone"
                dataKey="bioAge"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#bioAgeGradient)"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Gestrichelte Linie = Chronologisches Alter ({chronologicalAge})
        </p>
      </CardContent>
    </Card>
  );
}
