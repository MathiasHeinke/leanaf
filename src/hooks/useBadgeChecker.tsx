
import { useEffect } from "react";
import { ExtendedBadgeManager } from "@/utils/extendedBadgeManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useBadgeChecker = () => {
  const { user } = useAuth();

  const checkBadges = async () => {
    if (!user) return;

    try {
      const badgeManager = new ExtendedBadgeManager(user.id);
      const newBadges = await badgeManager.checkAndAwardAllBadges();

      // Show toast for new badges with enhanced styling
      newBadges.forEach(badge => {
        // Extract emoji from badge name for toast
        const emojiMatch = badge.badge_name.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
        const emoji = emojiMatch ? emojiMatch[0] : '🏆';
        
        toast.success(`${emoji} Neuer Badge: ${badge.badge_name}`, {
          description: badge.badge_description,
          duration: 6000,
        });
      });

      return newBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  };

  // Auto-check badges on user login/change
  useEffect(() => {
    if (user) {
      // Delay slightly to ensure other data is loaded first
      const timer = setTimeout(checkBadges, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return { checkBadges };
};
