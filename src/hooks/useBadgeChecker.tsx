
import { useEffect } from "react";
import { ExtendedBadgeManager } from "@/utils/extendedBadgeManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Global lock to prevent parallel badge checks across all instances
let badgeCheckInProgress = false;

export const useBadgeChecker = () => {
  const { user } = useAuth();

  const checkBadges = async () => {
    if (!user) return;

    // Global lock to prevent parallel badge checks
    if (badgeCheckInProgress) {
      console.log('🔒 Badge check already in progress, skipping...');
      return;
    }

    try {
      badgeCheckInProgress = true;
      console.log('🔓 Starting badge check with global lock');
      
      const badgeManager = new ExtendedBadgeManager(user.id);
      const newBadges = await badgeManager.checkAndAwardAllBadges();

      // Only show toasts for actually new badges (filter out null/empty results)
      const actualNewBadges = newBadges.filter(badge => badge !== null);
      
      if (actualNewBadges.length > 0) {
        console.log(`🎉 ${actualNewBadges.length} new badges awarded, showing toasts`);
        
        actualNewBadges.forEach(badge => {
          // Extract emoji from badge name for toast
          const emojiMatch = badge.badge_name.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
          const emoji = emojiMatch ? emojiMatch[0] : '🏆';
          
          toast.success(`${emoji} Neuer Badge: ${badge.badge_name}`, {
            description: badge.badge_description,
            duration: 6000,
          });
        });
      } else {
        console.log('📝 No new badges to display toasts for');
      }

      return actualNewBadges;
    } catch (error) {
      console.error('❌ Error checking badges:', error);
    } finally {
      badgeCheckInProgress = false;
      console.log('🔓 Released global badge check lock');
    }
  };

  // Auto-check badges ONLY on initial login, not on every user state change
  useEffect(() => {
    if (user) {
      // Check for existing lock first
      if (badgeCheckInProgress) {
        console.log('🔒 Global badge check in progress, skipping auto-check');
        return;
      }

      // Only check if we haven't checked recently
      const lastCheck = localStorage.getItem(`badgeCheck_${user.id}`);
      const now = Date.now();
      const checkInterval = 60 * 60 * 1000; // 1 hour
      
      if (!lastCheck || (now - parseInt(lastCheck)) > checkInterval) {
        console.log('⏰ Scheduling auto badge check for user:', user.id);
        
        // Delay slightly to ensure other data is loaded first
        const timer = setTimeout(() => {
          checkBadges().then(() => {
            localStorage.setItem(`badgeCheck_${user.id}`, now.toString());
          }).catch(error => {
            console.error('Auto badge check failed:', error);
          });
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        console.log('⏭️ Skipping auto badge check, checked recently');
      }
    }
  }, [user?.id]); // Only depend on user.id, not full user object

  return { checkBadges };
};
