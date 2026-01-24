import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRetaMicro } from "@/hooks/useRetaMicro";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

const TARGET_INTERVAL = 12;
const MIN_INTERVAL = 10;
const MAX_INTERVAL = 14;

export function RetaMicroIntervalChart() {
  const { logs, loading, getAverageInterval } = useRetaMicro();

  const chartData = useMemo(() => {
    if (logs.length < 2) return [];

    const intervals: Array<{
      date: string;
      interval: number;
      inRange: boolean;
    }> = [];

    for (let i = 0; i < logs.length - 1 && i < 10; i++) {
      const current = logs[i];
      const previous = logs[i + 1];

      if (current.injected_at && previous.injected_at) {
        const interval = differenceInDays(
          new Date(current.injected_at),
          new Date(previous.injected_at)
        );

        intervals.push({
          date: format(new Date(current.injected_at), 'dd.MM', { locale: de }),
          interval,
          inRange: interval >= MIN_INTERVAL && interval <= MAX_INTERVAL,
        });
      }
    }

    return intervals.reverse();
  }, [logs]);

  const avgInterval = getAverageInterval();
  const isAvgInRange = avgInterval >= MIN_INTERVAL && avgInterval <= MAX_INTERVAL;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">Lade...</div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Mindestens 2 Dosen für Intervall-Analyse benötigt
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
            <BarChart3 className="w-4 h-4" />
            Dosier-Intervalle
          </CardTitle>
          <Badge
            variant="outline"
            className={isAvgInRange ? 'text-green-600 border-green-600/50' : 'text-amber-600 border-amber-600/50'}
          >
            Ø {avgInterval.toFixed(1)} Tage
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                domain={[0, 'dataMax + 5']}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
                      <p className="font-medium">{data.date}</p>
                      <p>
                        Intervall: <span className="font-medium">{data.interval} Tage</span>
                      </p>
                      <p className={data.inRange ? 'text-green-600' : 'text-amber-600'}>
                        {data.inRange ? '✓ Im Zielbereich' : '⚠ Außerhalb Zielbereich'}
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={TARGET_INTERVAL}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                label={{
                  value: 'Ziel: 12d',
                  position: 'right',
                  fontSize: 10,
                  fill: 'hsl(var(--primary))',
                }}
              />
              <Bar dataKey="interval" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.inRange ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                    opacity={entry.inRange ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-primary" /> Im Zielbereich (10-14d)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-muted-foreground opacity-50" /> Außerhalb
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
