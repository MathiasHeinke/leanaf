import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useProfileCompletion } from './useProfileCompletion';

interface ProactiveTooltip {
  id: string;
  target: string;
  message: string;
  isVisible: boolean;
  triggerAfterDays?: number;
  requiresIncompleteField?: string;
}

const DEFAULT_TOOLTIPS: ProactiveTooltip[] = [
  {
    id: 'body-measurements',
    target: 'weight-height-section',
    message: '💪 Tipp: Mit deinen Körpermaßen können die Coaches dir noch präzisere Empfehlungen geben!',
    isVisible: false,
    triggerAfterDays: 1,
    requiresIncompleteField: 'weight'
  },
  {
    id: 'sleep-tracking',
    target: 'sleep-section',
    message: '😴 Hier kannst du deine Schlafzeiten tracken - das hilft bei der ganzheitlichen Analyse',
    isVisible: false,
    triggerAfterDays: 2,
    requiresIncompleteField: 'trackingPreferences'
  },
  {
    id: 'additional-tracking',
    target: 'tracking-preferences',
    message: '⚡ Diese zusätzlichen Tracking-Optionen helfen dir bei einer vollständigen Gesundheitsanalyse',
    isVisible: false,
    triggerAfterDays: 3,
    requiresIncompleteField: 'trackingPreferences'
  }
];

export const useProactiveTooltips = () => {
  const { user } = useAuth();
  const { completionStatus, incompleteFields } = useProfileCompletion();
  const [tooltips, setTooltips] = useState<ProactiveTooltip[]>(DEFAULT_TOOLTIPS);
  const [dismissedTooltips, setDismissedTooltips] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const storageKey = `dismissed_tooltips_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        setDismissedTooltips(JSON.parse(stored));
      } catch (error) {
        setDismissedTooltips([]);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const userCreatedAt = new Date(user.created_at);
    const daysSinceSignup = Math.floor((Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    const updatedTooltips = tooltips.map(tooltip => {
      const shouldShow = 
        !dismissedTooltips.includes(tooltip.id) &&
        daysSinceSignup >= (tooltip.triggerAfterDays || 0) &&
        (!tooltip.requiresIncompleteField || incompleteFields.includes(tooltip.requiresIncompleteField));

      return { ...tooltip, isVisible: shouldShow };
    });

    setTooltips(updatedTooltips);
  }, [user, completionStatus, incompleteFields, dismissedTooltips]);

  const dismissTooltip = (tooltipId: string) => {
    if (!user) return;

    const newDismissed = [...dismissedTooltips, tooltipId];
    setDismissedTooltips(newDismissed);

    const storageKey = `dismissed_tooltips_${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(newDismissed));

    setTooltips(prev => 
      prev.map(tooltip => 
        tooltip.id === tooltipId 
          ? { ...tooltip, isVisible: false }
          : tooltip
      )
    );
  };

  const getVisibleTooltip = (target: string) => {
    return tooltips.find(tooltip => 
      tooltip.target === target && tooltip.isVisible
    );
  };

  const hasVisibleTooltips = () => {
    return tooltips.some(tooltip => tooltip.isVisible);
  };

  return {
    tooltips,
    dismissTooltip,
    getVisibleTooltip,
    hasVisibleTooltips
  };
};