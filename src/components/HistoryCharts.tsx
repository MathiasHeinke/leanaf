
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { PremiumGate } from '@/components/PremiumGate';

interface DailyData {
  date: string;
  displayDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: any[];
}

interface WeightEntry {
  date: string;
  weight: number;
  displayDate: string;
}

interface HistoryChartsProps {
  data: DailyData[];
  weightHistory: WeightEntry[];
  timeRange: 'week' | 'month' | 'year';
  loading: boolean;
}

export const HistoryCharts = ({ data, weightHistory, timeRange, loading }: HistoryChartsProps) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Lade Daten...</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data
    .filter(day => day.meals.length > 0)
    .map(day => ({
      date: day.displayDate,
      Kalorien: day.calories,
      Protein: day.protein,
      Kohlenhydrate: day.carbs,
      Fette: day.fats
    }))
    .reverse();

  const weightChartData = weightHistory
    .map(entry => ({
      date: entry.displayDate,
      weight: entry.weight
    }))
    .reverse();

  return (
    <PremiumGate 
      feature="advanced_charts"
      fallbackMessage="Detaillierte Charts und Verlaufsanalysen sind ein Premium Feature. Upgrade für tiefere Einblicke in deine Fortschritte!"
    >
      <div className="space-y-6">
        {/* Calories Line Chart */}
        <div className="bg-gradient-to-r from-background to-accent/10 p-5 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Kalorien Verlauf</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  fontSize={11}
                  angle={timeRange === 'year' ? -45 : 0}
                  textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                  height={timeRange === 'year' ? 60 : 30}
                />
                <YAxis fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Kalorien" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#calorieGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Macros Bar Chart */}
        <div className="bg-gradient-to-r from-background to-accent/10 p-5 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Makros</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  fontSize={11}
                  angle={timeRange === 'year' ? -45 : 0}
                  textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                  height={timeRange === 'year' ? 60 : 30}
                />
                <YAxis fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="Protein" fill="hsl(var(--protein))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Kohlenhydrate" fill="hsl(var(--carbs))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Fette" fill="hsl(var(--fats))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weight Chart */}
        {weightChartData.length > 0 && (
          <div className="bg-gradient-to-r from-background to-accent/10 p-5 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Gewicht</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <defs>
                    <linearGradient id="weightHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={11}
                    angle={timeRange === 'year' ? -45 : 0}
                    textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                    height={timeRange === 'year' ? 60 : 30}
                  />
                  <YAxis 
                    fontSize={11}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value} kg`, 'Gewicht']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(221, 83%, 53%)" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(221, 83%, 53%)', stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </PremiumGate>
  );
};
