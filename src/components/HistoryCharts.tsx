import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
    <div className="space-y-6">
      {/* Calories Line Chart */}
      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Kalorien Verlauf</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                angle={timeRange === 'year' ? -45 : 0}
                textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                height={timeRange === 'year' ? 60 : 30}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="Kalorien" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macros Bar Chart */}
      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Makronährstoffe</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                angle={timeRange === 'year' ? -45 : 0}
                textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                height={timeRange === 'year' ? 60 : 30}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="Protein" fill="hsl(var(--chart-1))" />
              <Bar dataKey="Kohlenhydrate" fill="hsl(var(--chart-2))" />
              <Bar dataKey="Fette" fill="hsl(var(--chart-3))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weight Chart */}
      {weightChartData.length > 0 && (
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Gewichtsverlauf</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  angle={timeRange === 'year' ? -45 : 0}
                  textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                  height={timeRange === 'year' ? 60 : 30}
                />
                <YAxis 
                  fontSize={12}
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
                  stroke="hsl(var(--chart-4))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-4))', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: 'hsl(var(--chart-4))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};