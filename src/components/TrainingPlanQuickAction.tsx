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
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Dumbbell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                  Personalisierter Trainingsplan
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Erstelle einen evidenzbasierten Plan basierend auf deinen Daten
                </p>
              </div>
            </div>
            <Button 
              onClick={onCreatePlan}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
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
        </CardContent>
      </Card>
    </motion.div>
  );
};