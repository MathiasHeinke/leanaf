import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ChevronRight, Moon, Droplets, Pill, Scale, Activity } from "lucide-react";
import { toast } from "sonner";

interface QuickInputData {
  date: string;
  displayDate: string;
  sleepData?: {
    id: string;
    sleep_hours: number;
    sleep_quality: number;
    notes?: string;
    bedtime?: string;
    wake_time?: string;
    sleep_interruptions?: number;
    screen_time_evening?: number;
    morning_libido?: number;
    motivation_level?: number;
    last_meal_time?: string;
    sleep_score?: number;
  };
  fluidData: {
    id: string;
    amount_ml: number;
    consumed_at: string;
    fluid_name?: string;
    custom_name?: string;
    notes?: string;
  }[];
  supplementData: {
    id: string;
    taken: boolean;
    timing: string;
    notes?: string;
    taken_at: string;
    supplement_name: string;
    dosage?: number;
    unit?: string;
  }[];
  bodyMeasurements: {
    id: string;
    arms?: number;
    belly?: number;
    chest?: number;
    hips?: number;
    neck?: number;
    thigh?: number;
    waist?: number;
    notes?: string;
  }[];
}

interface QuickInputHistoryProps {
  timeRange: 'week' | 'month' | 'year';
}

export const QuickInputHistory = ({ timeRange }: QuickInputHistoryProps) => {
  const [historyData, setHistoryData] = useState<QuickInputData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadQuickInputHistory();
    }
  }, [user, timeRange]);

  const loadQuickInputHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const daysToLoad = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);

      // Load sleep data
      const { data: sleepData, error: sleepError } = await supabase
        .from('sleep_tracking')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (sleepError) throw sleepError;

      // Load fluid data
      const { data: fluidData, error: fluidError } = await supabase
        .from('user_fluids')
        .select(`
          *,
          fluid_database(name)
        `)
        .eq('user_id', user.id)
        .gte('consumed_at', startDate.toISOString())
        .order('consumed_at', { ascending: false });

      if (fluidError) throw fluidError;

      // Load supplement data
      const { data: supplementData, error: supplementError } = await supabase
        .from('supplement_intake_log')
        .select(`
          *,
          user_supplements!inner(
            custom_name,
            dosage,
            unit
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (supplementError) throw supplementError;

      // Load body measurements
      const { data: bodyMeasurementsData, error: bodyError } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (bodyError) throw bodyError;

      // Group data by date
      const groupedData = new Map<string, QuickInputData>();
      
      // Initialize all days
      for (let i = 0; i < daysToLoad; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        groupedData.set(dateStr, {
          date: dateStr,
          displayDate: date.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit' 
          }),
          fluidData: [],
          supplementData: [],
          bodyMeasurements: []
        });
      }

      // Add sleep data
      sleepData?.forEach(sleep => {
        const day = groupedData.get(sleep.date);
        if (day) {
          day.sleepData = {
            id: sleep.id,
            sleep_hours: sleep.sleep_hours,
            sleep_quality: sleep.sleep_quality,
            notes: sleep.notes,
            bedtime: sleep.bedtime,
            wake_time: sleep.wake_time,
            sleep_interruptions: sleep.sleep_interruptions,
            screen_time_evening: sleep.screen_time_evening,
            morning_libido: sleep.morning_libido,
            motivation_level: sleep.motivation_level,
            last_meal_time: sleep.last_meal_time,
            sleep_score: sleep.sleep_score
          };
        }
      });

      // Add fluid data
      fluidData?.forEach(fluid => {
        const date = new Date(fluid.consumed_at).toISOString().split('T')[0];
        const day = groupedData.get(date);
        if (day) {
          day.fluidData.push({
            id: fluid.id,
            amount_ml: fluid.amount_ml,
            consumed_at: fluid.consumed_at,
            fluid_name: fluid.fluid_database?.name,
            custom_name: fluid.custom_name,
            notes: fluid.notes
          });
        }
      });

      // Add supplement data
      supplementData?.forEach(supplement => {
        const date = new Date(supplement.created_at).toISOString().split('T')[0];
        const day = groupedData.get(date);
        if (day) {
          day.supplementData.push({
            id: supplement.id,
            taken: supplement.taken,
            timing: supplement.timing,
            notes: supplement.notes,
            taken_at: supplement.created_at,
            supplement_name: supplement.user_supplements?.custom_name || 'Unbekanntes Supplement',
            dosage: supplement.user_supplements?.dosage ? Number(supplement.user_supplements.dosage) : undefined,
            unit: supplement.user_supplements?.unit
          });
        }
      });

      // Add body measurements
      bodyMeasurementsData?.forEach(measurement => {
        const day = groupedData.get(measurement.date);
        if (day) {
          day.bodyMeasurements.push({
            id: measurement.id,
            arms: measurement.arms,
            belly: measurement.belly,
            chest: measurement.chest,
            hips: measurement.hips,
            neck: measurement.neck,
            thigh: measurement.thigh,
            waist: measurement.waist,
            notes: measurement.notes
          });
        }
      });

      const historyArray = Array.from(groupedData.values())
        .sort((a, b) => b.date.localeCompare(a.date));

      setHistoryData(historyArray);
    } catch (error) {
      console.error('Error loading quick input history:', error);
      toast.error('Fehler beim Laden der Quick Input Daten');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const hasAnyData = (day: QuickInputData) => {
    return day.sleepData || 
           day.fluidData.length > 0 || 
           day.supplementData.length > 0 || 
           day.bodyMeasurements.length > 0;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">
          <Activity className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Lade Quick Input Verlauf...</p>
        </div>
      </div>
    );
  }

  const daysWithData = historyData.filter(hasAnyData);

  if (daysWithData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Noch keine Quick Input Daten</h3>
          <p className="text-muted-foreground mb-4">
            Nutze die Quick Input Funktionen, um hier deinen Verlauf zu sehen!
          </p>
          <div className="text-sm text-muted-foreground">
            <p>😴 Schlaf-Tracking</p>
            <p>💧 Flüssigkeits-Tracking</p>
            <p>💊 Supplement-Tracking</p>
            <p>📏 Körpermessungen</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {daysWithData.map((day) => (
        <Card key={day.date}>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {expandedDays.has(day.date) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <h3 className="font-semibold">{day.displayDate}</h3>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {day.sleepData && (
                      <Badge variant="secondary" className="text-xs">
                        <Moon className="h-3 w-3 mr-1" />
                        {day.sleepData.sleep_hours}h
                      </Badge>
                    )}
                    {day.fluidData.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Droplets className="h-3 w-3 mr-1" />
                        {day.fluidData.reduce((sum, f) => sum + f.amount_ml, 0)}ml
                      </Badge>
                    )}
                    {day.supplementData.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Pill className="h-3 w-3 mr-1" />
                        {day.supplementData.length}
                      </Badge>
                    )}
                    {day.bodyMeasurements.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Scale className="h-3 w-3 mr-1" />
                        {day.bodyMeasurements.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Sleep Data */}
                {day.sleepData && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Schlaf</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <p>Dauer: {day.sleepData.sleep_hours} Stunden</p>
                        <p>Qualität: {day.sleepData.sleep_quality}/10</p>
                        {day.sleepData.bedtime && <p>Zu Bett: {day.sleepData.bedtime.slice(0, 5)}</p>}
                        {day.sleepData.wake_time && <p>Aufgestanden: {day.sleepData.wake_time.slice(0, 5)}</p>}
                        {day.sleepData.sleep_interruptions !== undefined && (
                          <p>Aufgewacht: {day.sleepData.sleep_interruptions}x</p>
                        )}
                        {day.sleepData.screen_time_evening !== undefined && (
                          <p>Bildschirmzeit: {day.sleepData.screen_time_evening} Min</p>
                        )}
                        {day.sleepData.morning_libido !== undefined && (
                          <p>Morgenlibido: {day.sleepData.morning_libido}/10</p>
                        )}
                        {day.sleepData.motivation_level !== undefined && (
                          <p>Motivation: {day.sleepData.motivation_level}/10</p>
                        )}
                        {day.sleepData.last_meal_time && (
                          <p>Letzte Mahlzeit: {day.sleepData.last_meal_time.slice(0, 5)}</p>
                        )}
                        {day.sleepData.sleep_score !== undefined && (
                          <p>Sleep Score: {day.sleepData.sleep_score}/10</p>
                        )}
                      </div>
                      {day.sleepData.notes && <p className="mt-2">Notizen: {day.sleepData.notes}</p>}
                    </div>
                  </div>
                )}

                {/* Fluid Data */}
                {day.fluidData.length > 0 && (
                  <div className="bg-cyan-50 dark:bg-cyan-950/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-4 w-4 text-cyan-600" />
                      <span className="font-medium text-sm">Flüssigkeiten</span>
                    </div>
                    <div className="space-y-1">
                      {day.fluidData.map((fluid) => (
                        <div key={fluid.id} className="text-sm text-muted-foreground">
                          <div>
                            {new Date(fluid.consumed_at).toLocaleTimeString('de-DE', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}: <strong>{fluid.custom_name || fluid.fluid_name || 'Unbekanntes Getränk'}</strong> - {fluid.amount_ml}ml
                          </div>
                          {fluid.notes && (
                            <div className="text-xs italic ml-4">Notiz: {fluid.notes}</div>
                          )}
                        </div>
                      ))}
                      <div className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                        Gesamt: {day.fluidData.reduce((sum, f) => sum + f.amount_ml, 0)}ml
                      </div>
                    </div>
                  </div>
                )}

                {/* Supplement Data */}
                {day.supplementData.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm">Supplements</span>
                    </div>
                    <div className="space-y-1">
                      {day.supplementData.map((supplement) => (
                        <div key={supplement.id} className="text-sm text-muted-foreground">
                          {new Date(supplement.taken_at).toLocaleTimeString('de-DE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}: <strong>{supplement.supplement_name}</strong> - {supplement.taken ? 'Eingenommen' : 'Nicht eingenommen'} ({supplement.timing})
                          {supplement.dosage && supplement.unit && (
                            <span className="ml-2 text-xs">({supplement.dosage}{supplement.unit})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body Measurements */}
                {day.bodyMeasurements.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Körpermessungen</span>
                    </div>
                    <div className="space-y-1">
                      {day.bodyMeasurements.map((measurement) => (
                        <div key={measurement.id} className="text-sm text-muted-foreground space-y-1">
                          {measurement.arms && <div>Arme: {measurement.arms} cm</div>}
                          {measurement.belly && <div>Bauch: {measurement.belly} cm</div>}
                          {measurement.chest && <div>Brust: {measurement.chest} cm</div>}
                          {measurement.hips && <div>Hüfte: {measurement.hips} cm</div>}
                          {measurement.neck && <div>Hals: {measurement.neck} cm</div>}
                          {measurement.thigh && <div>Oberschenkel: {measurement.thigh} cm</div>}
                          {measurement.waist && <div>Taille: {measurement.waist} cm</div>}
                          {measurement.notes && <div>Notizen: {measurement.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
};