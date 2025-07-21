import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Star } from "lucide-react";
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

  const qualityEmojis = ['😴', '😔', '😐', '😊', '😍'];
  const qualityLabels = ['Sehr schlecht', 'Schlecht', 'OK', 'Gut', 'Perfekt'];

  const handleSubmit = async () => {
    if (!user || sleepQuality === null) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const sleepData = {
        user_id: user.id,
        date: today,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        sleep_quality: sleepQuality
      };

      const { error } = await supabase
        .from('sleep_tracking')
        .upsert(sleepData, { onConflict: 'user_id,date' });

      if (error) throw error;

      // Award points for sleep tracking
      await awardPoints('sleep_tracked', getPointsForActivity('sleep_tracked'), `Schlaf erfasst (Qualität: ${sleepQuality}/5)`);
      await updateStreak('sleep_tracking');

      toast.success('Schlaf erfasst! 😴💤');
      
      // Reset form
      setSleepHours('');
      setSleepQuality(null);
    } catch (error) {
      console.error('Error saving sleep data:', error);
      toast.error('Fehler beim Speichern der Schlaf-Daten');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-50/50 via-indigo-25/30 to-indigo-50/20 dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-indigo-950/5 border-indigo-200/30 dark:border-indigo-800/30">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold text-lg">Wie hast du geschlafen?</h3>
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
                <span className="leading-tight">{qualityLabels[quality - 1]}</span>
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