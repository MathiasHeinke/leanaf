import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Plus, Loader2 } from 'lucide-react';

interface TrainingPlanQuickActionProps {
  onCreatePlan: () => void;
  isLoading?: boolean;
  className?: string;
}

export const TrainingPlanQuickAction: React.FC<TrainingPlanQuickActionProps> = ({
  onCreatePlan,
  isLoading = false,
  className = ""
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full max-w-4xl mx-auto mb-4 ${className}`}
    >
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,auto] items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold">
                Personalisierter Trainingsplan
              </h4>
              <p className="text-sm text-muted-foreground">
                Erstelle einen evidenzbasierten Plan basierend auf deinen Daten
              </p>
            </div>
            <div className="justify-self-start md:justify-self-end">
              <Button 
                onClick={onCreatePlan}
                disabled={isLoading}
                variant="default"
                aria-label="Trainingsplan erstellen"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Trainingsplan erstellen
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};