// Bloodwork Charts Component
// Trend visualization for individual markers

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BloodworkEntry, MARKER_CATEGORIES, MARKER_DISPLAY_NAMES, ReferenceRange } from './types';
import { useBloodwork } from '@/hooks/useBloodwork';
import { formatGermanDate } from '@/utils/formatDate';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Legend } from 'recharts';
import { Lightbulb, TrendingUp, TestTube } from 'lucide-react';

interface BloodworkChartsProps {
  entries: BloodworkEntry[];
  initialMarker?: string;
}

export function BloodworkCharts({ entries, initialMarker }: BloodworkChartsProps) {
  const { referenceRanges, getMarkerChartData, userGender } = useBloodwork();
  const [selectedMarker, setSelectedMarker] = useState(initialMarker || 'total_testosterone');

  // Get chart data for selected marker
  const chartData = useMemo(() => {
    return getMarkerChartData(selectedMarker).map(item => ({
      ...item,
      dateFormatted: formatGermanDate(item.date)
    }));
  }, [getMarkerChartData, selectedMarker]);

  // Get reference range for selected marker
  const range = referenceRanges.get(selectedMarker);
  
  // Get gender-specific ranges
  const getRanges = (range: ReferenceRange | undefined) => {
    if (!range) return { normalMin: null, normalMax: null, optimalMin: null, optimalMax: null };
    
    const normalMin = (userGender === 'male' ? range.male_normal_min : range.female_normal_min) ?? range.normal_min;
    const normalMax = (userGender === 'male' ? range.male_normal_max : range.female_normal_max) ?? range.normal_max;
    const optimalMin = (userGender === 'male' ? range.male_optimal_min : range.female_optimal_min) ?? range.optimal_min;
    const optimalMax = (userGender === 'male' ? range.male_optimal_max : range.female_optimal_max) ?? range.optimal_max;
    
    return { normalMin, normalMax, optimalMin, optimalMax };
  };

  const ranges = getRanges(range);
  const displayName = MARKER_DISPLAY_NAMES[selectedMarker] || selectedMarker;
  const unit = range?.unit || '';

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Include reference ranges in domain
    const allValues = [...values];
    if (ranges.normalMin !== null) allValues.push(ranges.normalMin);
    if (ranges.normalMax !== null) allValues.push(ranges.normalMax);
    if (ranges.optimalMin !== null) allValues.push(ranges.optimalMin);
    if (ranges.optimalMax !== null) allValues.push(ranges.optimalMax);
    
    const rangeMin = Math.min(...allValues);
    const rangeMax = Math.max(...allValues);
    const padding = (rangeMax - rangeMin) * 0.1;
    
    return [Math.max(0, rangeMin - padding), rangeMax + padding];
  }, [chartData, ranges]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium">{data.dateFormatted}</p>
        <p className="text-lg font-bold text-primary">
          {data.value.toFixed(data.value % 1 === 0 ? 0 : 1)} {unit}
        </p>
        {data.lab && (
          <p className="text-xs text-muted-foreground">{data.lab}</p>
        )}
      </div>
    );
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TestTube className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Keine Blutwerte vorhanden</h3>
          <p className="text-sm text-muted-foreground">
            Trage Blutwerte ein, um Trends zu sehen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Verlauf: {displayName}
            </CardTitle>
            <CardDescription>
              {chartData.length} {chartData.length === 1 ? 'Messung' : 'Messungen'} • Einheit: {unit}
            </CardDescription>
          </div>
          
          <Select value={selectedMarker} onValueChange={setSelectedMarker}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Marker auswählen" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MARKER_CATEGORIES).map(([catKey, category]) => (
                <SelectGroup key={catKey}>
                  <SelectLabel>{category.label}</SelectLabel>
                  {category.markers.map(markerKey => (
                    <SelectItem key={markerKey} value={markerKey}>
                      {MARKER_DISPLAY_NAMES[markerKey] || markerKey}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <TestTube className="h-8 w-8 mb-2" />
            <p>Keine Daten für {displayName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                
                {/* Optimal zone (green background) */}
                {ranges.optimalMin !== null && ranges.optimalMax !== null && (
                  <ReferenceArea
                    y1={ranges.optimalMin}
                    y2={ranges.optimalMax}
                    fill="hsl(142, 76%, 36%)"
                    fillOpacity={0.1}
                    label={{ value: 'Optimal', position: 'insideTopRight', className: 'fill-emerald-600 text-xs' }}
                  />
                )}
                
                {/* Normal range reference lines */}
                {ranges.normalMin !== null && (
                  <ReferenceLine
                    y={ranges.normalMin}
                    stroke="hsl(48, 96%, 53%)"
                    strokeDasharray="5 5"
                    label={{ value: 'Min', position: 'left', className: 'fill-amber-600 text-xs' }}
                  />
                )}
                {ranges.normalMax !== null && (
                  <ReferenceLine
                    y={ranges.normalMax}
                    stroke="hsl(48, 96%, 53%)"
                    strokeDasharray="5 5"
                    label={{ value: 'Max', position: 'left', className: 'fill-amber-600 text-xs' }}
                  />
                )}
                
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={yDomain}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  width={60}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Data line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500" />
                <span>Optimal-Bereich</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed' }} />
                <span>Referenzbereich</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-1 rounded bg-blue-500" />
                <span>Deine Werte</span>
              </div>
            </div>

            {/* Coaching Tip */}
            {range?.coaching_tips && (
              <Alert className="mt-4 bg-primary/5 border-primary/20">
                <Lightbulb className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  {range.coaching_tips}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
