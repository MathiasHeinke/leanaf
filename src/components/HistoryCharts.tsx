
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { MacroStackedChart } from "./analytics/MacroStackedChart";


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
  body_fat_percentage?: number;
  muscle_percentage?: number;
  displayDate: string;
}

interface BodyMeasurementEntry {
  date: string;
  neck?: number;
  chest?: number;
  waist?: number;
  belly?: number;
  hips?: number;
  arms?: number;
  thigh?: number;
}

interface HistoryChartsProps {
  data: DailyData[];
  weightHistory: WeightEntry[];
  bodyMeasurementsHistory?: BodyMeasurementEntry[];
  timeRange: 'week' | 'month' | 'year';
  loading: boolean;
  showNutritionCharts?: boolean;
}

export const HistoryCharts = ({ data, weightHistory, bodyMeasurementsHistory = [], timeRange, loading, showNutritionCharts = true }: HistoryChartsProps) => {
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
      weight: entry.weight,
      bodyFat: entry.body_fat_percentage || null,
      muscle: entry.muscle_percentage || null
    }))
    .reverse();

  const bodyMeasurementsChartData = bodyMeasurementsHistory
    .map(entry => ({
      date: new Date(entry.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit'
      }),
      neck: entry.neck,
      chest: entry.chest,
      waist: entry.waist,
      belly: entry.belly,
      hips: entry.hips,
      arms: entry.arms,
      thigh: entry.thigh
    }))
    .reverse();

  // Enhanced tooltip for weight chart showing all three values
  const WeightTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            {data?.weight && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(221,83%,53%)]"></div>
                <span className="text-sm">Gewicht: <span className="font-medium">{data.weight} kg</span></span>
              </div>
            )}
            {data?.bodyFat && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(25,95%,53%)] border-dashed border-b-2"></div>
                <span className="text-sm">Körperfett: <span className="font-medium">{data.bodyFat}%</span></span>
              </div>
            )}
            {data?.muscle && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(142,76%,36%)] border-dotted border-b-2"></div>
                <span className="text-sm">Muskelmasse: <span className="font-medium">{data.muscle}%</span></span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Enhanced tooltip for body measurements chart
  const BodyMeasurementsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            {data?.neck && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(221,83%,53%)]"></div>
                <span className="text-sm">Hals: <span className="font-medium">{data.neck} cm</span></span>
              </div>
            )}
            {data?.chest && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(25,95%,53%)]"></div>
                <span className="text-sm">Brust: <span className="font-medium">{data.chest} cm</span></span>
              </div>
            )}
            {data?.waist && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(142,76%,36%)]"></div>
                <span className="text-sm">Taille: <span className="font-medium">{data.waist} cm</span></span>
              </div>
            )}
            {data?.belly && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(262,83%,58%)]"></div>
                <span className="text-sm">Bauch: <span className="font-medium">{data.belly} cm</span></span>
              </div>
            )}
            {data?.hips && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(346,77%,49%)]"></div>
                <span className="text-sm">Hüfte: <span className="font-medium">{data.hips} cm</span></span>
              </div>
            )}
            {data?.arms && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(173,58%,39%)]"></div>
                <span className="text-sm">Arme: <span className="font-medium">{data.arms} cm</span></span>
              </div>
            )}
            {data?.thigh && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[hsl(43,74%,66%)]"></div>
                <span className="text-sm">Oberschenkel: <span className="font-medium">{data.thigh} cm</span></span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Calories Line Chart */}
      {showNutritionCharts && (
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
      )}

      {/* Macros Stacked Chart */}
      {showNutritionCharts && (
        <MacroStackedChart 
          data={data.filter(day => day.meals.length > 0).map(day => ({
            date: day.date,
            displayDate: day.displayDate,
            protein: day.protein,
            carbs: day.carbs,
            fats: day.fats,
          })).reverse()}
        />
      )}

      {/* Enhanced Weight Chart with Optimized 3-Line Overlap */}
      {weightChartData.length > 0 && (
        <div className="bg-gradient-to-r from-background to-accent/10 p-5 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Gewicht & Body Composition</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  fontSize={11}
                  angle={timeRange === 'year' ? -45 : 0}
                  textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                  height={timeRange === 'year' ? 60 : 30}
                />
                
                {/* Left Y-axis for weight */}
                <YAxis 
                  yAxisId="weight"
                  fontSize={11}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  label={{ value: 'Gewicht (kg)', angle: -90, position: 'insideLeft' }}
                />
                
                {/* Right Y-axis for percentages */}
                <YAxis 
                  yAxisId="percentage"
                  orientation="right"
                  fontSize={11}
                  domain={[0, 100]}
                  label={{ value: 'Prozent (%)', angle: 90, position: 'insideRight' }}
                />
                
                <Tooltip content={<WeightTooltip />} />
                
                {/* Weight line - Primary blue, thickest */}
                <Line 
                  yAxisId="weight"
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(221, 83%, 53%)" 
                  strokeWidth={4}
                  dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 0, r: 0, fillOpacity: 0 }}
                  activeDot={{ r: 8, fill: 'hsl(221, 83%, 53%)', stroke: 'white', strokeWidth: 3 }}
                />
                
                {/* Body Fat line - Orange, dashed pattern */}
                <Line 
                  yAxisId="percentage"
                  type="monotone" 
                  dataKey="bodyFat" 
                  stroke="hsl(25, 95%, 53%)" 
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  dot={{ fill: 'hsl(25, 95%, 53%)', strokeWidth: 0, r: 0, fillOpacity: 0 }}
                  activeDot={{ r: 6, fill: 'hsl(25, 95%, 53%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
                
                {/* Muscle Mass line - Green, dotted pattern */}
                <Line 
                  yAxisId="percentage"
                  type="monotone" 
                  dataKey="muscle" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={3}
                  strokeDasharray="2 6"
                  dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 0, r: 0, fillOpacity: 0 }}
                  activeDot={{ r: 6, fill: 'hsl(142, 76%, 36%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Enhanced Legend with visual line styles */}
          <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-6 h-1 bg-[hsl(221,83%,53%)] rounded-full"></div>
              <span className="font-medium">Gewicht (kg)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-1 bg-[hsl(25,95%,53%)] rounded-full relative">
                <div className="absolute inset-0 bg-background" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, hsl(25,95%,53%) 4px, hsl(25,95%,53%) 8px)'
                }}></div>
              </div>
              <span className="font-medium">Körperfett (%)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-1 bg-[hsl(142,76%,36%)] rounded-full relative">
                <div className="absolute inset-0 bg-background" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 1px, hsl(142,76%,36%) 1px, hsl(142,76%,36%) 2px, transparent 2px, transparent 8px)'
                }}></div>
              </div>
              <span className="font-medium">Muskelmasse (%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Body Measurements Chart */}
      {bodyMeasurementsChartData.length > 0 && (
        <div className="bg-gradient-to-r from-background to-accent/10 p-5 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Körpermaße Verlauf</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyMeasurementsChartData}>
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
                  domain={['dataMin - 5', 'dataMax + 5']}
                  label={{ value: 'Zentimeter (cm)', angle: -90, position: 'insideLeft' }}
                />
                
                <Tooltip content={<BodyMeasurementsTooltip />} />
                
                <Line 
                  type="monotone" 
                  dataKey="neck" 
                  stroke="hsl(221, 83%, 53%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ r: 4, fill: 'hsl(221, 83%, 53%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="chest" 
                  stroke="hsl(25, 95%, 53%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(25, 95%, 53%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ r: 4, fill: 'hsl(25, 95%, 53%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="waist" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ r: 4, fill: 'hsl(142, 76%, 36%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="belly" 
                  stroke="hsl(262, 83%, 58%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(262, 83%, 58%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ r: 4, fill: 'hsl(262, 83%, 58%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="hips" 
                  stroke="hsl(346, 77%, 49%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(346, 77%, 49%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ r: 4, fill: 'hsl(346, 77%, 49%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="arms" 
                  stroke="hsl(173, 58%, 39%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(173, 58%, 39%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ r: 4, fill: 'hsl(173, 58%, 39%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="thigh" 
                  stroke="hsl(43, 74%, 66%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(43, 74%, 66%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ r: 4, fill: 'hsl(43, 74%, 66%)', stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Body Measurements Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[hsl(221,83%,53%)] rounded-full"></div>
              <span>Hals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[hsl(25,95%,53%)] rounded-full"></div>
              <span>Brust</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[hsl(142,76%,36%)] rounded-full"></div>
              <span>Taille</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[hsl(262,83%,58%)] rounded-full"></div>
              <span>Bauch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[hsl(346,77%,49%)] rounded-full"></div>
              <span>Hüfte</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[hsl(173,58%,39%)] rounded-full"></div>
              <span>Arme</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[hsl(43,74%,66%)] rounded-full"></div>
              <span>Oberschenkel</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
