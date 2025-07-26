import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Moon, Plus, Edit, CheckCircle, ChevronDown, Clock, Smartphone, Heart, Zap, Utensils, Sun, EyeOff, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PremiumGate } from "@/components/PremiumGate";
import { PointsBadge } from "@/components/PointsBadge";
import { CollapsibleQuickInput } from "./CollapsibleQuickInput";

interface QuickSleepInputProps {
  onSleepAdded?: () => void;
  todaysSleep?: any;
}

export const QuickSleepInput = ({ onSleepAdded, todaysSleep }: QuickSleepInputProps) => {
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
        date: new Date().toISOString().split('T')[0]
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
        toast.success('Schlaf aktualisiert!');
      } else {
        // Create new sleep entry using UPSERT with correct constraint reference
        // Creating new sleep entry
        const { error, data } = await supabase
          .from('sleep_tracking')
          .upsert(sleepData, { 
            onConflict: 'user_id, date'  // Fixed: proper column reference
          });

        // Sleep insert completed
        if (error) throw error;

        // Award points for sleep tracking
        await awardPoints('sleep_tracked', getPointsForActivity('sleep_tracked'), 'Schlaf eingetragen');
        await updateStreak('sleep_tracking');

        // Show points animation
        setShowPointsAnimation(true);
        setTimeout(() => setShowPointsAnimation(false), 3000);

        toast.success('Schlaf erfolgreich eingetragen!');
      }

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

  return (
    <CollapsibleQuickInput
      title={hasSleepToday && !isEditing ? "Schlaf erfasst! 😴" : "Schlaf & Regeneration"}
      icon={<Moon className="h-4 w-4 text-white" />}
      isCompleted={isCompleted}
      defaultOpen={false}
      theme="purple"
    >
      {hasSleepToday && !isEditing ? (
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200">Schlaf eingetragen! 😴</h3>
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
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
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
          
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-3">
            {todaysSleep.bedtime && todaysSleep.wake_time 
              ? `${todaysSleep.bedtime} - ${todaysSleep.wake_time}` 
              : `${todaysSleep.sleep_hours || 0} Stunden`
            } • 
            Qualität: {todaysSleep.sleep_quality || 0}/10
            {todaysSleep.sleep_interruptions > 0 && ` • ${todaysSleep.sleep_interruptions}x unterbrochen`}
          </p>
          
          {/* Erweiterte Infos wenn verfügbar */}
          {(todaysSleep.screen_time_evening || todaysSleep.morning_libido || todaysSleep.motivation_level) && (
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-3 space-y-1">
              {todaysSleep.screen_time_evening > 0 && (
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Handyzeit: {todaysSleep.screen_time_evening} min
                </div>
              )}
              {todaysSleep.morning_libido && (
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Libido: {todaysSleep.morning_libido}/10
                </div>
              )}
              {todaysSleep.motivation_level && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Motivation: {todaysSleep.motivation_level}/10
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
          
          <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-3">
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
              <strong>Tipp:</strong> Guter Schlaf = bessere Fettverbrennung!
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              • Während des Schlafs produziert dein Körper Wachstumshormone
              • Schlechter Schlaf erhöht Cortisol und Heißhunger
              • 7-9 Stunden sind optimal für die Regeneration
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
              <strong>Nächste Eintragung:</strong> Morgen 📅
            </p>
          </div>
        </div>
      ) : (
        <PremiumGate 
          feature="sleep_tracking"
          hideable={true}
          fallbackMessage="Schlaf-Tracking ist ein Premium Feature. Upgrade für detailliertes Schlaf-Monitoring!"
        >
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <Moon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-800 dark:text-purple-200">
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
                <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Schlafzeiten: {formatTime(bedtime[0])} bis {formatTime(wakeTime[0])} ({sleepDuration}h)
                </div>
                
                {/* Interactive 24-Hour Timeline */}
                <div className="relative p-4 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  {/* Simplified time markers - only key times */}
                  <div className="flex justify-between items-center mb-3 text-sm font-medium text-purple-700 dark:text-purple-300">
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
                      className="h-12 w-full rounded-lg bg-gradient-to-r from-blue-400 via-yellow-300 via-yellow-300 via-blue-400 to-blue-600 dark:from-blue-600 dark:via-yellow-600 dark:via-yellow-600 dark:via-blue-600 dark:to-blue-800 relative cursor-pointer border-2 border-purple-200 dark:border-purple-700"
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
                <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                  Schlafqualität: {sleepQuality[0]}/10
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

              {/* Aufklappbare weitere Details */}
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
                      Weitere Details (optional)
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showOptionalFields ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 mt-3">
                  {/* Vertical layout with eye toggles */}
                  <div className="space-y-4">
                    {/* Schlafunterbrechungen */}
                    <div className={`flex justify-between items-center ${!trackInterruptions ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                          <Moon className="inline h-3 w-3 mr-1" />
                          Unterbrechungen: {sleepInterruptions[0]}x
                        </label>
                        <Slider
                          value={sleepInterruptions}
                          onValueChange={(value) => {
                            setSleepInterruptions(value);
                            setTrackInterruptions(true);
                          }}
                          max={10}
                          min={0}
                          step={1}
                          disabled={!trackInterruptions}
                          className={`w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600 ${!trackInterruptions ? 'opacity-50' : ''}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrackInterruptions(!trackInterruptions)}
                        className="ml-3 p-2 hover:bg-purple-100 dark:hover:bg-purple-900"
                      >
                        {trackInterruptions ? (
                          <Eye className="h-4 w-4 text-purple-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>

                    {/* Abendliche Handyzeit */}
                    <div className={`flex justify-between items-center ${!trackScreenTime ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                          <Smartphone className="inline h-3 w-3 mr-1" />
                          Handyzeit: {screenTimeEvening[0]}min
                        </label>
                        <Slider
                          value={screenTimeEvening}
                          onValueChange={(value) => {
                            setScreenTimeEvening(value);
                            setTrackScreenTime(true);
                          }}
                          max={300}
                          min={0}
                          step={15}
                          disabled={!trackScreenTime}
                          className={`w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600 ${!trackScreenTime ? 'opacity-50' : ''}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrackScreenTime(!trackScreenTime)}
                        className="ml-3 p-2 hover:bg-purple-100 dark:hover:bg-purple-900"
                      >
                        {trackScreenTime ? (
                          <Eye className="h-4 w-4 text-purple-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>

                    {/* Letzte Mahlzeit */}
                    <div className={`flex justify-between items-center ${!trackLastMeal ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                          <Utensils className="inline h-3 w-3 mr-1" />
                          Letzte Mahlzeit: {formatTime(lastMealTime[0])}
                        </label>
                        <Slider
                          value={lastMealTime}
                          onValueChange={(value) => {
                            setLastMealTime(value);
                            setTrackLastMeal(true);
                          }}
                          max={23.5} // 23:30
                          min={16}   // 16:00
                          step={0.5}
                          disabled={!trackLastMeal}
                          className={`w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600 ${!trackLastMeal ? 'opacity-50' : ''}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrackLastMeal(!trackLastMeal)}
                        className="ml-3 p-2 hover:bg-purple-100 dark:hover:bg-purple-900"
                      >
                        {trackLastMeal ? (
                          <Eye className="h-4 w-4 text-purple-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>

                    {/* Libido am Morgen */}
                    <div className={`flex justify-between items-center ${!trackLibido ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                          <Heart className="inline h-3 w-3 mr-1" />
                          Libido: {morningLibido[0]}/10
                        </label>
                        <Slider
                          value={morningLibido}
                          onValueChange={(value) => {
                            setMorningLibido(value);
                            setTrackLibido(true);
                          }}
                          max={10}
                          min={1}
                          step={1}
                          disabled={!trackLibido}
                          className={`w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600 ${!trackLibido ? 'opacity-50' : ''}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrackLibido(!trackLibido)}
                        className="ml-3 p-2 hover:bg-purple-100 dark:hover:bg-purple-900"
                      >
                        {trackLibido ? (
                          <Eye className="h-4 w-4 text-purple-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>

                    {/* Motivations-Level */}
                    <div className={`flex justify-between items-center ${!trackMotivation ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                          <Zap className="inline h-3 w-3 mr-1" />
                          Motivations-Level: {motivationLevel[0]}/10
                        </label>
                        <Slider
                          value={motivationLevel}
                          onValueChange={(value) => {
                            setMotivationLevel(value);
                            setTrackMotivation(true);
                          }}
                          max={10}
                          min={1}
                          step={1}
                          disabled={!trackMotivation}
                          className={`w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600 ${!trackMotivation ? 'opacity-50' : ''}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrackMotivation(!trackMotivation)}
                        className="ml-3 p-2 hover:bg-purple-100 dark:hover:bg-purple-900"
                      >
                        {trackMotivation ? (
                          <Eye className="h-4 w-4 text-purple-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Ausblenden Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOptionalFields(false)}
                      className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      Ausblenden
                    </Button>
                  </div>
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
        </PremiumGate>
      )}
    </CollapsibleQuickInput>
  );
};