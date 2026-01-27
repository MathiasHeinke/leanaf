/**
 * useMealFavorites - Hook for managing user's favorite meals (max 3)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useCallback } from 'react';

export const MEAL_FAVORITES_KEY = ['meal-favorites'];

interface MealFavorite {
  id: string;
  meal_text: string;
  position: number;
  created_at: string;
}

export const useMealFavorites = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: MEAL_FAVORITES_KEY,
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('meal_favorites')
        .select('meal_text, position')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .limit(3);

      if (error) {
        console.error('[useMealFavorites] Error fetching favorites:', error);
        throw error;
      }

      return (data || []).map(f => f.meal_text);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 min fresh
    gcTime: 1000 * 60 * 30,   // 30 min cache
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (mealText: string) => {
      if (!userId) throw new Error('Not authenticated');

      // Check current count
      const { count, error: countError } = await supabase
        .from('meal_favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) throw countError;
      if ((count || 0) >= 3) {
        throw new Error('MAX_FAVORITES');
      }

      // Get next position
      const nextPosition = (count || 0) + 1;

      const { error } = await supabase
        .from('meal_favorites')
        .insert({
          user_id: userId,
          meal_text: mealText,
          position: nextPosition
        });

      if (error) throw error;
      return mealText;
    },
    onMutate: async (mealText: string) => {
      await queryClient.cancelQueries({ queryKey: MEAL_FAVORITES_KEY });
      const previous = queryClient.getQueryData<string[]>(MEAL_FAVORITES_KEY);
      
      // Optimistically add
      queryClient.setQueryData<string[]>(MEAL_FAVORITES_KEY, (old) => {
        const current = old || [];
        if (current.length >= 3) return current;
        return [...current, mealText];
      });

      return { previous };
    },
    onError: (err: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MEAL_FAVORITES_KEY, context.previous);
      }
      if (err.message === 'MAX_FAVORITES') {
        toast.error('Maximal 3 Favoriten - entferne zuerst einen');
      } else {
        toast.error('Favorit konnte nicht hinzugefügt werden');
      }
    },
    onSuccess: () => {
      toast.success('Favorit hinzugefügt ⭐');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MEAL_FAVORITES_KEY });
    }
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (mealText: string) => {
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('meal_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('meal_text', mealText);

      if (error) throw error;
      return mealText;
    },
    onMutate: async (mealText: string) => {
      await queryClient.cancelQueries({ queryKey: MEAL_FAVORITES_KEY });
      const previous = queryClient.getQueryData<string[]>(MEAL_FAVORITES_KEY);
      
      // Optimistically remove
      queryClient.setQueryData<string[]>(MEAL_FAVORITES_KEY, (old) => 
        (old || []).filter(m => m !== mealText)
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MEAL_FAVORITES_KEY, context.previous);
      }
      toast.error('Favorit konnte nicht entfernt werden');
    },
    onSuccess: () => {
      toast.success('Favorit entfernt');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MEAL_FAVORITES_KEY });
    }
  });

  const isFavorite = useCallback((mealText: string): boolean => {
    return (query.data || []).includes(mealText);
  }, [query.data]);

  const toggleFavorite = useCallback((mealText: string) => {
    if (isFavorite(mealText)) {
      removeFavoriteMutation.mutate(mealText);
    } else {
      addFavoriteMutation.mutate(mealText);
    }
  }, [isFavorite, removeFavoriteMutation, addFavoriteMutation]);

  return {
    favorites: query.data || [],
    isFavorite,
    toggleFavorite,
    isLoading: query.isLoading,
    isToggling: addFavoriteMutation.isPending || removeFavoriteMutation.isPending
  };
};
