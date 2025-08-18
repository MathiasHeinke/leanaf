// SINGLE POINT OF TRUTH for all fluid calculations
// This ensures consistent behavior across all components

export interface FluidData {
  id?: string;
  amount_ml: number;
  has_alcohol?: boolean;
  has_caffeine?: boolean;
  is_non_alcoholic?: boolean;
  fluid_type?: string;
  category?: string;
  name?: string;
  fluid_name?: string;
  custom_name?: string;
  calories_per_100ml?: number;
  created_at?: string;
  date?: string;
}

export interface FluidCategories {
  water: FluidData[];
  nonAlcoholic: FluidData[];
  alcoholic: FluidData[];
}

/**
 * UNIFIED FLUID CATEGORIZATION
 * This is the single source of truth for how fluids are categorized
 */
export const categorizeFluid = (fluid: FluidData): 'water' | 'nonAlcoholic' | 'alcoholic' => {
  // Alcohol takes precedence
  if (fluid.has_alcohol) {
    return 'alcoholic';
  }
  
  // Water category OR wenn kein Name/Category dann ist es wahrscheinlich Wasser
  if (fluid.category === 'water' || 
      fluid.fluid_type === 'water' ||
      (!fluid.category && !fluid.fluid_type && !fluid.has_caffeine && !fluid.name?.toLowerCase().includes('kaffee'))) {
    return 'water';
  }
  
  // Everything else is nonAlcoholic
  return 'nonAlcoholic';
};

/**
 * UNIFIED FLUID GROUPING
 * Groups fluids into the three main categories
 */
export const groupFluids = (fluids: FluidData[]): FluidCategories => {
  const categories: FluidCategories = {
    water: [],
    nonAlcoholic: [],
    alcoholic: []
  };
  
  fluids.forEach(fluid => {
    const category = categorizeFluid(fluid);
    categories[category].push(fluid);
  });
  
  return categories;
};

/**
 * UNIFIED FLUID FILTERING
 * Standard filters used across all components
 */
export const fluidFilters = {
  // Water only (used in halo displays and water goals)
  water: (fluid: FluidData): boolean => categorizeFluid(fluid) === 'water',
  
  // Non-alcoholic including coffee (used in "other drinks")
  nonAlcoholic: (fluid: FluidData): boolean => categorizeFluid(fluid) === 'nonAlcoholic',
  
  // Alcoholic only
  alcoholic: (fluid: FluidData): boolean => categorizeFluid(fluid) === 'alcoholic',
  
  // Water + non-alcoholic (used for hydration calculation in some components)
  nonAlcoholicTotal: (fluid: FluidData): boolean => {
    const category = categorizeFluid(fluid);
    return category === 'water' || category === 'nonAlcoholic';
  },
  
  // Everything except alcohol (legacy compatibility)
  nonAlcoholicAndWater: (fluid: FluidData): boolean => !fluid.has_alcohol
};

/**
 * UNIFIED FLUID NAMING
 * Never returns "Unbekannt" - always returns a meaningful name
 */
export const getFluidDisplayName = (fluid: FluidData): string => {
  // Priority order for naming
  const name = fluid.name || 
               fluid.fluid_name || 
               fluid.custom_name || 
               fluid.fluid_type;
  
  // Fallback to generic names based on category
  if (!name || name.trim() === '' || name.toLowerCase() === 'unbekannt') {
    const category = categorizeFluid(fluid);
    switch (category) {
      case 'water':
        return 'Wasser';
      case 'nonAlcoholic':
        if (fluid.category === 'coffee' || fluid.has_caffeine || fluid.fluid_type === 'kaffee') {
          return 'Kaffee';
        }
        return 'Getränk';
      case 'alcoholic':
        return 'Alkoholisches Getränk';
      default:
        return 'Getränk';
    }
  }
  
  return name;
};

/**
 * UNIFIED FLUID FORMATTING
 * Consistent display across all components
 */
export const formatFluidAmount = (ml: number): string => {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)}L`;
  }
  return `${ml}ml`;
};

/**
 * UNIFIED CALCULATIONS
 * Standard calculation methods used across all components
 */
export const fluidCalculations = {
  // Total amount for a category
  getTotalAmount: (fluids: FluidData[]): number => {
    return fluids.reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0);
  },
  
  // Total calories from fluids
  getTotalCalories: (fluids: FluidData[]): number => {
    return fluids.reduce((sum, fluid) => {
      const calories = (fluid.calories_per_100ml || 0) * ((fluid.amount_ml || 0) / 100);
      return sum + calories;
    }, 0);
  },
  
  // Water intake for hydration tracking (excludes alcohol and coffee by default)
  getHydrationAmount: (fluids: FluidData[]): number => {
    return fluidCalculations.getTotalAmount(
      fluids.filter(fluidFilters.water)
    );
  },
  
  // Coffee intake
  getCoffeeAmount: (fluids: FluidData[]): number => {
    return fluidCalculations.getTotalAmount(
      fluids.filter(fluid => 
        fluid.category === 'coffee' || 
        fluid.has_caffeine || 
        fluid.fluid_type === 'kaffee'
      )
    );
  },
  
  // Alcohol intake
  getAlcoholAmount: (fluids: FluidData[]): number => {
    return fluidCalculations.getTotalAmount(
      fluids.filter(fluidFilters.alcoholic)
    );
  }
};

/**
 * UNIFIED PROGRESS CALCULATION
 * Standard progress calculation for goals
 */
export const calculateProgress = (current: number, goal: number): number => {
  return Math.min(current / goal, 1);
};