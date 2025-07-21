import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, ChevronDown, ChevronUp, Edit2, Trash2, Copy } from "lucide-react";
import { getGoalStatus, UserGoal } from "@/utils/goalBasedMessaging";
import { MealEditDialog } from "./MealEditDialog";

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
  meal_type: string;
  images?: string[];
}

interface DailyData {
  date: string;
  displayDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: MealData[];
}

interface HistoryTableProps {
  data: DailyData[];
  timeRange: 'week' | 'month' | 'year';
  dailyGoal: DailyGoal;
  userGoal: UserGoal;
  loading: boolean;
  onDeleteMeal: (mealId: string) => void;
  onUpdateMeal: (mealId: string, updates: Partial<MealData>) => void;
  onDuplicateMeal: (meal: MealData) => void;
}

export const HistoryTable = ({
  data,
  timeRange,
  dailyGoal,
  userGoal,
  loading,
  onDeleteMeal,
  onUpdateMeal,
  onDuplicateMeal
}: HistoryTableProps) => {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingMeal, setEditingMeal] = useState<MealData | null>(null);

  const toggleExpanded = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Lade Daten...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {data.map((day, index) => (
          <Collapsible 
            key={day.date} 
            open={expandedDays.has(day.date)}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
              <CollapsibleTrigger asChild>
                <div 
                  className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors duration-200"
                  onClick={() => toggleExpanded(day.date)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{day.displayDate}</div>
                      <div className="text-sm text-muted-foreground">
                        {timeRange === 'month' 
                          ? `${day.meals.length} ${day.meals.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'} • Wochendurchschnitt`
                          : `${day.meals.length} ${day.meals.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'}`
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-xl">{day.calories}</span>
                        {timeRange === 'month' && <span className="text-xs text-muted-foreground">Ø</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">kcal</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {(() => {
                        const goalStatus = getGoalStatus(day.calories, dailyGoal.calories, userGoal);
                        return (
                          <Badge 
                            variant={goalStatus.status === 'success' ? 'default' : 
                                    goalStatus.status === 'warning' ? 'secondary' : 'destructive'} 
                            className="text-xs px-2 py-1"
                          >
                            {goalStatus.status === 'success' ? '✓ Ziel erreicht' :
                             goalStatus.status === 'warning' ? '~ Nahe Ziel' :
                             userGoal === 'lose' ? '! Über Ziel' :
                             userGoal === 'gain' ? '! Zu wenig' : '! Abweichung'}
                          </Badge>
                        );
                      })()}
                      
                      <div className="transition-transform duration-200">
                        {expandedDays.has(day.date) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="transition-all duration-300 ease-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-4 pb-4 bg-muted/30">
                  {/* Macro Summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-background/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm font-medium text-blue-600">{day.protein}g</div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-orange-600">{day.carbs}g</div>
                      <div className="text-xs text-muted-foreground">Kohlenhydrate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-yellow-600">{day.fats}g</div>
                      <div className="text-xs text-muted-foreground">Fette</div>
                    </div>
                  </div>

                  {/* Meals */}
                  {day.meals.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {timeRange === 'month' ? 'Keine Mahlzeiten in dieser Woche' : 'Keine Mahlzeiten an diesem Tag'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {day.meals.map((meal, mealIndex) => (
                        <div 
                          key={meal.id} 
                          className="bg-background rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in"
                          style={{ animationDelay: `${mealIndex * 100}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {meal.meal_type === 'breakfast' ? '🌅 Frühstück' :
                                   meal.meal_type === 'lunch' ? '🌞 Mittagessen' :
                                   meal.meal_type === 'dinner' ? '🌙 Abendessen' : '🍎 Snack'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(meal.created_at).toLocaleDateString('de-DE', { 
                                    day: '2-digit', 
                                    month: '2-digit' 
                                  })} {new Date(meal.created_at).toLocaleTimeString('de-DE', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              
                              <div className="font-medium text-sm mb-2 line-clamp-2">
                                {meal.text}
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="font-medium">{meal.calories} kcal</span>
                                <span>P: {meal.protein}g</span>
                                <span>K: {meal.carbs}g</span>
                                <span>F: {meal.fats}g</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMeal(meal)}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDuplicateMeal(meal)}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteMeal(meal.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      <MealEditDialog
        meal={editingMeal}
        open={editingMeal !== null}
        onClose={() => setEditingMeal(null)}
        onUpdate={(mealId, updates) => {
          onUpdateMeal(mealId, updates);
          setEditingMeal(null);
        }}
      />
    </>
  );
};