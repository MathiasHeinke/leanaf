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
    id: 'unlock-tracking-options',
    target: 'tracking-preferences',
    message: '🎉 Super! Du hast dein Profil ausgefüllt. Jetzt kannst du weitere Tracking-Optionen aktivieren: Gewicht, Schlaf, Training und mehr!',
    isVisible: false,
    triggerAfterDays: 0, // Sofort nach Profil-Vervollständigung
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

    // Special logic for unlock-tracking-options tooltip
    const hasCompletedBasicProfile = completionStatus.height && completionStatus.weight && completionStatus.age && completionStatus.gender;
    const hasMealData = localStorage.getItem(`meals_${user?.id}`) !== null; // Check if user has any meal data
    
    // Filter tooltips based on conditions
    const filteredTooltips = DEFAULT_TOOLTIPS.filter(tooltip => {
      // Check if tooltip is already dismissed
      if (dismissedTooltips.includes(tooltip.id)) return false;

      // Special handling for unlock-tracking-options
      if (tooltip.id === 'unlock-tracking-options') {
        // Show only if profile is complete AND user has meal data AND tracking preferences not set
        return hasCompletedBasicProfile && hasMealData && !completionStatus.trackingPreferences;
      }

      // Check if enough days have passed since signup
      if (daysSinceSignup < tooltip.triggerAfterDays) return false;

      // Check if incomplete field requirement is met
      if (tooltip.requiresIncompleteField) {
        const hasIncompleteField = !completionStatus[tooltip.requiresIncompleteField as keyof typeof completionStatus];
        if (!hasIncompleteField) return false;
      }

      return true;
    });

    const updatedTooltips = DEFAULT_TOOLTIPS.map(tooltip => ({
      ...tooltip, 
      isVisible: filteredTooltips.some(ft => ft.id === tooltip.id)
    }));

    // Only update if the visibility actually changed
    setTooltips(prev => {
      const hasChanged = prev.some((prevTooltip, index) => 
        prevTooltip.isVisible !== updatedTooltips[index].isVisible
      );
      return hasChanged ? updatedTooltips : prev;
    });
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