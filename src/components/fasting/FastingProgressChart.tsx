import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { DailyFastingLog } from "@/hooks/useExtendedFasting";

interface FastingProgressChartProps {
  dailyLogs: DailyFastingLog[];
  startWeight?: number;
}

export function FastingProgressChart({ dailyLogs, startWeight }: FastingProgressChartProps) {
  const chartData = useMemo(() => {
    return dailyLogs.map(log => ({
      day: `Tag ${log.day}`,
      dayNum: log.day,
      ketones: log.ketones_mmol || null,
      weight: log.weight_kg || null,
      glucose: log.glucose_mg_dl || null,
      energy: log.energy,
      mood: log.mood,
      hunger: log.hunger,
    })).sort((a, b) => a.dayNum - b.dayNum);
  }, [dailyLogs]);

  const maxKetones = useMemo(() => {
    const values = dailyLogs.map(l => l.ketones_mmol).filter(Boolean) as number[];
    return Math.max(...values, 0);
  }, [dailyLogs]);

  const weightChange = useMemo(() => {
    const weights = dailyLogs.map(l => l.weight_kg).filter(Boolean) as number[];
    if (weights.length < 2) return null;
    
    const first = startWeight || weights[0];
    const last = weights[weights.length - 1];
    return (last - first).toFixed(1);
  }, [dailyLogs, startWeight]);

  if (dailyLogs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          <p>Noch keine Daten vorhanden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5" />
            Verlauf
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Ketone: {maxKetones.toFixed(1)} max</span>
            </div>
            {weightChange && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Gewicht: {parseFloat(weightChange) > 0 ? '+' : ''}{weightChange} kg</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="ketones"
                orientation="left"
                domain={[0, 'auto']}
                tick={{ fontSize: 12 }}
                label={{ value: 'mmol/L', angle: -90, position: 'insideLeft', fontSize: 10 }}
                className="text-yellow-500"
              />
              <YAxis 
                yAxisId="weight"
                orientation="right"
                domain={['dataMin - 2', 'dataMax + 1']}
                tick={{ fontSize: 12 }}
                label={{ value: 'kg', angle: 90, position: 'insideRight', fontSize: 10 }}
                className="text-blue-500"
              />
              
              {/* Ketosis threshold */}
              <ReferenceLine 
                y={0.5} 
                yAxisId="ketones"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{ value: 'Ketose', position: 'right', fontSize: 10 }}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number | null, name: string) => {
                  if (value === null) return ['-', name];
                  const labels: Record<string, string> = {
                    ketones: 'Ketone',
                    weight: 'Gewicht',
                    glucose: 'Glukose',
                    energy: 'Energie',
                    mood: 'Stimmung',
                    hunger: 'Hunger',
                  };
                  const units: Record<string, string> = {
                    ketones: ' mmol/L',
                    weight: ' kg',
                    glucose: ' mg/dL',
                    energy: '/10',
                    mood: '/10',
                    hunger: '/10',
                  };
                  return [`${value}${units[name] || ''}`, labels[name] || name];
                }}
              />
              
              <Line
                yAxisId="ketones"
                type="monotone"
                dataKey="ketones"
                stroke="#eab308"
                strokeWidth={2}
                dot={{ fill: '#eab308', r: 4 }}
                connectNulls
              />
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
