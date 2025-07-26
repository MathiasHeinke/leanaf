import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutCoachChat } from '@/components/WorkoutCoachChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dumbbell } from 'lucide-react';

const TrainingSascha = () => {
  const navigate = useNavigate();

  const handleExerciseLogged = () => {
    // Refresh any training data if needed
    console.log('Exercise logged from Sascha chat');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/training')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zu Training+
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Coach Sascha</h1>
                <p className="text-sm text-muted-foreground">
                  Dein Personal Trainer für Krafttraining
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="h-[calc(100vh-180px)]">
          <WorkoutCoachChat onExerciseLogged={handleExerciseLogged} />
        </div>
      </div>
    </div>
  );
};

export default TrainingSascha;