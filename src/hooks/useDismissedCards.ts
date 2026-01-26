/**
 * useDismissedCards - Session storage for snoozed action cards
 * Cards dismissed today won't reappear until tomorrow (or after snooze timeout)
 */

import { useState, useCallback, useEffect } from 'react';

const SNOOZE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

interface DismissedCard {
  id: string;
  dismissedAt: number;
  snoozeUntil?: number;
}

export const useDismissedCards = () => {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `ares_dismissed_cards_${today}`;

  const [dismissed, setDismissed] = useState<Map<string, DismissedCard>>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as DismissedCard[];
        return new Map(parsed.map(d => [d.id, d]));
      }
    } catch (e) {
      console.warn('[useDismissedCards] Failed to parse stored data:', e);
    }
    return new Map();
  });

  // Persist to sessionStorage whenever dismissed changes
  useEffect(() => {
    try {
      const serialized = JSON.stringify([...dismissed.values()]);
      sessionStorage.setItem(storageKey, serialized);
    } catch (e) {
      console.warn('[useDismissedCards] Failed to save:', e);
    }
  }, [dismissed, storageKey]);

  // Dismiss a card (snooze for 2 hours or until tomorrow)
  const dismissCard = useCallback((cardId: string, snoozeDuration: boolean = true) => {
    const now = Date.now();
    const snoozeUntil = snoozeDuration ? now + SNOOZE_DURATION_MS : undefined;
    
    setDismissed(prev => {
      const next = new Map(prev);
      next.set(cardId, {
        id: cardId,
        dismissedAt: now,
        snoozeUntil
      });
      return next;
    });
  }, []);

  // Check if a card is currently dismissed
  const isCardDismissed = useCallback((cardId: string): boolean => {
    const card = dismissed.get(cardId);
    if (!card) return false;
    
    // If snoozeUntil is set and expired, card should reappear
    if (card.snoozeUntil && Date.now() > card.snoozeUntil) {
      return false;
    }
    
    return true;
  }, [dismissed]);

  // Remove a card from dismissed list (for manual un-snooze)
  const unDismissCard = useCallback((cardId: string) => {
    setDismissed(prev => {
      const next = new Map(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  // Get count of currently dismissed cards
  const dismissedCount = dismissed.size;

  return { 
    dismissCard, 
    isCardDismissed, 
    unDismissCard,
    dismissedCount
  };
};
