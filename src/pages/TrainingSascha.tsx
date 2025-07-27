import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutCoachChat } from '@/components/WorkoutCoachChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dumbbell, History, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TrainingSascha = () => {
  const navigate = useNavigate();
  const [coachData, setCoachData] = useState<any>(null);

  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_specializations')
        .select('*')
        .eq('coach_id', 'sascha')
        .single();

      if (error) {
        console.error('Error loading coach data:', error);
        return;
      }

      setCoachData(data);
    } catch (error) {
      console.error('Error in loadCoachData:', error);
    }
  };

  const handleExerciseLogged = () => {
    // Refresh any training data if needed
    console.log('Exercise logged from Sascha chat');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Coach Profile Header */}
      <div className="flex-shrink-0 border-b border-border/20 bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/training')}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {/* Coach Profile Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Sascha</h1>
                  <p className="text-sm text-muted-foreground">
                    {coachData?.name?.replace('Sascha - ', '') || 'Personal Trainer'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="p-2">
                <History className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Height Chat Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        <WorkoutCoachChat onExerciseLogged={handleExerciseLogged} />
      </div>
    </div>
  );
};

export default TrainingSascha;