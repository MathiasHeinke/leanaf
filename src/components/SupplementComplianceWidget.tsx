import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Pill, TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle, Brain } from "lucide-react";

interface SupplementData {
  plannedSupplements: Array<{
    id: string;
    name: string;
    taken: boolean;
  }>;
  complianceRate: number;
  weeklyCompliance: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export const SupplementComplianceWidget = () => {
  const { user } = useAuth();
  const [supplementData, setSupplementData] = useState<SupplementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachAnalysis, setCoachAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSupplementData();
    }
  }, [user?.id]);

  const loadSupplementData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get user's active supplements with supplement details
      const { data: activeSupplements } = await supabase
        .from('user_supplements')
        .select(`
          id,
          custom_name,
          supplement_id,
          supplement_database!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!activeSupplements || activeSupplements.length === 0) {
        setSupplementData({
          plannedSupplements: [],
          complianceRate: 0,
          weeklyCompliance: 0,
          trend: 'stable',
          trendPercentage: 0
        });
        setLoading(false);
        return;
      }

      // Get today's supplement intake
      const today = new Date().toISOString().split('T')[0];
      const { data: todayIntake } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id')
        .eq('user_id', user.id)
        .eq('date', today);

      const takenSupplementIds = new Set(todayIntake?.map(intake => intake.user_supplement_id) || []);

      const plannedSupplements = activeSupplements.map(supplement => ({
        id: supplement.id,
        name: supplement.custom_name || supplement.supplement_database?.name || 'Unknown Supplement',
        taken: takenSupplementIds.has(supplement.id)
      }));

      const takenCount = plannedSupplements.filter(s => s.taken).length;
      const complianceRate = activeSupplements.length > 0 
        ? (takenCount / activeSupplements.length) * 100 
        : 0;

      // Calculate weekly compliance and trend
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: weeklyIntake } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id, date')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Calculate daily compliance rates for the week
      const dailyCompliance: { [key: string]: number } = {};
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayIntake = weeklyIntake?.filter(intake => intake.date === dateStr) || [];
        const uniqueSupplementsCount = new Set(dayIntake.map(intake => intake.user_supplement_id)).size;
        
        dailyCompliance[dateStr] = activeSupplements.length > 0 
          ? (uniqueSupplementsCount / activeSupplements.length) * 100 
          : 0;
      }

      const complianceValues = Object.values(dailyCompliance);
      const weeklyCompliance = complianceValues.length > 0 
        ? complianceValues.reduce((sum, val) => sum + val, 0) / complianceValues.length 
        : 0;

      // Calculate trend (compare last 3 days vs previous 3 days)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;

      if (complianceValues.length >= 6) {
        const recent3 = complianceValues.slice(0, 3);
        const previous3 = complianceValues.slice(3, 6);
        
        const recentAvg = recent3.reduce((sum, val) => sum + val, 0) / 3;
        const previousAvg = previous3.reduce((sum, val) => sum + val, 0) / 3;
        
        if (previousAvg > 0) {
          trendPercentage = ((recentAvg - previousAvg) / previousAvg) * 100;
          if (Math.abs(trendPercentage) >= 15) {
            trend = trendPercentage > 0 ? 'up' : 'down';
          }
        }
      }

      setSupplementData({
        plannedSupplements,
        complianceRate,
        weeklyCompliance,
        trend,
        trendPercentage: Math.abs(trendPercentage)
      });

      // Generate coach analysis only if supplements changed
      await generateCoachAnalysis(plannedSupplements);

    } catch (error) {
      console.error('Error loading supplement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCoachAnalysis = async (supplements: any[]) => {
    if (!user?.id || supplements.length === 0) return;

    try {
      // Check if analysis already exists for this supplement combination
      const supplementNames = supplements.map(s => s.name).sort().join(',');
      
      const { data: existingAnalysis } = await supabase
        .from('supplement_analyses')
        .select('analysis_text')
        .eq('user_id', user.id)
        .eq('supplement_combination_hash', btoa(supplementNames))
        .single();

      if (existingAnalysis) {
        setCoachAnalysis(existingAnalysis.analysis_text);
        return;
      }

      // Generate new analysis
      setAnalysisLoading(true);
      
      // Get user profile for context
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('age, gender, fitness_goal')
        .eq('user_id', user.id)
        .single();

      const response = await fetch('/functions/v1/supplement-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          supplements,
          userProfile: userProfile || null
        })
      });

      const data = await response.json();
      
      if (data.analysis) {
        setCoachAnalysis(data.analysis);
        
        // Store analysis for future use
        await supabase
          .from('supplement_analyses')
          .upsert({
            user_id: user.id,
            supplement_combination_hash: btoa(supplementNames),
            analysis_text: data.analysis,
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error generating coach analysis:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!supplementData) return null;

  const getTrendIcon = () => {
    switch (supplementData.trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (supplementData.trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (supplementData.plannedSupplements.length === 0) {
    return (
      <Card className="glass-card shadow-lg border border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Supplements</div>
              <div className="text-sm text-muted-foreground font-normal">Einnahme-Tracking</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Keine aktiven Supplements konfiguriert</p>
            <p className="text-sm text-muted-foreground mt-1">Füge Supplements hinzu, um das Tracking zu starten</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-lg border border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Pill className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">Supplements</div>
            <div className="text-sm text-muted-foreground font-normal">Einnahme-Tracking</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Today's Compliance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Heute eingenommen</span>
            <Badge variant="outline" className="text-xs">
              {Math.round(supplementData.complianceRate)}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {supplementData.plannedSupplements.filter(s => s.taken).length} / {supplementData.plannedSupplements.length}
            </div>
            <Progress 
              value={supplementData.complianceRate} 
              className="h-3 bg-purple-100 dark:bg-purple-800/50"
            />
          </div>
        </div>

        {/* Supplement List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Heutige Supplements</h4>
          <div className="space-y-2">
            {supplementData.plannedSupplements.map((supplement) => (
              <div 
                key={supplement.id}
                className={`flex items-center gap-3 p-2 rounded-lg border ${
                  supplement.taken 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30' 
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/30'
                }`}
              >
                {supplement.taken ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                )}
                <span className={`text-sm font-medium ${
                  supplement.taken 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {supplement.name}
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ml-auto ${
                    supplement.taken 
                      ? 'border-green-500 text-green-600 dark:text-green-400' 
                      : 'border-orange-500 text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {supplement.taken ? 'Eingenommen' : 'Ausstehend'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">7-Tage Ø</div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {Math.round(supplementData.weeklyCompliance)}%
            </div>
          </div>
          <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Trend</div>
            <div className={`text-lg font-bold flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {supplementData.trend === 'stable' ? 'Stabil' : `${supplementData.trendPercentage.toFixed(0)}%`}
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700/30">
          <div className="text-sm text-purple-700 dark:text-purple-300">
            {supplementData.complianceRate >= 100 
              ? "🎉 Alle Supplements heute eingenommen!"
              : supplementData.complianceRate >= 75
              ? "💪 Fast vollständig! Nur noch wenige ausstehend."
              : supplementData.complianceRate >= 50
              ? "👍 Guter Start, denk an die restlichen!"
              : "💊 Denk an deine Supplements!"}
          </div>
        </div>

        {/* Coach Analysis */}
        {coachAnalysis && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/30">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Coach Analyse</h4>
                {analysisLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">Analyse wird erstellt...</span>
                  </div>
                ) : (
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    {coachAnalysis}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};