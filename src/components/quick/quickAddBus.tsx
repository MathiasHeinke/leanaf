import { EventBus } from '@/lib/eventBus';

export const quickAddBus = new EventBus();

export const openMeal = () => {
  quickAddBus.emit('openMeal');
};

export const openWorkout = () => {
  quickAddBus.emit('openWorkout');
};

export const openSleep = () => {
  quickAddBus.emit('openSleep');
};

export const openSupplements = () => {
  quickAddBus.emit('openSupplements');
};

export const openCoach = () => {
  quickAddBus.emit('openCoach');
};

export const openFluidInput = () => {
  quickAddBus.emit('openFluidInput');
};