import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  History as HistoryIcon, 
  Calendar, 
  TrendingUp, 
  Target,
  ArrowLeft
} from "lucide-react";

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface HistoryProps {
  onClose: () => void;
  dailyGoal: DailyGoal;
}

// Mock-Daten für die letzten 30 Tage
const generateMockData = () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      displayDate: date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      calories: Math.floor(Math.random() * 800) + 1200,
      protein: Math.floor(Math.random() * 50) + 80,
      carbs: Math.floor(Math.random() * 100) + 150,
      fats: Math.floor(Math.random() * 40) + 40,
      meals: Math.floor(Math.random() * 3) + 3
    });
  }
  return data;
};

const History = ({ onClose, dailyGoal }: HistoryProps) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const mockData = generateMockData();
  
  const currentData = timeRange === 'week' 
    ? mockData.slice(-7) 
    : mockData;

  const averageCalories = Math.round(
    currentData.reduce((sum, day) => sum + day.calories, 0) / currentData.length
  );

  const goalsAchieved = currentData.filter(day => 
    day.calories >= dailyGoal.calories * 0.9 && day.calories <= dailyGoal.calories * 1.1
  ).length;

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-primary to-primary-glow p-2 rounded-lg">
              <HistoryIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold">Verlauf</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>

        {/* Zeitraum-Auswahl */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={timeRange === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            7 Tage
          </Button>
          <Button
            variant={timeRange === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            30 Tage
          </Button>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-primary/5 rounded-xl">
            <div className="text-2xl font-bold text-primary">{averageCalories}</div>
            <div className="text-sm text-muted-foreground">Ø Kalorien/Tag</div>
          </div>
          <div className="text-center p-4 bg-success/5 rounded-xl">
            <div className="text-2xl font-bold text-success">{goalsAchieved}</div>
            <div className="text-sm text-muted-foreground">Ziele erreicht</div>
          </div>
        </div>
      </Card>

      {/* Charts und Tabelle */}
      <Tabs defaultValue="chart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chart">Grafik</TabsTrigger>
          <TabsTrigger value="table">Tabelle</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Kalorien-Verlauf</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">Makronährstoffe</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={currentData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="protein" fill="hsl(var(--protein))" />
                <Bar dataKey="carbs" fill="hsl(var(--carbs))" />
                <Bar dataKey="fats" fill="hsl(var(--fats))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Detaillierte Übersicht</h3>
            <div className="space-y-3">
              {currentData.reverse().map((day, index) => (
                <div key={day.date} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{day.displayDate}</div>
                      <div className="text-sm text-muted-foreground">
                        {day.meals} Mahlzeiten
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{day.calories} kcal</div>
                    <div className="text-xs text-muted-foreground">
                      P: {day.protein}g • K: {day.carbs}g • F: {day.fats}g
                    </div>
                  </div>
                  <div>
                    {day.calories >= dailyGoal.calories * 0.9 && day.calories <= dailyGoal.calories * 1.1 ? (
                      <Badge variant="default">Ziel erreicht</Badge>
                    ) : day.calories > dailyGoal.calories * 1.1 ? (
                      <Badge variant="destructive">Über Ziel</Badge>
                    ) : (
                      <Badge variant="secondary">Unter Ziel</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;