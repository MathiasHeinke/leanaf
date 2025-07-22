
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoachChat } from "@/components/CoachChat";
import { CoachInsights } from "@/components/CoachInsights";
import { CoachQuickActions } from "@/components/CoachQuickActions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  MessageSquare, 
  TrendingUp,
  Lightbulb,
  User,
  Settings
} from "lucide-react";

interface UserData {
  profile: any;
  recentMeals: any[];
  recentWorkouts: any[];
  recentSleep: any[];
  weightHistory: any[];
  dailyGoals: any;
  todaysTotals: any;
}

export const Coach = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'actions'>('chat');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coachPersonality, setCoachPersonality] = useState('motivierend');

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [profileData, mealsData, workoutsData, sleepData, weightData, goalsData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(7),
        
        supabase
          .from('sleep_tracking')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(7),
        
        supabase
          .from('weight_history')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(14),
        
        supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      // Calculate today's totals
      const today = new Date().toISOString().split('T')[0];
      const todaysMeals = mealsData.data?.filter(meal => 
        meal.created_at.startsWith(today)
      ) || [];
      
      const todaysTotals = todaysMeals.reduce((sum, meal) => ({
        calories: sum.calories + (meal.calories || 0),
        protein: sum.protein + (meal.protein || 0),
        carbs: sum.carbs + (meal.carbs || 0),
        fats: sum.fats + (meal.fats || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

      setUserData({
        profile: profileData.data,
        recentMeals: mealsData.data || [],
        recentWorkouts: workoutsData.data || [],
        recentSleep: sleepData.data || [],
        weightHistory: weightData.data || [],
        dailyGoals: goalsData.data,
        todaysTotals
      });

      if (profileData.data?.coach_personality) {
        setCoachPersonality(profileData.data.coach_personality);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPersonalityIcon = (personality: string) => {
    switch (personality) {
      case 'hart': return '🎯';
      case 'soft': return '😊';
      case 'lustig': return '😄';
      case 'ironisch': return '😏';
      case 'motivierend': return '💪';
      default: return '🤖';
    }
  };

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'actions', label: 'Quick Actions', icon: Lightbulb }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Brain className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Lade Coach-Daten...</p>
          <p className="text-sm text-muted-foreground">Analysiere deine Fortschritte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coach Header */}
      <Card className="glass-card border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">KaloAI Coach</span>
                <Badge variant="secondary" className="text-sm">
                  {getPersonalityIcon(coachPersonality)} {coachPersonality}
                </Badge>
              </div>
              <p className="text-muted-foreground font-normal">
                Dein persönlicher KI-Coach für Ernährung, Training und Fortschritt
              </p>
              {userData && (
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>📊 {userData.recentMeals.length} Mahlzeiten diese Woche</span>
                  <span>💪 {userData.recentWorkouts.length} Workouts diese Woche</span>
                  <span>📈 {userData.weightHistory.length} Gewichtsmessungen</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-xl">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            className={`flex-1 ${activeTab === tab.id ? 'bg-background shadow-sm' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'chat' && (
          <CoachChat 
            coachPersonality={coachPersonality}
            userData={userData}
          />
        )}
        
        {activeTab === 'insights' && (
          <CoachInsights 
            userData={userData}
            coachPersonality={coachPersonality}
          />
        )}
        
        {activeTab === 'actions' && (
          <CoachQuickActions 
            userData={userData}
            coachPersonality={coachPersonality}
            onActionSelected={(action) => {
              setActiveTab('chat');
              // Quick action will be handled by CoachChat
            }}
          />
        )}
      </div>
    </div>
  );
};
