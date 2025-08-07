import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Pill, TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle, Brain } from "lucide-react";
import { getCurrentDateString } from "@/utils/dateHelpers";

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
      const today = getCurrentDateString();
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
    if (!user?.id) return;

    console.log('🔄 Starting supplement analysis for user:', user.id);
    console.log('📋 Supplements to analyze:', supplements);

    try {
      setAnalysisLoading(true);
      
      // Get user profile for context
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('age, gender, fitness_goal')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('👤 User profile:', userProfile);

      const response = await supabase.functions.invoke('supplement-analysis', {
        body: {
          supplements,
          userProfile: userProfile || null
        }
      });

      console.log('📡 Edge function response:', response);

      if (response.error) {
        console.error('❌ Error from supplement-analysis:', response.error);
        
        // Fallback analysis when API fails
        const fallbackAnalysis = supplements.length > 0 
          ? `Hey du 👋 Dein Supplement-Stack sieht interessant aus! Ich arbeite gerade an einer detaillierten Analyse für dich. In der Zwischenzeit: Balance statt Perfektion ✨ 

Kurz-Check deines Stacks:
• ${supplements.map(s => s.name).join(', ')}

Grundsätzlich super, dass du auf deine Gesundheit achtest! Denk daran: Supplements ergänzen eine gute Ernährung, ersetzen sie aber nicht.`
          : 'Hey du 👋 Noch keine Supplements konfiguriert? Kein Problem! Füge deine Supplements hinzu und ich analysiere deinen Stack mit meiner Chrononutrition-Expertise ✨';
        
        setCoachAnalysis(fallbackAnalysis);
        return;
      }

      if (response.data?.analysis) {
        console.log('✅ Analysis received:', response.data.analysis);
        setCoachAnalysis(response.data.analysis);
      } else {
        console.warn('⚠️ No analysis in response data');
        setCoachAnalysis('Hey du 👋 Ich konnte gerade keine detaillierte Analyse erstellen, aber dein Interesse an Supplements ist schon mal ein guter Schritt! Balance statt Perfektion ✨');
      }
    } catch (error) {
      console.error('💥 Error generating coach analysis:', error);
      
      // Fallback for unexpected errors
      setCoachAnalysis('Hey du 👋 Kleine technische Pause bei mir! Aber keine Sorge - deine Supplement-Routine läuft weiter. Balance statt Perfektion ✨');
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
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">7-Tage Ø</div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {Math.round(supplementData.weeklyCompliance)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Trend</div>
            <div className={`text-lg font-bold flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {supplementData.trend === 'stable' ? 'Stabil' : `${supplementData.trendPercentage.toFixed(0)}%`}
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium border-t pt-4">
          {supplementData.complianceRate >= 100 
            ? "🎉 Alle Supplements heute eingenommen!"
            : supplementData.complianceRate >= 75
            ? "💪 Fast vollständig! Nur noch wenige ausstehend."
            : supplementData.complianceRate >= 50
            ? "👍 Guter Start, denk an die restlichen!"
            : "💊 Denk an deine Supplements!"}
        </div>

        {/* Lucy's Analysis */}
        {coachAnalysis && (
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-semibold text-xs">L</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Lucy's Supplement-Analyse</h4>
                {analysisLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
                    <span className="text-sm text-muted-foreground">Lucy analysiert deinen Stack...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {coachAnalysis}
                    </p>
                    <button 
                      className="text-xs text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-medium"
                      onClick={() => {
                        // TODO: Open chat with Lucy
                        console.log('Opening chat with Lucy about supplements...');
                      }}
                    >
                      💬 Frag Lucy direkt zu deinen Supplements
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};