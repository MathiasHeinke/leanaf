export type QuickActionType = 'meal' | 'workout' | 'sleep' | 'supplements' | 'fluid' | 'chemistry' | 'body';

interface QuickAction {
  type: QuickActionType;
  payload?: any;
}

class QuickAddBus {
  private listeners: Set<(action: QuickAction) => void> = new Set();

  subscribe(cb: (action: QuickAction) => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  emit(action: QuickAction) {
    this.listeners.forEach((cb) => cb(action));
  }
}

export const quickAddBus = new QuickAddBus();

export const openMeal = () => quickAddBus.emit({ type: 'meal' });
export const openSleep = () => quickAddBus.emit({ type: 'sleep' });
export const openSupplements = () => quickAddBus.emit({ type: 'supplements' });
export const openChemistry = () => quickAddBus.emit({ type: 'chemistry' });
export const openBody = () => quickAddBus.emit({ type: 'body' });
export const openWorkout = (payload?: { recommendedType?: string }) =>
  quickAddBus.emit({ type: 'workout', payload });

export const openFluidInput = () => quickAddBus.emit({ type: 'fluid' });
