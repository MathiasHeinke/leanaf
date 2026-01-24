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
  ReferenceLine
} from "recharts";
import { format, subDays, eachDayOfInterval, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

interface ComplianceDataPoint {
  date: string;
  compliance: number;
  total: number;
  taken: number;
}

interface MaintenanceComplianceChartProps {
  intakeHistory: Array<{
    date: Date;
    protocolId: string;
  }>;
  activeProtocolCount: number;
}

export function MaintenanceComplianceChart({
  intakeHistory,
  activeProtocolCount
}: MaintenanceComplianceChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    return days.map((day): ComplianceDataPoint => {
      // Unique protocols taken on this day
      const uniqueProtocolsTaken = new Set(
        intakeHistory
          .filter(h => isSameDay(h.date, day))
          .map(h => h.protocolId)
      ).size;

      const compliance = activeProtocolCount > 0
        ? Math.round((uniqueProtocolsTaken / activeProtocolCount) * 100)
        : 100;

      return {
        date: format(day, 'dd.MM', { locale: de }),
        compliance,
        total: activeProtocolCount,
        taken: uniqueProtocolsTaken,
      };
    });
  }, [intakeHistory, activeProtocolCount]);

  const averageCompliance = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.compliance, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Compliance (30 Tage)
          </CardTitle>
          <span className="text-2xl font-bold text-primary">
            {averageCompliance}%
            <span className="text-sm font-normal text-muted-foreground ml-1">Ø</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as ComplianceDataPoint;
                return (
                  <div className="bg-popover border rounded-lg p-2 shadow-lg text-sm">
                    <p className="font-medium">{data.date}</p>
                    <p className="text-muted-foreground">
                      {data.taken}/{data.total} Protokolle
                    </p>
                    <p className="text-primary font-medium">
                      {data.compliance}% Compliance
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={80}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              label={{ value: '80%', position: 'right', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="compliance"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span>Compliance</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" />
            <span>80% Ziel</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
