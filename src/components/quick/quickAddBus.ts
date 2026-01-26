export type QuickActionType = 
  | 'meal' 
  | 'workout' 
  | 'sleep' 
  | 'supplements' 
  | 'journal' 
  | 'chemistry' 
  | 'body' 
  | 'hydration'
  | 'weight'
  | 'training'
  | 'tape'
  | 'peptide';

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

// Direct openers for all tabs
export const openMeal = () => quickAddBus.emit({ type: 'meal' });
export const openWorkout = (payload?: { recommendedType?: string }) =>
  quickAddBus.emit({ type: 'workout', payload });

// QuickLogSheet tab openers
export const openWeight = () => quickAddBus.emit({ type: 'weight' });
export const openTraining = () => quickAddBus.emit({ type: 'training' });
export const openSleep = () => quickAddBus.emit({ type: 'sleep' });
export const openJournal = () => quickAddBus.emit({ type: 'journal' });
export const openTape = () => quickAddBus.emit({ type: 'tape' });
export const openSupplements = () => quickAddBus.emit({ type: 'supplements' });
export const openPeptide = () => quickAddBus.emit({ type: 'peptide' });
export const openChemistry = () => quickAddBus.emit({ type: 'chemistry' });
export const openBody = () => quickAddBus.emit({ type: 'body' });
export const openHydration = () => quickAddBus.emit({ type: 'hydration' });
