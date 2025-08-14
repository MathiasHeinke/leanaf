// 16-step gradual glow color system
// From red (0%) through yellow (50%) to green (100%)

export function getGradualGlowColor(percentage: number): {
  shadowColor: string;
  ringColor: string;
  dotColor: string;
} {
  // Clamp percentage between 0 and 100
  const pct = Math.min(100, Math.max(0, percentage));
  
  // Define 16 color stops with HSL values
  const colorStops = [
    { pct: 0,   hue: 0,   sat: 70, light: 50 },  // Red
    { pct: 6,   hue: 5,   sat: 72, light: 52 },
    { pct: 12,  hue: 10,  sat: 75, light: 54 },
    { pct: 18,  hue: 15,  sat: 78, light: 56 },
    { pct: 25,  hue: 20,  sat: 80, light: 58 },  // Red-Orange
    { pct: 31,  hue: 25,  sat: 82, light: 60 },
    { pct: 37,  hue: 35,  sat: 85, light: 62 },
    { pct: 43,  hue: 45,  sat: 88, light: 64 },  // Orange-Yellow
    { pct: 50,  hue: 55,  sat: 90, light: 65 },  // Yellow
    { pct: 56,  hue: 65,  sat: 85, light: 62 },
    { pct: 62,  hue: 75,  sat: 80, light: 58 },
    { pct: 68,  hue: 85,  sat: 75, light: 55 },  // Yellow-Green
    { pct: 75,  hue: 95,  sat: 70, light: 52 },
    { pct: 81,  hue: 105, sat: 68, light: 50 },
    { pct: 87,  hue: 115, sat: 65, light: 48 },
    { pct: 100, hue: 120, sat: 70, light: 50 },  // Green
  ];
  
  // Find the two nearest color stops
  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];
  
  for (let i = 0; i < colorStops.length - 1; i++) {
    if (pct >= colorStops[i].pct && pct <= colorStops[i + 1].pct) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }
  
  // Interpolate between the two stops
  const range = upperStop.pct - lowerStop.pct;
  const factor = range === 0 ? 0 : (pct - lowerStop.pct) / range;
  
  const hue = Math.round(lowerStop.hue + (upperStop.hue - lowerStop.hue) * factor);
  const sat = Math.round(lowerStop.sat + (upperStop.sat - lowerStop.sat) * factor);
  const light = Math.round(lowerStop.light + (upperStop.light - lowerStop.light) * factor);
  
  // Calculate ring and dot intensity for sharper appearance (no glow)
  const ringIntensity = Math.min(0.6, 0.35 + (pct / 100) * 0.25);
  const saturationBoost = Math.min(15, 5 + (pct / 100) * 10);

  return {
    shadowColor: '', // No glow effects
    ringColor: `hsl(${hue} ${sat + saturationBoost}% ${Math.max(40, light - 5)}% / ${ringIntensity})`,
    dotColor: `hsl(${hue} ${sat + saturationBoost}% ${light}%)`,
  };
}

// Helper function to calculate progress percentage for different card types
export function calculateCardProgress(
  cardType: string,
  data: {
    // Sleep data
    sleepHours?: number;
    bedtime?: string;
    targetSleepHours?: number;
    
    // Weight data
    hasWeightToday?: boolean;
    
    // Workout data
    completedWorkouts?: number;
    plannedWorkouts?: number;
    
    // Fluids data
    fluidsMl?: number;
    targetFluidsMl?: number;
    
    // Mindset data
    journalEntries?: number;
    
    // Supplements data
    takenSupplements?: number;
    plannedSupplements?: number;
    
    // Calories data
    caloriesUsed?: number;
    caloriesTarget?: number;
  }
): number {
  switch (cardType) {
    case 'sleep':
      // Sleep progress based on hours slept and bedtime adherence
      if (data.sleepHours !== undefined && data.sleepHours > 0) {
        const sleepScore = Math.min(100, (data.sleepHours / (data.targetSleepHours || 8)) * 100);
        const bedtimeBonus = data.bedtime ? 10 : 0; // 10% bonus for logging bedtime
        return Math.min(100, sleepScore + bedtimeBonus);
      }
      return data.bedtime ? 20 : 0; // 20% for just bedtime, 0% for nothing
      
    case 'weight':
      return data.hasWeightToday ? 100 : 0;
      
    case 'workout':
      if (!data.plannedWorkouts || data.plannedWorkouts === 0) return 0;
      return Math.min(100, ((data.completedWorkouts || 0) / data.plannedWorkouts) * 100);
      
    case 'fluids':
      if (!data.targetFluidsMl || data.targetFluidsMl === 0) return 0;
      return Math.min(120, ((data.fluidsMl || 0) / data.targetFluidsMl) * 100); // Allow 120% for overachievement
      
    case 'mindset':
      // 0 entries = 0%, 1+ entries = progressive score up to 100%
      if (!data.journalEntries || data.journalEntries === 0) return 0;
      return Math.min(100, data.journalEntries * 33); // 1 entry = 33%, 2 = 66%, 3+ = 100%
      
    case 'supplements':
      if (!data.plannedSupplements || data.plannedSupplements === 0) return 50; // 50% if no plan
      return Math.min(100, ((data.takenSupplements || 0) / data.plannedSupplements) * 100);
      
    case 'calories':
      if (!data.caloriesTarget || data.caloriesTarget === 0) return 0;
      return Math.min(120, ((data.caloriesUsed || 0) / data.caloriesTarget) * 100); // Allow 120% for overachievement
      
    default:
      return 0;
  }
}