import { useEffect } from "react";
import { BadgeManager } from "@/utils/badgeManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useBadgeChecker = () => {
  const { user } = useAuth();

  const checkBadges = async () => {
    if (!user) return;

    try {
      const badgeManager = new BadgeManager(user.id);
      const newBadges = await badgeManager.checkAndAwardBadges();

      // Show toast for new badges
      newBadges.forEach(badge => {
        toast.success(`🏆 Neuer Badge: ${badge.badge_name}`, {
          description: badge.badge_description,
          duration: 5000,
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