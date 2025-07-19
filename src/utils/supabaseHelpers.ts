import { supabase } from "@/integrations/supabase/client";

// Connection state management
let connectionRetryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Request cache to prevent duplicate requests
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Request wrapper with retry logic and caching
export const supabaseRequest = async <T>(
  requestKey: string,
  requestFn: () => Promise<T>,
  useCache: boolean = true
): Promise<T> => {
  // Check cache first
  if (useCache && requestCache.has(requestKey)) {
    const cached = requestCache.get(requestKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  let lastError: any;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await requestFn();
      
      // Cache successful response
      if (useCache) {
        requestCache.set(requestKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      // Reset retry count on success
      connectionRetryCount = 0;
      
      return data;
    } catch (error: any) {
      lastError = error;
      connectionRetryCount++;
      
      console.warn(`Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      }
    }
  }
  
  console.error(`Request failed after ${MAX_RETRIES + 1} attempts:`, lastError);
  throw lastError;
};

// Safe data loading with error handling
export const loadUserData = async (userId: string) => {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error loading user data:', error);
    return null;
  }
};

export const loadDailyGoals = async (userId: string) => {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error loading daily goals:', error);
    return null;
  }
};

export const loadTodaysMeals = async (userId: string) => {
  if (!userId) return [];
  
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', startOfNextDay.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading today\'s meals:', error);
    return [];
  }
};

export const loadWeightHistory = async (userId: string) => {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading weight history:', error);
    return [];
  }
};

// Connection health check
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('men_quotes')
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
};

// Clear cache when needed
export const clearCache = () => {
  requestCache.clear();
};

// Connection status
export const getConnectionStatus = () => ({
  retryCount: connectionRetryCount,
  isHealthy: connectionRetryCount < 3
});