
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

// Enhanced request wrapper with better error handling
export const supabaseRequest = async <T>(
  requestKey: string,
  requestFn: () => Promise<T>,
  useCache: boolean = true
): Promise<T> => {
  console.log(`🔧 [SUPABASE] Starting request: ${requestKey}`);
  
  // Check cache first
  if (useCache && requestCache.has(requestKey)) {
    const cached = requestCache.get(requestKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`🔧 [SUPABASE] Using cached result for: ${requestKey}`);
      return cached.data;
    }
  }

  let lastError: any;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔧 [SUPABASE] Attempt ${attempt + 1}/${MAX_RETRIES + 1} for: ${requestKey}`);
      
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
      console.log(`🔧 [SUPABASE] Request successful: ${requestKey}`);
      
      return data;
    } catch (error: any) {
      lastError = error;
      connectionRetryCount++;
      
      console.error(`🔧 [SUPABASE] Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}) for ${requestKey}:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      if (attempt < MAX_RETRIES) {
        const delayTime = RETRY_DELAY * (attempt + 1);
        console.log(`🔧 [SUPABASE] Retrying in ${delayTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
    }
  }
  
  console.error(`🔧 [SUPABASE] Request failed permanently after ${MAX_RETRIES + 1} attempts: ${requestKey}`, lastError);
  throw lastError;
};

// Safe data loading with enhanced error handling
export const loadUserData = async (userId: string) => {
  if (!userId) {
    console.warn('🔧 [SUPABASE] loadUserData: No userId provided');
    return null;
  }
  
  try {
    console.log('🔧 [SUPABASE] Loading user data for:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('🔧 [SUPABASE] Error loading user data:', error);
      throw error;
    }
    
    console.log('🔧 [SUPABASE] User data loaded successfully');
    return data;
  } catch (error) {
    console.error('🔧 [SUPABASE] Critical error loading user data:', error);
    return null;
  }
};

export const loadDailyGoals = async (userId: string) => {
  if (!userId) {
    console.warn('🔧 [SUPABASE] loadDailyGoals: No userId provided');
    return null;
  }
  
  try {
    console.log('🔧 [SUPABASE] Loading daily goals for:', userId);
    
    const { data, error } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('🔧 [SUPABASE] Error loading daily goals:', error);
      throw error;
    }
    
    console.log('🔧 [SUPABASE] Daily goals loaded successfully');
    return data;
  } catch (error) {
    console.error('🔧 [SUPABASE] Critical error loading daily goals:', error);
    return null;
  }
};

export const loadTodaysMeals = async (userId: string) => {
  if (!userId) {
    console.warn('🔧 [SUPABASE] loadTodaysMeals: No userId provided');
    return [];
  }
  
  try {
    console.log('🔧 [SUPABASE] Loading today\'s meals for:', userId);
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('🔧 [SUPABASE] Date range:', {
      startOfDay: startOfDay.toISOString(),
      startOfNextDay: startOfNextDay.toISOString()
    });
    
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', startOfNextDay.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('🔧 [SUPABASE] Error loading today\'s meals:', error);
      throw error;
    }
    
    console.log(`🔧 [SUPABASE] Today's meals loaded successfully: ${data?.length || 0} meals`);
    return data || [];
  } catch (error) {
    console.error('🔧 [SUPABASE] Critical error loading today\'s meals:', error);
    return [];
  }
};

export const loadWeightHistory = async (userId: string) => {
  if (!userId) {
    console.warn('🔧 [SUPABASE] loadWeightHistory: No userId provided');
    return [];
  }
  
  try {
    console.log('🔧 [SUPABASE] Loading weight history for:', userId);
    
    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    
    if (error) {
      console.error('🔧 [SUPABASE] Error loading weight history:', error);
      throw error;
    }
    
    console.log(`🔧 [SUPABASE] Weight history loaded successfully: ${data?.length || 0} entries`);
    return data || [];
  } catch (error) {
    console.error('🔧 [SUPABASE] Critical error loading weight history:', error);
    return [];
  }
};

// Connection health check with detailed logging
export const checkConnection = async (): Promise<boolean> => {
  try {
    console.log('🔧 [SUPABASE] Checking connection health...');
    
    const { data, error } = await supabase
      .from('men_quotes')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('🔧 [SUPABASE] Connection check failed:', error);
      return false;
    }
    
    console.log('🔧 [SUPABASE] Connection check successful');
    return true;
  } catch (networkError) {
    console.error('🔧 [SUPABASE] Network error during connection check:', networkError);
    return false;
  }
};

// Clear cache when needed
export const clearCache = () => {
  console.log('🔧 [SUPABASE] Clearing request cache');
  requestCache.clear();
};

// Connection status with detailed info
export const getConnectionStatus = () => {
  const status = {
    retryCount: connectionRetryCount,
    isHealthy: connectionRetryCount < 3,
    cacheSize: requestCache.size
  };
  
  console.log('🔧 [SUPABASE] Connection status:', status);
  return status;
};
