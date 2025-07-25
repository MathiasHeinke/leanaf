
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Lightbulb, TrendingUp, Target, Clock } from "lucide-react";
import { PremiumGate } from '@/components/PremiumGate';

interface CoachingInsight {
  type: 'tip' | 'progress' | 'goal' | 'timing';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface EnhancedCoachCardProps {
  userProfile: any;
  dailyTotals: any;
  dailyGoals: any;
  recentMeals: any[];
}

export const EnhancedCoachCard = ({ 
  userProfile, 
  dailyTotals, 
  dailyGoals, 
  recentMeals 
}: EnhancedCoachCardProps) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CoachingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const generateInsights = async () => {
    if (!user || !dailyTotals || !dailyGoals) return;

    setLoading(true);
    try {
      // Generating coaching insights

      const { data, error } = await supabase.functions.invoke('coach-analysis', {
        body: {
          userId: user.id,
          profile: userProfile,
          dailyTotals,
          dailyGoals,
          recentMeals
        }
      });

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);
        // Coaching insights generated successfully
      }

    } catch (error) {
      console.error('❌ Error generating insights:', error);
      // Fallback local insights
      generateLocalInsights();
    } finally {
      setLoading(false);
    }
  };

  const generateLocalInsights = () => {
    const localInsights: CoachingInsight[] = [];

    // Calorie analysis
    const calorieProgress = (dailyTotals.calories / dailyGoals.calories) * 100;
    if (calorieProgress < 70) {
      localInsights.push({
        type: 'goal',
        title: 'Kalorien-Ziel',
        message: `Du hast erst ${Math.round(calorieProgress)}% deines Tagesziels erreicht. Zeit für eine nahrhafte Mahlzeit!`,
        priority: 'high'
      });
    } else if (calorieProgress > 110) {
      localInsights.push({
        type: 'progress',
        title: 'Kalorien-Überschuss',
        message: `Du hast dein Tagesziel um ${Math.round(calorieProgress - 100)}% überschritten. Morgen etwas bewusster essen.`,
        priority: 'medium'
      });
    }

    // Protein analysis
    const proteinProgress = (dailyTotals.protein / dailyGoals.protein) * 100;
    if (proteinProgress < 80) {
      localInsights.push({
        type: 'tip',
        title: 'Protein-Boost',
        message: `Noch ${Math.round(dailyGoals.protein - dailyTotals.protein)}g Protein bis zum Ziel. Wie wäre es mit Quark oder Hühnchen?`,
        priority: 'high'
      });
    }

    // Timing analysis
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour > 14 && recentMeals.length < 2) {
      localInsights.push({
        type: 'timing',
        title: 'Mahlzeit-Timing',
        message: 'Du hast heute noch nicht viel gegessen. Regelmäßige Mahlzeiten helfen beim Erreichen deiner Ziele.',
        priority: 'medium'
      });
    }

    setInsights(localInsights);
  };

  useEffect(() => {
    generateInsights();
  }, [user, dailyTotals, dailyGoals, recentMeals]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'tip': return <Lightbulb className="w-4 h-4" />;
      case 'progress': return <TrendingUp className="w-4 h-4" />;
      case 'goal': return <Target className="w-4 h-4" />;
      case 'timing': return <Clock className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Coaching Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Coaching Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Du machst großartige Fortschritte! Weiter so! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <PremiumGate 
      feature="advanced_coach"
      hideable={true}
      fallbackMessage="Erweiterte KI-Coach Funktionen sind ein Premium Feature. Upgrade für personalisierte Coaching-Insights!"
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Coaching Insights
            <Badge variant="secondary">{insights.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${getPriorityColor(insight.priority)}`}
              onClick={() => setExpandedInsight(expandedInsight === index ? null : index)}
            >
              <div className="flex items-start gap-2">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className={`text-sm mt-1 ${expandedInsight === index ? '' : 'line-clamp-2'}`}>
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateInsights}
            className="w-full mt-3"
          >
            Neue Insights generieren
          </Button>
        </CardContent>
      </Card>
    </PremiumGate>
  );
};
