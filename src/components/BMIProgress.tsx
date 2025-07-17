
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface BMIProgressProps {
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  height: number;
}

const BMIProgress = ({ startWeight, currentWeight, targetWeight, height }: BMIProgressProps) => {
  const heightInMeters = height / 100;
  
  const startBMI = startWeight / (heightInMeters * heightInMeters);
  const currentBMI = currentWeight / (heightInMeters * heightInMeters);
  const targetBMI = targetWeight / (heightInMeters * heightInMeters);
  
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Untergewicht', color: 'bg-blue-500' };
    if (bmi < 25) return { text: 'Normal', color: 'bg-green-500' };
    if (bmi < 30) return { text: 'Übergewicht', color: 'bg-yellow-500' };
    return { text: 'Adipositas', color: 'bg-red-500' };
  };
  
  const startCategory = getBMICategory(startBMI);
  const currentCategory = getBMICategory(currentBMI);
  const targetCategory = getBMICategory(targetBMI);
  
  // Calculate progress percentage
  const totalProgress = Math.abs(startBMI - targetBMI);
  const currentProgress = Math.abs(startBMI - currentBMI);
  const progressPercentage = totalProgress > 0 ? (currentProgress / totalProgress) * 100 : 0;
  
  const isLosingWeight = startBMI > targetBMI;
  const progressDirection = isLosingWeight ? 'Abnehmen' : 'Zunehmen';
  
  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-blue-800">BMI Fortschritt</h4>
        <Badge variant="outline" className="text-blue-700">
          {progressDirection}
        </Badge>
      </div>
      
      {/* BMI Values Display */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Start BMI</div>
          <div className="text-lg font-bold text-blue-600">{startBMI.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{startWeight}kg</div>
          <Badge variant="secondary" className={`text-xs ${startCategory.color} text-white`}>
            {startCategory.text}
          </Badge>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Aktuell BMI</div>
          <div className="text-xl font-bold text-primary">{currentBMI.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{currentWeight}kg</div>
          <Badge variant="secondary" className={`text-xs ${currentCategory.color} text-white`}>
            {currentCategory.text}
          </Badge>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Ziel BMI</div>
          <div className="text-lg font-bold text-green-600">{targetBMI.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{targetWeight}kg</div>
          <Badge variant="secondary" className={`text-xs ${targetCategory.color} text-white`}>
            {targetCategory.text}
          </Badge>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start</span>
          <span>{progressPercentage.toFixed(0)}% erreicht</span>
          <span>Ziel</span>
        </div>
        
        <Progress 
          value={Math.min(progressPercentage, 100)} 
          className="h-3"
        />
        
        <div className="text-center">
          <span className="text-sm font-medium text-primary">
            {Math.abs(currentBMI - targetBMI).toFixed(1)} BMI Punkte bis zum Ziel
          </span>
        </div>
      </div>
      
      {/* Motivation Message */}
      <div className="mt-4 p-3 bg-white/50 rounded-lg">
        <div className="text-sm text-center">
          {progressPercentage >= 75 ? (
            <span className="text-green-600 font-medium">🎉 Fantastisch! Du bist fast am Ziel!</span>
          ) : progressPercentage >= 50 ? (
            <span className="text-blue-600 font-medium">💪 Großartig! Du bist auf dem halben Weg!</span>
          ) : progressPercentage >= 25 ? (
            <span className="text-orange-600 font-medium">🚀 Super Start! Weiter so!</span>
          ) : (
            <span className="text-purple-600 font-medium">🌟 Los geht's! Jeder Schritt zählt!</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BMIProgress;
