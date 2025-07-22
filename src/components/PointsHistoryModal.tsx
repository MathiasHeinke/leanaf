
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { History, Star, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PointActivity {
  id: string;
  activity_type: string;
  points_earned: number;
  multiplier: number;
  trial_multiplier?: number;
  description?: string;
  bonus_reason?: string;
  streak_length?: number;
  created_at: string;
}

interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PointsHistoryModal = ({ isOpen, onClose }: PointsHistoryModalProps) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<PointActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPointsHistory = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('point_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading points history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      loadPointsHistory();
    }
  }, [isOpen, user?.id]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'meal_tracked': return '📝';
      case 'meal_tracked_with_photo': return '📸';
      case 'meal_quality_bonus': return '⭐';
      case 'workout_completed': return '💪';
      case 'workout_quality_bonus': return '🏆';
      case 'weight_measured': return '⚖️';
      case 'body_measurements': return '📏';
      case 'sleep_tracked': return '😴';
      case 'sleep_quality_bonus': return '🌙';
      case 'calorie_deficit_met': return '🎯';
      case 'protein_goal_met': return '🥩';
      case 'daily_login': return '👋';
      default: return '🎖️';
    }
  };

  const getActivityLabel = (activityType: string) => {
    switch (activityType) {
      case 'meal_tracked': return 'Mahlzeit eingetragen';
      case 'meal_tracked_with_photo': return 'Mahlzeit mit Foto';
      case 'meal_quality_bonus': return 'Mahlzeit-Qualitätsbonus';
      case 'workout_completed': return 'Workout abgeschlossen';
      case 'workout_quality_bonus': return 'Workout-Qualitätsbonus';
      case 'weight_measured': return 'Gewicht gemessen';
      case 'body_measurements': return 'Körpermaße gemessen';
      case 'sleep_tracked': return 'Schlaf eingetragen';
      case 'sleep_quality_bonus': return 'Schlaf-Qualitätsbonus';
      case 'calorie_deficit_met': return 'Kaloriendefizit erreicht';
      case 'protein_goal_met': return 'Proteinziel erreicht';
      case 'daily_login': return 'Täglicher Login';
      default: return activityType;
    }
  };

  const groupedActivities = activities.reduce((groups: { [key: string]: PointActivity[] }, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Punkte-Verlauf
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Lade Punkte-Verlauf...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Noch keine Punkte-Aktivitäten vorhanden
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedActivities).map(([date, dayActivities]) => {
                const totalPointsForDay = dayActivities.reduce((sum, activity) => sum + activity.points_earned, 0);
                
                return (
                  <div key={date} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">
                        {format(new Date(date), 'EEEE, dd. MMMM yyyy', { locale: de })}
                      </h3>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{totalPointsForDay} Punkte
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {dayActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                            <div>
                              <div className="font-medium text-sm">
                                {getActivityLabel(activity.activity_type)}
                              </div>
                              {activity.description && (
                                <div className="text-xs text-muted-foreground">
                                  {activity.description}
                                </div>
                              )}
                              {activity.bonus_reason && (
                                <div className="text-xs text-yellow-600 flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {activity.bonus_reason === 'quality_bonus' && 'Qualitätsbonus'}
                                  {activity.bonus_reason === 'consistency_bonus' && 'Konsistenzbonus'}
                                  {activity.bonus_reason === 'sleep_consistency_bonus' && 'Schlaf-Konsistenzbonus'}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {activity.multiplier > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {activity.multiplier}x
                              </Badge>
                            )}
                            {activity.trial_multiplier && activity.trial_multiplier > 1 && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                Trial {activity.trial_multiplier}x
                              </Badge>
                            )}
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              +{activity.points_earned}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
