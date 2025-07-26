import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

export const useProfileCompletion = () => {
  const { user } = useAuth()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-completion", user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const { data: dailyGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ["daily-goals-completion", user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from("daily_goals")
        .select("*")
        .eq("user_id", user.id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Check if profile is complete (required fields)
  const isProfileComplete = profile && 
    profile.age && 
    profile.weight && 
    profile.height && 
    profile.gender && 
    profile.activity_level && 
    profile.goal

  // Check if goals are set up
  const areGoalsComplete = dailyGoals && 
    dailyGoals.calories > 0 && 
    dailyGoals.protein > 0 && 
    dailyGoals.carbs > 0 && 
    dailyGoals.fats > 0

  const isSetupComplete = isProfileComplete && areGoalsComplete

  return {
    profile,
    dailyGoals,
    isProfileComplete,
    areGoalsComplete,
    isSetupComplete,
    isLoading: isLoading || goalsLoading,
  }
}