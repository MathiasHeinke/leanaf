import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutCoachChat } from '@/components/WorkoutCoachChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dumbbell, History, Trash2 } from 'lucide-react';

const TrainingSascha = () => {
  const navigate = useNavigate();

  const handleExerciseLogged = () => {
    // Refresh any training data if needed
    console.log('Exercise logged from Sascha chat');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Compact Mobile Header */}
      <div className="flex-shrink-0 border-b border-border/20 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/training')}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Workout/Sascha</h1>
                <p className="text-xs text-muted-foreground">
                  Personal Trainer
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

      {/* Full Height Chat Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        <WorkoutCoachChat onExerciseLogged={handleExerciseLogged} />
      </div>
    </div>
  );
};

export default TrainingSascha;