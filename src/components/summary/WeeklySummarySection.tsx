
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, TrendingUp, Activity, Droplets, Moon, Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WeeklySummaryData {
  period: {
    week_start: string;
    week_end: string;
    iso_week: number;
    iso_year: number;
    days: number;
  };
  nutrition: {
    total_calories: number;
    avg_calories: number;
    total_protein: number;
    avg_protein: number;
  };
  training: {
    total_volume_kg: number;
    workout_days: number;
    rest_days: number;
  };
  steps: {
    total: number;
    avg: number;
  };
  hydration: {
    total_ml: number;
    avg_ml: number;
    avg_score: number;
  };
  sleep: {
    avg_score: number;
  };
  compliance: {
    nutrition_compliance_pct: number;
    workout_compliance_pct: number;
    hydration_compliance_pct: number;
  };
}

export const WeeklySummarySection: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<WeeklySummaryData | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const generateWeeklySummary = async (weekOffset: number = 0) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Calculate target week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + diff - (weekOffset * 7));

      console.log('Generating weekly summary for:', weekStart.toISOString().split('T')[0]);

      const { data, error } = await supabase.functions.invoke('generate-weekly-summary', {
        body: {
          userId: user.id,
          weekStart: weekStart.toISOString().split('T')[0],
          force: true
        }
      });

      if (error) {
        throw error;
      }

      if (data?.status === 'success' && data?.data) {
        setSummaryData(data.data);
        setLastGenerated(data.period);
        toast.success(`Weekly summary generated for ${data.period}`);
      } else {
        toast.info(`Weekly summary ${data?.status || 'completed'}: ${data?.reason || 'No reason provided'}`);
      }
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      toast.error('Failed to generate weekly summary');
    } finally {
      setLoading(false);
    }
  };

  const triggerBackfill = async (weeks: number = 4) => {
    setBackfillLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      console.log(`Starting backfill for ${weeks} weeks`);

      const { data, error } = await supabase.functions.invoke('trigger-summary-backfill', {
        body: {
          userId: user.id,
          summaryType: 'weekly',
          weeks,
          force: false
        }
      });

      if (error) {
        throw error;
      }

      const { summary } = data;
      toast.success(`Backfill completed: ${summary.success} success, ${summary.errors} errors, ${summary.skipped} skipped`);
      
      console.log('Backfill results:', data.results);
    } catch (error) {
      console.error('Error triggering backfill:', error);
      toast.error('Failed to trigger weekly backfill');
    } finally {
      setBackfillLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Summary Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => generateWeeklySummary(0)} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate This Week
          </Button>
          <Button 
            onClick={() => generateWeeklySummary(1)} 
            disabled={loading}
            variant="outline"
          >
            Generate Last Week
          </Button>
          <Button 
            onClick={() => triggerBackfill(4)} 
            disabled={backfillLoading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {backfillLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Backfill 4 Weeks
          </Button>
        </div>

        {lastGenerated && (
          <Badge variant="secondary">
            Last Generated: {lastGenerated}
          </Badge>
        )}

        {summaryData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {/* Period Info */}
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Period</div>
                <div className="text-lg font-bold">
                  {summaryData.period.iso_year}-W{summaryData.period.iso_week}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(summaryData.period.week_start).toLocaleDateString()} - {new Date(summaryData.period.week_end).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            {/* Nutrition */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <div className="text-sm font-medium">Nutrition</div>
                </div>
                <div className="text-lg font-bold">
                  {Math.round(summaryData.nutrition.avg_calories)} kcal/day
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.round(summaryData.nutrition.avg_protein)}g protein avg
                </div>
                <Badge variant={summaryData.compliance.nutrition_compliance_pct >= 70 ? "default" : "destructive"}>
                  {summaryData.compliance.nutrition_compliance_pct}% compliance
                </Badge>
              </CardContent>
            </Card>

            {/* Training */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4" />
                  <div className="text-sm font-medium">Training</div>
                </div>
                <div className="text-lg font-bold">
                  {summaryData.training.workout_days} workout days
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.round(summaryData.training.total_volume_kg)}kg total volume
                </div>
                <Badge variant={summaryData.compliance.workout_compliance_pct >= 50 ? "default" : "destructive"}>
                  {summaryData.compliance.workout_compliance_pct}% compliance
                </Badge>
              </CardContent>
            </Card>

            {/* Steps */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4" />
                  <div className="text-sm font-medium">Steps</div>
                </div>
                <div className="text-lg font-bold">
                  {Math.round(summaryData.steps.avg)} avg/day
                </div>
                <div className="text-sm text-muted-foreground">
                  {summaryData.steps.total.toLocaleString()} total
                </div>
              </CardContent>
            </Card>

            {/* Hydration */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-4 w-4" />
                  <div className="text-sm font-medium">Hydration</div>
                </div>
                <div className="text-lg font-bold">
                  {Math.round(summaryData.hydration.avg_ml)}ml avg/day
                </div>
                <div className="text-sm text-muted-foreground">
                  Score: {summaryData.hydration.avg_score}%
                </div>
                <Badge variant={summaryData.compliance.hydration_compliance_pct >= 70 ? "default" : "destructive"}>
                  {summaryData.compliance.hydration_compliance_pct}% compliance
                </Badge>
              </CardContent>
            </Card>

            {/* Sleep */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4" />
                  <div className="text-sm font-medium">Sleep</div>
                </div>
                <div className="text-lg font-bold">
                  {summaryData.sleep.avg_score}% avg score
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
