import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailySummaryData, DailySummaryData } from '@/hooks/useDailySummaryData';
import { PremiumGate } from '@/components/PremiumGate';
import { Activity, Apple, Droplets, Moon, Dumbbell, Target } from 'lucide-react';

interface DailySummaryChartsProps {
  timeRange?: 7 | 14 | 30;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// Custom colors for charts
const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  protein: 'hsl(221, 83%, 53%)',
  carbs: 'hsl(142, 76%, 36%)', 
  fats: 'hsl(25, 95%, 53%)',
  workout: 'hsl(262, 83%, 58%)',
  sleep: 'hsl(173, 58%, 39%)',
  hydration: 'hsl(203, 89%, 53%)'
};

const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

const CaloriesTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-3 h-0.5 bg-primary"></div>
        <span className="text-sm">Kalorien: <span className="font-medium">{payload[0]?.value} kcal</span></span>
      </div>
    </div>
  );
};

const MacroTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-0.5" style={{ backgroundColor: entry.color }}></div>
            <span className="text-sm">{entry.dataKey}: <span className="font-medium">{entry.value}g</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkoutTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0]?.payload;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[hsl(262,83%,58%)]"></div>
          <span className="text-sm">Volumen: <span className="font-medium">{data?.workoutVolume} kg</span></span>
        </div>
        {data?.workoutMuscleGroups?.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-muted-foreground">Muskelgruppen:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.workoutMuscleGroups.slice(0, 3).map((group: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{group}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DailySummaryCharts: React.FC<DailySummaryChartsProps> = ({ timeRange = 14 }) => {
  const { data, loading, error } = useDailySummaryData(timeRange);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Fehler beim Laden der Daten: {typeof error === 'string' ? error : (error as any)?.message ?? JSON.stringify(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Keine Daily Summary Daten für den gewählten Zeitraum verfügbar.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Tipp: Daily Summaries werden automatisch erstellt, sobald du Daten trackst.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = data.map(day => ({
    date: day.displayDate,
    calories: day.totalCalories,
    protein: day.totalProtein,
    carbs: day.totalCarbs,
    fats: day.totalFats,
    workoutVolume: day.workoutVolume,
    workoutMuscleGroups: day.workoutMuscleGroups,
    sleepScore: day.sleepScore,
    hydrationScore: day.hydrationScore
  }));

  // Calculate averages for KPI cards
  const avgCalories = Math.round(data.reduce((sum, day) => sum + day.totalCalories, 0) / data.length);
  const avgProtein = Math.round(data.reduce((sum, day) => sum + day.totalProtein, 0) / data.length);
  const avgWorkoutVolume = Math.round(data.reduce((sum, day) => sum + day.workoutVolume, 0) / data.length);
  const avgSleepScore = Math.round(data.reduce((sum, day) => sum + day.sleepScore, 0) / data.length);
  const avgHydrationScore = Math.round(data.reduce((sum, day) => sum + day.hydrationScore, 0) / data.length);

  // Macro distribution for pie chart (average across all days)
  const totalMacros = data.reduce((acc, day) => ({
    protein: acc.protein + day.totalProtein,
    carbs: acc.carbs + day.totalCarbs,
    fats: acc.fats + day.totalFats
  }), { protein: 0, carbs: 0, fats: 0 });

  const macroData = [
    { name: 'Protein', value: totalMacros.protein, color: CHART_COLORS.protein },
    { name: 'Kohlenhydrate', value: totalMacros.carbs, color: CHART_COLORS.carbs },
    { name: 'Fette', value: totalMacros.fats, color: CHART_COLORS.fats }
  ];

  // Radial chart data for scores
  const scoreData = [
    { name: 'Schlaf', value: avgSleepScore, fill: CHART_COLORS.sleep },
    { name: 'Hydration', value: avgHydrationScore, fill: CHART_COLORS.hydration }
  ];

  return (
    <PremiumGate 
      feature="advanced_charts"
      hideable={true}
      fallbackMessage="Detaillierte Summary-Charts sind ein Premium Feature. Upgrade für tiefere Einblicke in deine täglichen Fortschritte!"
    >
      <div className="space-y-6">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Apple className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{avgCalories}</div>
              <div className="text-xs text-muted-foreground">Ø Kalorien</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 mx-auto mb-2 text-[hsl(221,83%,53%)]" />
              <div className="text-2xl font-bold">{avgProtein}g</div>
              <div className="text-xs text-muted-foreground">Ø Protein</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Dumbbell className="h-6 w-6 mx-auto mb-2 text-[hsl(262,83%,58%)]" />
              <div className="text-2xl font-bold">{avgWorkoutVolume}</div>
              <div className="text-xs text-muted-foreground">Ø Volumen kg</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Moon className="h-6 w-6 mx-auto mb-2 text-[hsl(173,58%,39%)]" />
              <div className="text-2xl font-bold">{avgSleepScore}%</div>
              <div className="text-xs text-muted-foreground">Ø Schlaf</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Droplets className="h-6 w-6 mx-auto mb-2 text-[hsl(203,89%,53%)]" />
              <div className="text-2xl font-bold">{avgHydrationScore}%</div>
              <div className="text-xs text-muted-foreground">Ø Hydration</div>
            </CardContent>
          </Card>
        </div>

        {/* Calories Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5" />
              Kalorien Verlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip content={<CaloriesTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="calories" 
                    stroke={CHART_COLORS.primary}
                    fill="url(#calorieGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Macros Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Makronährstoffe Verlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip content={<MacroTooltip />} />
                  <Bar dataKey="protein" fill={CHART_COLORS.protein} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="carbs" fill={CHART_COLORS.carbs} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="fats" fill={CHART_COLORS.fats} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(221,83%,53%)]"></div>
                <span>Protein</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(142,76%,36%)]"></div>
                <span>Kohlenhydrate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(25,95%,53%)]"></div>
                <span>Fette</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workout Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Training Volumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip content={<WorkoutTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="workoutVolume" 
                    stroke={CHART_COLORS.workout}
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.workout, strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: CHART_COLORS.workout, stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Row: Macro Distribution & Sleep/Hydration Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Macro Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Makroverteilung (Gesamt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value}g`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sleep & Hydration Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Schlaf & Hydration Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={scoreData}>
                    <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[hsl(173,58%,39%)]"></div>
                  <span>Schlaf ({avgSleepScore}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[hsl(203,89%,53%)]"></div>
                  <span>Hydration ({avgHydrationScore}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PremiumGate>
  );
};