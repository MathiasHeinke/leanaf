
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, TrendingUp, Activity, Droplets, Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MonthlySummaryData {
  period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
    days_in_month: number;
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
  };
  hydration: {
    total_ml: number;
    avg_ml: number;
  };
  compliance: {
    nutrition_compliance_pct: number;
    workout_compliance_pct: number;
    hydration_compliance_pct: number;
  };
}

export const MonthlySummarySection: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<MonthlySummaryData | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const generateMonthlySummary = async (monthOffset: number = 0) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      const now = new Date();
      const targetMonth = now.getMonth() - monthOffset;
      const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
      const adjustedMonth = ((targetMonth % 12) + 12) % 12 + 1;

      console.log('Generating monthly summary for:', `${targetYear}-${adjustedMonth}`);

      const { data, error } = await supabase.functions.invoke('generate-monthly-summary', {
        body: {
          userId: user.id,
          year: targetYear,
          month: adjustedMonth,
          force: true
        }
      });

      if (error) {
        throw error;
      }

      if (data?.status === 'success' && data?.data) {
        setSummaryData(data.data);
        setLastGenerated(data.period);
        toast.success(`Monthly summary generated for ${data.period}`);
      } else {
        toast.info(`Monthly summary ${data?.status || 'completed'}: ${data?.reason || 'No reason provided'}`);
      }
    } catch (error) {
      console.error('Error generating monthly summary:', error);
      toast.error('Failed to generate monthly summary');
    } finally {
      setLoading(false);
    }
  };

  const triggerBackfill = async (months: number = 3) => {
    setBackfillLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      console.log(`Starting backfill for ${months} months`);

      const { data, error } = await supabase.functions.invoke('trigger-summary-backfill', {
        body: {
          userId: user.id,
          summaryType: 'monthly',
          months,
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
      toast.error('Failed to trigger monthly backfill');
    } finally {
      setBackfillLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Monthly Summary Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => generateMonthlySummary(1)} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate Last Month
          </Button>
          <Button 
            onClick={() => generateMonthlySummary(0)} 
            disabled={loading}
            variant="outline"
          >
            Generate This Month
          </Button>
          <Button 
            onClick={() => triggerBackfill(3)} 
            disabled={backfillLoading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {backfillLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Backfill 3 Months
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
                  {summaryData.period.year}-{String(summaryData.period.month).padStart(2, '0')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {summaryData.period.days_in_month} days
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
                <div className="text-sm text-muted-foreground">
                  {summaryData.nutrition.total_calories.toLocaleString()} total kcal
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
                  {Math.round(summaryData.hydration.total_ml / 1000)}L total
                </div>
                <Badge variant={summaryData.compliance.hydration_compliance_pct >= 70 ? "default" : "destructive"}>
                  {summaryData.compliance.hydration_compliance_pct}% compliance
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
