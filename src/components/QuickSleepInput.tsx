
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Star, Edit2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePointsSystem } from "@/hooks/usePointsSystem";

export const QuickSleepInput = () => {
  const { user } = useAuth();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();
  const [sleepHours, setSleepHours] = useState<string>('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSleep, setExistingSleep] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkExistingSleep();
    }
  }, [user]);

  const checkExistingSleep = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sleep_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking existing sleep:', error);
        return;
      }

      if (data) {
        setExistingSleep(data);
        setSleepHours(data.sleep_hours?.toString() || '');
        setSleepQuality(data.sleep_quality);
      }
    } catch (error) {
      console.error('Error checking existing sleep:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const qualityEmojis = ['😴', '😔', '😐', '😊', '😍'];
  const qualityLabels = ['Grausam', 'Schlecht', 'OK', 'Gut', 'Perfekt'];

  const handleSubmit = async () => {
    if (!user || sleepQuality === null) return;

    setIsSubmitting(true);
    console.log('🛌 Starting sleep tracking submission...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const sleepData = {
        user_id: user.id,
        date: today,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        sleep_quality: sleepQuality
      };

      console.log('💾 Saving sleep data:', sleepData);

      const { error } = await supabase
        .from('sleep_tracking')
        .upsert(sleepData, { onConflict: 'user_id,date' });

      if (error) {
        console.error('❌ Error saving sleep data:', error);
        throw error;
      }

      console.log('✅ Sleep data saved successfully');

      // Award points for sleep tracking
      const pointsEarned = getPointsForActivity('sleep_tracked');
      console.log(`🎯 Awarding ${pointsEarned} points for sleep tracking`);
      
      const pointsResult = await awardPoints(
        'sleep_tracked', 
        pointsEarned, 
        `Schlaf erfasst (Qualität: ${sleepQuality}/5)`
      );
      
      console.log('🎉 Points awarded result:', pointsResult);
      
      const streakResult = await updateStreak('sleep_tracking');
      console.log('🔥 Streak updated result:', streakResult);

      // Show success toast with longer duration and better visibility
      toast.success(`Schlaf erfasst! 😴💤 (+${pointsEarned} Punkte)`, {
        duration: 4000,
        position: "top-center",
      });
      
      // Update existing sleep state
      setExistingSleep({
        ...sleepData,
        sleep_hours: sleepData.sleep_hours,
        sleep_quality: sleepData.sleep_quality
      });
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Error in sleep tracking:', error);
      toast.error('Fehler beim Speichern der Schlaf-Daten', {
        duration: 4000,
        position: "top-center",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-indigo-50/50 via-indigo-25/30 to-indigo-50/20 dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-indigo-950/5 border-indigo-200/30 dark:border-indigo-800/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-indigo-200/50 rounded w-32"></div>
          <div className="h-12 bg-indigo-200/50 rounded"></div>
        </div>
      </Card>
    );
  }

  // Show read-only summary if sleep already exists and not editing
  if (existingSleep && !isEditing) {
    const getTip = () => {
      const quality = existingSleep.sleep_quality;
      if (quality >= 4) {
        return "Excellenter Schlaf! Du bist bereit für alles was der Tag bringt! 🌟";
      } else if (quality === 3) {
        return "Solider Schlaf! Versuche eine regelmäßige Schlafenszeit beizubehalten. 💤";
      } else {
        return "Schlaf ist wichtig für deine Gesundheit. Versuche heute Abend früher ins Bett zu gehen. 🛌";
      }
    };

    return (
      <Card className="p-6 bg-gradient-to-br from-indigo-50/50 via-indigo-25/30 to-indigo-50/20 dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-indigo-950/5 border-indigo-200/30 dark:border-indigo-800/30">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-lg">Schlaf heute</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Bearbeiten
            </Button>
          </div>

          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-500" />
              <span className="font-medium">Schlaf erfasst!</span>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              {existingSleep.sleep_hours && <div>Dauer: {existingSleep.sleep_hours}h</div>}
              <div className="flex items-center gap-2">
                <span>Qualität: {existingSleep.sleep_quality}/5</span>
                <span className="text-base">{qualityEmojis[existingSleep.sleep_quality - 1]}</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg p-3">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              💡 {getTip()}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-50/50 via-indigo-25/30 to-indigo-50/20 dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-indigo-950/5 border-indigo-200/30 dark:border-indigo-800/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-semibold text-lg">{existingSleep ? 'Schlaf bearbeiten' : 'Wie hast du geschlafen?'}</h3>
          </div>
          {existingSleep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Abbrechen
            </Button>
          )}
        </div>

        {/* Sleep Hours Input */}
        <div>
          <label className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2 block">
            Stunden geschlafen (optional)
          </label>
          <Input
            type="number"
            step="0.5"
            placeholder="7.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            className="border-indigo-200 dark:border-indigo-800"
          />
        </div>

        {/* Sleep Quality Buttons */}
        <div>
          <label className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-3 block flex items-center gap-2">
            <Star className="h-4 w-4" />
            Schlafqualität (1-5)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((quality) => (
              <Button
                key={quality}
                variant={sleepQuality === quality ? "default" : "outline"}
                onClick={() => setSleepQuality(quality)}
                className={`h-16 flex flex-col gap-1 text-xs font-medium ${
                  sleepQuality === quality 
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white' 
                    : 'border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/20'
                }`}
                disabled={isSubmitting}
              >
                <span className="text-lg">{qualityEmojis[quality - 1]}</span>
                <span className="leading-tight" translate="no">{qualityLabels[quality - 1]}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        {sleepQuality !== null && (
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-medium animate-in slide-in-from-bottom-2 duration-300"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Speichere...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Schlaf speichern
              </div>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};
