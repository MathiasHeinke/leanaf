import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Moon, Plus, Edit, CheckCircle, ChevronDown, ChevronUp, Clock, Smartphone, Heart, Zap, Utensils, Sun, EyeOff, Eye, Info } from "lucide-react";
import { SmartChip } from './ui/smart-chip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { InfoButton } from "@/components/InfoButton";

import { PointsBadge } from "@/components/PointsBadge";
import { getCurrentDateString } from "@/utils/dateHelpers";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';

interface QuickSleepInputProps {
  onSleepAdded?: (sleepData?: any) => void;
  todaysSleep?: any;
  currentDate?: Date;
}

export const QuickSleepInput = ({ onSleepAdded, todaysSleep, currentDate = new Date() }: QuickSleepInputProps) => {
  // Zeit-Schieberegler: Bedtime (22:00) bis Wake time (10:00)
  const [bedtime, setBedtime] = useState<number[]>([22.5]); // 22:30 in Stunden
  const [wakeTime, setWakeTime] = useState<number[]>([7.5]); // 07:30 in Stunden
  const [sleepQuality, setSleepQuality] = useState<number[]>([7]);
  
  // Neue optionale Felder
  const [sleepInterruptions, setSleepInterruptions] = useState<number[]>([0]);
  const [screenTimeEvening, setScreenTimeEvening] = useState<number[]>([60]);
  const [morningLibido, setMorningLibido] = useState<number[]>([5]);
  const [motivationLevel, setMotivationLevel] = useState<number[]>([7]);
  const [lastMealTime, setLastMealTime] = useState<number[]>([19.5]); // 19:30
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeThumb, setActiveThumb] = useState<'bedtime' | 'waketime' | null>(null);
  const [isEditingBedtime, setIsEditingBedtime] = useState(false);
  const [isEditingWaketime, setIsEditingWaketime] = useState(false);
  const [bedtimeInput, setBedtimeInput] = useState("");
  const [waketimeInput, setWaketimeInput] = useState("");
  
  // Individual tracking states for optional fields
  const [trackInterruptions, setTrackInterruptions] = useState(false);
  const [trackScreenTime, setTrackScreenTime] = useState(false);
  const [trackLibido, setTrackLibido] = useState(false);
  const [trackMotivation, setTrackMotivation] = useState(false);
  const [trackLastMeal, setTrackLastMeal] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Berechne Schlafdauer basierend auf Einschlaf- und Aufwachzeit
  const calculateSleepDuration = (bedtimeHours: number, waketimeHours: number) => {
    let duration = waketimeHours - bedtimeHours;
    if (duration < 0) duration += 24; // Übernacht-Berechnung
    return Math.round(duration * 2) / 2; // Auf halbe Stunden runden
  };

  const sleepDuration = calculateSleepDuration(bedtime[0], wakeTime[0]);

  // Convert hours to percentage positions (0-100%)
  const bedtimeHours = bedtime[0];
  const waketimeHours = wakeTime[0];
  const bedtimePosition = (bedtimeHours / 24) * 100;
  const waketimePosition = (waketimeHours / 24) * 100;

  // Hilfsfunktionen für Zeit-Formatierung
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Parse time string to hours
  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes || 0) / 60;
  };

  // Validate time input format
  const isValidTime = (time: string) => {
    const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(time);
  };

  // Handle inline time editing
  const handleTimeEdit = (type: 'bedtime' | 'waketime', timeString: string) => {
    if (!isValidTime(timeString)) {
      toast.error('Ungültiges Zeitformat. Bitte verwende HH:MM (z.B. 22:30)');
      return;
    }
    
    const hours = parseTime(timeString);
    if (type === 'bedtime') {
      setBedtime([hours]);
      setIsEditingBedtime(false);
    } else {
      setWakeTime([hours]);
      setIsEditingWaketime(false);
    }
  };

  // Start editing time
  const startTimeEdit = (type: 'bedtime' | 'waketime') => {
    if (type === 'bedtime') {
      setBedtimeInput(formatTime(bedtime[0]));
      setIsEditingBedtime(true);
    } else {
      setWaketimeInput(formatTime(wakeTime[0]));
      setIsEditingWaketime(true);
    }
  };

  // Custom timeline interaction handlers
  const getTimeFromPosition = (clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return (percentage / 100) * 24;
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const clickedTime = getTimeFromPosition(e.clientX);
    
    // Determine which thumb is closer to the click
    const bedtimeDistance = Math.abs(clickedTime - bedtimeHours);
    const waketimeDistance = Math.abs(clickedTime - waketimeHours);
    
    if (bedtimeDistance <= waketimeDistance) {
      setBedtime([clickedTime]);
    } else {
      setWakeTime([clickedTime]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, thumb: 'bedtime' | 'waketime') => {
    e.preventDefault();
    setIsDragging(true);
    setActiveThumb(thumb);

    const handleMouseMove = (e: MouseEvent) => {
      const newTime = getTimeFromPosition(e.clientX);
      const roundedTime = Math.round(newTime * 2) / 2; // Round to 0.5 hour increments
      
      if (thumb === 'bedtime') {
        // Auto-snap logic: if bedtime gets too close to waketime, push waketime forward
        if (Math.abs(roundedTime - waketimeHours) < 4) {
          const newWaketime = (roundedTime + 7) % 24;
          setWakeTime([newWaketime]);
        }
        setBedtime([roundedTime]);
      } else {
        // Auto-snap logic: if waketime gets too close to bedtime, push bedtime backward
        if (Math.abs(roundedTime - bedtimeHours) < 4) {
          let newBedtime = roundedTime - 7;
          if (newBedtime < 0) newBedtime += 24;
          setBedtime([newBedtime]);
        }
        setWakeTime([roundedTime]);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveThumb(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent, thumb: 'bedtime' | 'waketime') => {
    e.preventDefault();
    setIsDragging(true);
    setActiveThumb(thumb);

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newTime = getTimeFromPosition(touch.clientX);
      const roundedTime = Math.round(newTime * 2) / 2;
      
      if (thumb === 'bedtime') {
        if (Math.abs(roundedTime - waketimeHours) < 4) {
          const newWaketime = (roundedTime + 7) % 24;
          setWakeTime([newWaketime]);
        }
        setBedtime([roundedTime]);
      } else {
        if (Math.abs(roundedTime - bedtimeHours) < 4) {
          let newBedtime = roundedTime - 7;
          if (newBedtime < 0) newBedtime += 24;
          setBedtime([newBedtime]);
        }
        setWakeTime([roundedTime]);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setActiveThumb(null);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Check if sleep already exists for today
  const hasSleepToday = todaysSleep && (todaysSleep.sleep_hours !== null || todaysSleep.bedtime !== null);

  useEffect(() => {
    if (hasSleepToday && !isEditing) {
      // Pre-fill form with existing data
      if (todaysSleep.bedtime) setBedtime([parseFloat(todaysSleep.bedtime.split(':')[0]) + parseFloat(todaysSleep.bedtime.split(':')[1]) / 60]);
      if (todaysSleep.wake_time) setWakeTime([parseFloat(todaysSleep.wake_time.split(':')[0]) + parseFloat(todaysSleep.wake_time.split(':')[1]) / 60]);
      setSleepQuality([todaysSleep.sleep_quality || 7]);
      setSleepInterruptions([todaysSleep.sleep_interruptions || 0]);
      setScreenTimeEvening([todaysSleep.screen_time_evening || 60]);
      setMorningLibido([todaysSleep.morning_libido || 5]);
      setMotivationLevel([todaysSleep.motivation_level || 7]);
      if (todaysSleep.last_meal_time) setLastMealTime([parseFloat(todaysSleep.last_meal_time.split(':')[0]) + parseFloat(todaysSleep.last_meal_time.split(':')[1]) / 60]);
    }
  }, [hasSleepToday, todaysSleep, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Sleep submission started

      const sleepData = {
        user_id: user.id,
        sleep_hours: sleepDuration,
        sleep_quality: sleepQuality[0],
        bedtime: formatTime(bedtime[0]),
        wake_time: formatTime(wakeTime[0]),
        sleep_interruptions: trackInterruptions ? sleepInterruptions[0] : null,
        screen_time_evening: trackScreenTime ? screenTimeEvening[0] : null,
        morning_libido: trackLibido ? morningLibido[0] : null,
        motivation_level: trackMotivation ? motivationLevel[0] : null,
        last_meal_time: trackLastMeal ? formatTime(lastMealTime[0]) : null,
        date: currentDate.toISOString().split('T')[0]
      };

      // Sleep data prepared for save

      if (hasSleepToday && todaysSleep?.id) {
        // Update existing sleep entry - no points awarded
        // Updating existing sleep entry
        const { error, data } = await supabase
          .from('sleep_tracking')
          .update({
            sleep_hours: sleepData.sleep_hours,
            sleep_quality: sleepData.sleep_quality,
            bedtime: sleepData.bedtime,
            wake_time: sleepData.wake_time,
            sleep_interruptions: sleepData.sleep_interruptions,
            screen_time_evening: sleepData.screen_time_evening,
            morning_libido: sleepData.morning_libido,
            motivation_level: sleepData.motivation_level,
            last_meal_time: sleepData.last_meal_time,
            updated_at: new Date().toISOString()
          })
          .eq('id', todaysSleep.id);

        // Sleep update completed
        if (error) throw error;
        // UI-Feedback bereits durch direkte Anzeige der Änderung
      } else {
        // Optimistic update - immediately show the sleep data
        toast.success('Schlaf wird gespeichert...');
        
        // Create new sleep entry using UPSERT with correct constraint reference
        // Creating new sleep entry
        try {
          const { error, data } = await supabase
            .from('sleep_tracking')
            .upsert(sleepData, { 
              onConflict: 'user_id, date'  // Fixed: proper column reference
            });

          // Sleep insert completed
          if (error) throw error;

          // Award points for sleep tracking
          try {
            const clientEventId = uuidv4();
            await awardPoints('sleep_tracked', getPointsForActivity('sleep_tracked'), 'Schlaf eingetragen', 1.0, undefined, undefined, clientEventId);
            await updateStreak('sleep_tracking');

            // Show points animation
            setShowPointsAnimation(true);
            setTimeout(() => setShowPointsAnimation(false), 3000);
          } catch (pointsError) {
            console.error('🎯 [QuickSleepInput] Points award failed (non-critical):', pointsError);
          }
        } catch (error) {
          console.error('Error saving sleep:', error);
          throw error; // Re-throw to trigger the catch block below
        }
      }


      triggerDataRefresh();
      setIsEditing(false);
      onSleepAdded?.();
    } catch (error) {
      console.error('❌ Error saving sleep:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error('Fehler beim Speichern der Schlafdaten: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = !!hasSleepToday;
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Calculate sleep quality percentage for progress
  const sleepQualityPercent = hasSleepToday ? ((todaysSleep?.sleep_quality || 0) / 10) * 100 : 0;

  // Smart chip actions
  const smartChips = [
    { label: "7h Schlaf", action: () => { setBedtime([23]); setWakeTime([6]); setIsEditing(true); } },
    { label: "8h Schlaf", action: () => { setBedtime([22.5]); setWakeTime([6.5]); setIsEditing(true); } },
    { label: "Schlechte Nacht", action: () => { setSleepQuality([3]); setIsEditing(true); } }
  ];

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <Card className="p-4">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between hover:bg-muted/50 rounded-md p-2 -m-2"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Schlaf & Regeneration</h2>
            </div>
            <div className="text-muted-foreground hover:text-foreground">
              {!isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Collapsed summary when card is closed */}
        {isCollapsed && (
          <div className="mt-3 space-y-1 text-sm">
            {hasSleepToday ? (
              <div className="flex items-center gap-3">
                <div className="font-medium">
                  {todaysSleep?.sleep_hours || 0}h Schlaf • Qualität: {todaysSleep?.sleep_quality || 0}/10
                </div>
                <Progress
                  className="h-2 w-24 md:w-32"
                  value={sleepQualityPercent}
                  aria-label="Schlaf-Qualität"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Progress
                  className="h-2 w-24 md:w-32 animate-pulse border border-dashed border-muted-foreground/30"
                  value={0}
                  aria-label="Bereit für Eingabe"
                />
                <SmartChip variant="primary" size="sm" onClick={() => setIsCollapsed(false)}>
                  Jetzt erfassen
                </SmartChip>
              </div>
            )}
          </div>
        )}

        {/* Smart Chips for quick actions - visible in both collapsed and expanded states */}
        {!hasSleepToday && smartChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {smartChips.map((chip, index) => (
              <SmartChip
                key={index}
                variant="secondary"
                size="default"
                icon={<Moon className="h-3.5 w-3.5" />}
                onClick={() => { chip.action(); setIsCollapsed(false); }}
              >
                {chip.label}
              </SmartChip>
            ))}
          </div>
        )}

        <CollapsibleContent>
          <div className="mt-3">
          {hasSleepToday && !isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Schlaf eingetragen! 😴</h3>
                </div>
                <div className="flex items-center gap-2">
                  <InfoButton
                    title="Schlaf Tracking"
                    description="Qualitätsvollser Schlaf ist essentiell für Regeneration, Hormonbalance und erfolgreiche Gewichtsabnahme. 7-9 Stunden sind optimal."
                    scientificBasis="Studien belegen: Weniger als 6 Stunden Schlaf erhöhen das Risiko für Gewichtszunahme um 30% und verschlechtern die Insulinresistenz."
                    tips={[
                      "7-9 Stunden Schlaf für optimale Regeneration",
                      "Feste Schlafzeiten unterstützen den Biorhythmus",
                      "Bildschirme 1h vor dem Schlafen vermeiden"
                    ]}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-primary border-primary/20 hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Points badges directly under title */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <PointsBadge 
                  points={4} 
                  icon="😴"
                  animated={showPointsAnimation}
                  variant="secondary"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Schlafdauer</div>
                  <div className="text-lg font-semibold">{todaysSleep?.sleep_hours || 0}h</div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Qualität</div>
                  <div className="text-lg font-semibold">{todaysSleep?.sleep_quality || 0}/10</div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {todaysSleep.bedtime && todaysSleep.wake_time 
                  ? `${todaysSleep.bedtime} - ${todaysSleep.wake_time}` 
                  : `${todaysSleep.sleep_hours || 0} Stunden`
                }
                {todaysSleep.sleep_interruptions > 0 && ` • ${todaysSleep.sleep_interruptions}x unterbrochen`}
              </p>
          
          {(todaysSleep.screen_time_evening || todaysSleep.morning_libido || todaysSleep.motivation_level) && (
            <div className="text-xs text-muted-foreground space-y-1">
              {todaysSleep.screen_time_evening > 0 && (
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Bildschirmzeit: {todaysSleep.screen_time_evening} min
                </div>
              )}
                {todaysSleep.morning_libido && (
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Libido und Vitalität: {todaysSleep.morning_libido}/10
                </div>
              )}
              {todaysSleep.motivation_level && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Morgendliche Motivation: {todaysSleep.motivation_level}/10
                </div>
              )}
              {todaysSleep.last_meal_time && (
                <div className="flex items-center gap-1">
                  <Utensils className="h-3 w-3" />
                  Letzte Mahlzeit: {todaysSleep.last_meal_time}
                </div>
              )}
            </div>
          )}
          
          
          <div className="rounded-lg p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              <strong>Tipp:</strong> Optimiere deinen Schlaf für bessere Regeneration!
            </p>
            <p className="text-xs text-muted-foreground">
              • 7-9 Stunden Schlaf für optimale Regeneration<br/>
              • Feste Schlafzeiten unterstützen den Biorhythmus<br/>
              • Bildschirme 1h vor dem Schlafen vermeiden<br/>
              • Kühles, dunkles Schlafzimmer für bessere Schlafqualität
            </p>
            <p className="text-xs text-indigo-600 mt-2">
              <strong>Nächster Schlaf:</strong> Heute Abend 😴
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-xl">
              <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-200">
                {hasSleepToday ? 'Schlaf bearbeiten' : 'Schlaf eintragen'}
              </h3>
            </div>
            <InfoButton
              title="Schlaf Tracking"
              description="Qualitätsvollser Schlaf ist essentiell für Regeneration, Hormonbalance und erfolgreiche Gewichtsabnahme. 7-9 Stunden sind optimal."
              scientificBasis="Studien belegen: Weniger als 6 Stunden Schlaf erhöhen das Risiko für Gewichtszunahme um 30% und verschlechtern die Insulinresistenz."
              tips={[
                "7-9 Stunden Schlaf für optimale Regeneration",
                "Feste Schlafzeiten unterstützen den Biorhythmus",
                "Bildschirme 1h vor dem Schlafen vermeiden"
              ]}
            />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Interactive 24-Stunden Timeline Bar */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Schlafzeiten:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-indigo-500 hover:text-indigo-700 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Wann bist du ins Bett gegangen und aufgewacht?<br/>Ziehe die Symbole oder klicke zum Bearbeiten.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Inline editable bedtime */}
                {isEditingBedtime ? (
                  <Input
                    type="text"
                    value={bedtimeInput}
                    onChange={(e) => setBedtimeInput(e.target.value)}
                    onBlur={() => {
                      if (bedtimeInput && isValidTime(bedtimeInput)) {
                        handleTimeEdit('bedtime', bedtimeInput);
                      } else {
                        setIsEditingBedtime(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (bedtimeInput && isValidTime(bedtimeInput)) {
                          handleTimeEdit('bedtime', bedtimeInput);
                        }
                      } else if (e.key === 'Escape') {
                        setIsEditingBedtime(false);
                      }
                    }}
                    placeholder="HH:MM"
                    className="w-16 h-6 text-sm px-1 py-0 text-center"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 px-1 py-0.5 rounded transition-colors"
                    onClick={() => startTimeEdit('bedtime')}
                    title="Klicken zum Bearbeiten"
                  >
                    {formatTime(bedtime[0])}
                  </span>
                )}
                
                <span>bis</span>
                
                {/* Inline editable waketime */}
                {isEditingWaketime ? (
                  <Input
                    type="text"
                    value={waketimeInput}
                    onChange={(e) => setWaketimeInput(e.target.value)}
                    onBlur={() => {
                      if (waketimeInput && isValidTime(waketimeInput)) {
                        handleTimeEdit('waketime', waketimeInput);
                      } else {
                        setIsEditingWaketime(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (waketimeInput && isValidTime(waketimeInput)) {
                          handleTimeEdit('waketime', waketimeInput);
                        }
                      } else if (e.key === 'Escape') {
                        setIsEditingWaketime(false);
                      }
                    }}
                    placeholder="HH:MM"
                    className="w-16 h-6 text-sm px-1 py-0 text-center"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 px-1 py-0.5 rounded transition-colors"
                    onClick={() => startTimeEdit('waketime')}
                    title="Klicken zum Bearbeiten"
                  >
                    {formatTime(wakeTime[0])}
                  </span>
                )}
                
                <span className="text-indigo-600 dark:text-indigo-400">({sleepDuration}h)</span>
              </div>
              
              {/* Interactive 24-Hour Timeline */}
              <div className="relative p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                {/* Simplified time markers - only key times */}
                <div className="flex justify-between items-center mb-3 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
                
                {/* Interactive timeline */}
                <div className="relative">
                  {/* Background track with day/night gradient */}
                  <div 
                    className="h-12 w-full rounded-lg bg-gradient-to-r from-blue-400 via-yellow-300 via-yellow-300 via-blue-400 to-blue-600 dark:from-blue-600 dark:via-yellow-600 dark:via-yellow-600 dark:via-blue-600 dark:to-blue-800 relative cursor-pointer border-2 border-indigo-200 dark:border-indigo-700"
                    onClick={handleTimelineClick}
                    ref={timelineRef}
                  >
                    {/* Reduced hour markers - only every 4 hours for cleaner look */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {[0, 4, 8, 12, 16, 20].map((hour) => (
                        <div 
                          key={hour} 
                          className="absolute top-0 bottom-0 flex items-center justify-center"
                          style={{ left: `${(hour / 24) * 100}%` }}
                        >
                          <div className="w-px bg-white/30 h-full absolute"></div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Sleep duration visualization */}
                    <div 
                      className="absolute top-0 h-full bg-purple-600/40 dark:bg-purple-400/40 rounded pointer-events-none transition-all duration-200"
                      style={{
                        left: `${Math.min(bedtimePosition, waketimePosition)}%`,
                        width: `${Math.abs(waketimePosition - bedtimePosition)}%`
                      }}
                    />
                    
                    {/* Bedtime thumb - Moon for sleeping */}
                    <div 
                      className={`absolute top-1/2 w-10 h-10 bg-purple-600 border-3 border-white rounded-full shadow-xl cursor-grab active:cursor-grabbing transition-all duration-200 flex items-center justify-center select-none ${
                        isDragging && activeThumb === 'bedtime' ? 'scale-125 shadow-2xl bg-purple-700' : 'hover:scale-110 hover:bg-purple-700'
                      }`}
                      style={{ 
                        left: `${bedtimePosition}%`, 
                        transform: 'translateX(-50%) translateY(-50%)',
                        zIndex: activeThumb === 'bedtime' ? 30 : 20
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'bedtime')}
                      onTouchStart={(e) => handleTouchStart(e, 'bedtime')}
                    >
                      <Moon className="h-5 w-5 text-white drop-shadow-sm" />
                    </div>
                    
                    {/* Wake time thumb - Sun for waking up */}
                    <div 
                      className={`absolute top-1/2 w-10 h-10 bg-orange-500 border-3 border-white rounded-full shadow-xl cursor-grab active:cursor-grabbing transition-all duration-200 flex items-center justify-center select-none ${
                        isDragging && activeThumb === 'waketime' ? 'scale-125 shadow-2xl bg-orange-600' : 'hover:scale-110 hover:bg-orange-600'
                      }`}
                      style={{ 
                        left: `${waketimePosition}%`, 
                        transform: 'translateX(-50%) translateY(-50%)',
                        zIndex: activeThumb === 'waketime' ? 30 : 20
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'waketime')}
                      onTouchStart={(e) => handleTouchStart(e, 'waketime')}
                    >
                      <Sun className="h-5 w-5 text-white drop-shadow-sm" />
                    </div>
                  </div>
                </div>
                
                {/* Time labels below thumbs */}
                <div className="flex justify-between mt-2 text-xs">
                  <div 
                    className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1"
                    style={{ marginLeft: `${((bedtime[0] - 12) / 24) * 100}%`, transform: 'translateX(-50%)' }}
                  >
                    <Moon className="h-3 w-3" />
                    {formatTime(bedtime[0])}
                  </div>
                  <div 
                    className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1"
                    style={{ marginLeft: `${((wakeTime[0] - 12) / 24) * 100}%`, transform: 'translateX(-50%)' }}
                  >
                    <Sun className="h-3 w-3" />
                    {formatTime(wakeTime[0])}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block flex items-center gap-2">
                Schlafqualität: {sleepQuality[0]}/10
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-purple-500 hover:text-purple-700 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Bewerte die Qualität deines Schlafs.<br/>1 = sehr schlecht, 10 = ausgezeichnet</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Slider
                value={sleepQuality}
                onValueChange={setSleepQuality}
                max={10}
                min={1}
                step={1}
                className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
              />
            </div>

            {/* Rest of the form content... */}
            <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Weitere Details zur Schlafanalyse
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showOptionalFields ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 mt-3">
                {/* ... rest of form fields ... */}
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Speichern...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {hasSleepToday ? 'Aktualisieren' : 'Eintragen'}
                  </div>
                )}
              </Button>
              
              {hasSleepToday && isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-purple-300 text-purple-600"
                >
                  Abbrechen
                </Button>
              )}
            </div>
          </form>
        </div>
          )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};