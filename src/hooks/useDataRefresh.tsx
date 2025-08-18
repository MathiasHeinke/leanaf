import { useEffect, useCallback } from 'react';
import { clearFluidsCache } from '@/hooks/useTodaysFluids';
import { clearFrequentFluidsCache } from '@/hooks/useFrequentFluids';

// Event system for data refresh
class DataRefreshEventBus {
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  emit() {
    this.listeners.forEach(callback => callback());
  }
}

export const dataRefreshBus = new DataRefreshEventBus();

export const useDataRefresh = (refreshCallback: () => void) => {
  useEffect(() => {
    const unsubscribe = dataRefreshBus.subscribe(refreshCallback);
    return unsubscribe;
  }, [refreshCallback]);
};

// Debounce multiple refresh calls
let refreshTimeout: NodeJS.Timeout | null = null;

export const triggerDataRefresh = () => {
  console.log('[DATA_REFRESH] Triggering global data refresh (debounced)');
  
  // Clear any pending refresh
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  // Debounce to 500ms to handle rapid user interactions better
  refreshTimeout = setTimeout(() => {
    console.log('[DATA_REFRESH] Executing debounced refresh');
    clearFluidsCache();
    clearFrequentFluidsCache();
    dataRefreshBus.emit();
    refreshTimeout = null;
  }, 500);
};