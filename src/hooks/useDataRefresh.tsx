import { useEffect, useCallback } from 'react';

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

export const triggerDataRefresh = () => {
  dataRefreshBus.emit();
};