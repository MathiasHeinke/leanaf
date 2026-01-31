import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MacroData {
  date: string;
  displayDate: string;
  protein: number;
  carbs: number;
  fats: number;
}

interface MacroStackedChartProps {
  data: MacroData[];
}

interface MacroSummary {
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  proteinTrend: number;
  carbsTrend: number;
  fatsTrend: number;
}

const TrendIndicator = ({ value }: { value: number }) => {
  if (Math.abs(value) < 3) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        <Minus className="h-3 w-3" />
        stabil
      </span>
    );
  }
  if (value > 0) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
        <TrendingUp className="h-3 w-3" />
        +{Math.round(value)}%
      </span>
    );
  }
  return (
    <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-0.5">
      <TrendingDown className="h-3 w-3" />
      {Math.round(value)}%
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--protein))]" />
            <span>Protein: {Math.round(payload[2]?.value || 0)}g</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--carbs))]" />
            <span>Kohlenhydrate: {Math.round(payload[1]?.value || 0)}g</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--fats))]" />
            <span>Fette: {Math.round(payload[0]?.value || 0)}g</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const MacroStackedChart = ({ data }: MacroStackedChartProps) => {
  const chartData = useMemo(() => {
    return data.map((day) => ({
      ...day,
      Protein: day.protein,
      Kohlenhydrate: day.carbs,
      Fette: day.fats,
    }));
  }, [data]);

  const summary: MacroSummary = useMemo(() => {
    if (data.length === 0) {
      return {
        avgProtein: 0,
        avgCarbs: 0,
        avgFats: 0,
        proteinTrend: 0,
        carbsTrend: 0,
        fatsTrend: 0,
      };
    }

    // Calculate averages
    const avgProtein = Math.round(
      data.reduce((sum, d) => sum + d.protein, 0) / data.length
    );
    const avgCarbs = Math.round(
      data.reduce((sum, d) => sum + d.carbs, 0) / data.length
    );
    const avgFats = Math.round(
      data.reduce((sum, d) => sum + d.fats, 0) / data.length
    );

    // Calculate trends (last 3 days vs previous 3 days)
    if (data.length >= 6) {
      const recent3 = data.slice(-3);
      const prev3 = data.slice(-6, -3);

      const recentProtein = recent3.reduce((sum, d) => sum + d.protein, 0) / 3;
      const prevProtein = prev3.reduce((sum, d) => sum + d.protein, 0) / 3;
      const proteinTrend = prevProtein > 0 
        ? ((recentProtein - prevProtein) / prevProtein) * 100 
        : 0;

      const recentCarbs = recent3.reduce((sum, d) => sum + d.carbs, 0) / 3;
      const prevCarbs = prev3.reduce((sum, d) => sum + d.carbs, 0) / 3;
      const carbsTrend = prevCarbs > 0 
        ? ((recentCarbs - prevCarbs) / prevCarbs) * 100 
        : 0;

      const recentFats = recent3.reduce((sum, d) => sum + d.fats, 0) / 3;
      const prevFats = prev3.reduce((sum, d) => sum + d.fats, 0) / 3;
      const fatsTrend = prevFats > 0 
        ? ((recentFats - prevFats) / prevFats) * 100 
        : 0;

      return { avgProtein, avgCarbs, avgFats, proteinTrend, carbsTrend, fatsTrend };
    }

    return { avgProtein, avgCarbs, avgFats, proteinTrend: 0, carbsTrend: 0, fatsTrend: 0 };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-gradient-to-r from-background to-accent/10 p-5 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Makro-Verteilung</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>Keine Daten verfügbar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-background to-accent/10 p-5 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Makro-Verteilung</h3>
      
      {/* Stacked Area Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="proteinGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--protein))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--protein))" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="carbsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--carbs))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--carbs))" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="fatsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--fats))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--fats))" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="displayDate" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Fette"
              stackId="1"
              stroke="hsl(var(--fats))"
              fill="url(#fatsGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Kohlenhydrate"
              stackId="1"
              stroke="hsl(var(--carbs))"
              fill="url(#carbsGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Protein"
              stackId="1"
              stroke="hsl(var(--protein))"
              fill="url(#proteinGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--protein))]" />
            <span className="text-xs text-muted-foreground">Protein</span>
          </div>
          <div className="text-lg font-bold">Ø {summary.avgProtein}g</div>
          <TrendIndicator value={summary.proteinTrend} />
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--carbs))]" />
            <span className="text-xs text-muted-foreground">Carbs</span>
          </div>
          <div className="text-lg font-bold">Ø {summary.avgCarbs}g</div>
          <TrendIndicator value={summary.carbsTrend} />
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--fats))]" />
            <span className="text-xs text-muted-foreground">Fette</span>
          </div>
          <div className="text-lg font-bold">Ø {summary.avgFats}g</div>
          <TrendIndicator value={summary.fatsTrend} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[hsl(var(--protein))]" />
          <span>Protein</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[hsl(var(--carbs))]" />
          <span>Kohlenhydrate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[hsl(var(--fats))]" />
          <span>Fette</span>
        </div>
      </div>
    </div>
  );
};
