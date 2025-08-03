import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SimpleUnifiedCoachChat from '@/components/SimpleUnifiedCoachChat';
import { WorkoutTimer } from '@/components/WorkoutTimer';
import { MessageCircle, X, Minimize2, Maximize2, Timer } from 'lucide-react';

interface TrainingFloatingCoachProps {
  isOpen: boolean;
  onToggle: () => void;
  onExerciseLogged: () => void;
}

export const TrainingFloatingCoach: React.FC<TrainingFloatingCoachProps> = ({
  isOpen,
  onToggle,
  onExerciseLogged
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) {
    return (
      <>
        {/* Floating Timer Display */}
        <WorkoutTimer variant="floating" showControls={false} />
        
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {/* Timer Button */}
          <WorkoutTimer variant="compact" className="self-end" />
          
          {/* Chat Button */}
          <Button
            onClick={onToggle}
            size="lg"
            className="rounded-full w-14 h-14 bg-gradient-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      </>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 shadow-xl border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Coach Sascha
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(false)}
                  className="h-6 w-6 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Coach ist bereit für deine Fragen...
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="w-full mt-2"
            >
              Chat öffnen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[500px] shadow-xl border-primary/20 flex flex-col">
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Coach Sascha
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-6 w-6 p-0"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          {/* Timer in Chat Header */}
          <div className="p-3 border-b bg-secondary/20">
            <WorkoutTimer variant="compact" />
          </div>
          
          <div className="flex-1 overflow-hidden">
            <SimpleUnifiedCoachChat mode="training" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};