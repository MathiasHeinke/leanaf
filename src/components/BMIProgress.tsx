
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

interface BMIProgressProps {
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  height: number;
}

const BMIProgress = ({ startWeight, currentWeight, targetWeight, height }: BMIProgressProps) => {
  const { t } = useTranslation();
  const heightInMeters = height / 100;
  
  const startBMI = startWeight / (heightInMeters * heightInMeters);
  const currentBMI = currentWeight / (heightInMeters * heightInMeters);
  const targetBMI = targetWeight / (heightInMeters * heightInMeters);
  
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: t('bmi.underweight'), color: 'bg-blue-500' };
    if (bmi < 25) return { text: t('bmi.normal'), color: 'bg-green-500' };
    if (bmi < 30) return { text: t('bmi.overweight'), color: 'bg-yellow-500' };
    return { text: t('bmi.obesity'), color: 'bg-red-500' };
  };
  
  const startCategory = getBMICategory(startBMI);
  const currentCategory = getBMICategory(currentBMI);
  const targetCategory = getBMICategory(targetBMI);
  
  // Calculate progress percentage
  const totalProgress = Math.abs(startBMI - targetBMI);
  const currentProgress = Math.abs(startBMI - currentBMI);
  const progressPercentage = totalProgress > 0 ? (currentProgress / totalProgress) * 100 : 0;
  
  const isLosingWeight = startBMI > targetBMI;
  const progressDirection = isLosingWeight ? t('bmi.losing') : t('bmi.gaining');
  
  return (
    <div className="glass-card shadow-xl p-4 rounded-3xl border border-border/20">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-foreground">{t('bmi.progress')}</h4>
        <span className="text-sm text-muted-foreground">
          {t('bmi.goal')}: {progressDirection}
        </span>
      </div>
      
      {/* BMI Values Display */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('bmi.startBMI')}</div>
          <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{startBMI.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{startWeight}kg</div>
          <Badge variant="secondary" className={`text-xs ${startCategory.color} text-white mt-1`}>
            {startCategory.text}
          </Badge>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('bmi.currentBMI')}</div>
          <div className="text-xl font-bold text-primary">{currentBMI.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{currentWeight}kg</div>
          <Badge variant="secondary" className={`text-xs ${currentCategory.color} text-white mt-1`}>
            {currentCategory.text}
          </Badge>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('bmi.targetBMI')}</div>
          <div className="text-lg font-bold text-green-500 dark:text-green-400">{targetBMI.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{targetWeight}kg</div>
          <Badge variant="secondary" className={`text-xs ${targetCategory.color} text-white mt-1`}>
            {targetCategory.text}
          </Badge>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start</span>
          <span>{progressPercentage.toFixed(0)}% {t('bmi.achieved')}</span>
          <span>{t('bmi.goal')}</span>
        </div>
        
        <Progress 
          value={Math.min(progressPercentage, 100)} 
          className="h-3"
        />
        
        <div className="text-center">
          <span className="text-sm font-medium text-primary">
            {Math.abs(currentBMI - targetBMI).toFixed(1)} {t('bmi.pointsToGoal')}
          </span>
        </div>
      </div>
      
      {/* Motivation Message */}
      <div className="mt-4 p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/20">
        <div className="text-sm text-center">
          {progressPercentage >= 75 ? (
            <span className="text-green-600 dark:text-green-400 font-medium">{t('bmi.motivation.excellent')}</span>
          ) : progressPercentage >= 50 ? (
            <span className="text-blue-600 dark:text-blue-400 font-medium">{t('bmi.motivation.great')}</span>
          ) : progressPercentage >= 25 ? (
            <span className="text-orange-600 dark:text-orange-400 font-medium">{t('bmi.motivation.good')}</span>
          ) : (
            <span className="text-purple-600 dark:text-purple-400 font-medium">{t('bmi.motivation.start')}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BMIProgress;
