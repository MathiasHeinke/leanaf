export type UserGoal = 'lose' | 'gain' | 'maintain';
export type GoalStatus = 'success' | 'warning' | 'danger';

export interface GoalStatusResult {
  status: GoalStatus;
  message: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  motivationalMessage: string;
}

export const getGoalStatus = (
  actualCalories: number,
  targetCalories: number,
  goal: UserGoal
): GoalStatusResult => {
  const percentage = (actualCalories / targetCalories) * 100;
  
  switch (goal) {
    case 'lose':
      if (percentage <= 80) {
        return {
          status: 'success',
          message: 'Perfekt! Du bleibst unter deinem Ziel',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200',
          icon: '🎯',
          motivationalMessage: 'Fantastisch! Du bist auf dem besten Weg dein Ziel zu erreichen!'
        };
      } else if (percentage <= 100) {
        return {
          status: 'warning',
          message: 'Gut! Du bist nah an deinem Ziel',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '⚡',
          motivationalMessage: 'Sehr gut! Du hältst dich an dein Kalorienziel.'
        };
      } else {
        return {
          status: 'danger',
          message: 'Achtung! Du hast dein Ziel überschritten',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '⚠️',
          motivationalMessage: 'Kein Problem! Morgen ist ein neuer Tag für dein Ziel.'
        };
      }
    
    case 'gain':
      if (percentage >= 110) {
        return {
          status: 'success',
          message: 'Perfekt! Du erreichst dein Ziel',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200',
          icon: '🎯',
          motivationalMessage: 'Fantastisch! Du schaffst es deine Kalorienziele zu erreichen!'
        };
      } else if (percentage >= 95) {
        return {
          status: 'warning',
          message: 'Gut! Du bist nah an deinem Ziel',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '⚡',
          motivationalMessage: 'Sehr gut! Du bist auf dem richtigen Weg zu deinem Ziel.'
        };
      } else {
        return {
          status: 'danger',
          message: 'Du solltest noch mehr essen',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '🍽️',
          motivationalMessage: 'Denk dran: Für dein Ziel brauchst du mehr Kalorien!'
        };
      }
    
    case 'maintain':
      if (percentage >= 90 && percentage <= 110) {
        return {
          status: 'success',
          message: 'Perfekt! Du hältst dein Gewicht',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200',
          icon: '🎯',
          motivationalMessage: 'Fantastisch! Du hältst dein Gewicht perfekt stabil.'
        };
      } else if (percentage >= 85 && percentage <= 115) {
        return {
          status: 'warning',
          message: 'Gut! Du bist nah an deinem Ziel',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '⚡',
          motivationalMessage: 'Sehr gut! Du bleibst nah an deinem Erhaltungsziel.'
        };
      } else {
        return {
          status: 'danger',
          message: percentage > 115 ? 'Zu viele Kalorien für Erhaltung' : 'Zu wenig Kalorien für Erhaltung',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '⚠️',
          motivationalMessage: 'Achte auf deine Balance für eine stabile Gewichtserhaltung.'
        };
      }
    
    default:
      return {
        status: 'warning',
        message: 'Ziel nicht definiert',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: '❓',
        motivationalMessage: 'Setze dir ein klares Ziel in deinem Profil!'
      };
  }
};

export const getGoalBasedProgressMessage = (
  actualCalories: number,
  targetCalories: number,
  goal: UserGoal
): string => {
  const percentage = (actualCalories / targetCalories) * 100;
  
  switch (goal) {
    case 'lose':
      if (percentage <= 50) return 'Perfekter Start in den Tag!';
      if (percentage <= 75) return 'Du bist auf dem richtigen Weg!';
      if (percentage <= 90) return 'Sehr gut, bleib dran!';
      if (percentage <= 100) return 'Ziel fast erreicht - super!';
      return 'Kein Problem, morgen geht\'s weiter!';
    
    case 'gain':
      if (percentage <= 50) return 'Du brauchst noch mehr Kalorien!';
      if (percentage <= 75) return 'Auf dem Weg zu deinem Ziel!';
      if (percentage <= 90) return 'Sehr gut, fast geschafft!';
      if (percentage <= 110) return 'Perfekt, Ziel erreicht!';
      return 'Fantastisch, du schaffst dein Ziel!';
    
    case 'maintain':
      if (percentage <= 70) return 'Du brauchst noch mehr Kalorien!';
      if (percentage <= 90) return 'Auf dem Weg zu deinem Ziel!';
      if (percentage <= 110) return 'Perfekt im Gleichgewicht!';
      return 'Achte auf deine Balance!';
    
    default:
      return 'Setze dir ein klares Ziel!';
  }
};