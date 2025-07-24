
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface User {
  user_id: string;
  display_name: string | null;
  email: string | null;
  subscribed: boolean | null;
  subscription_tier: string | null;
  subscription_end: string | null;
  profile_created: string;
  subscription_created: string | null;
  // Aktivitätsstatistiken
  meals_count: number;
  workouts_count: number;
  weight_entries_count: number;
  sleep_entries_count: number;
  body_measurements_count: number;
  // Punkte & Level
  total_points: number;
  current_level: number;
  level_name: string;
  // Trial Info
  has_active_trial: boolean;
  trial_expires_at: string | null;
  trial_type: string | null;
  // Letzte Aktivität
  last_meal_date: string | null;
  last_workout_date: string | null;
  last_weight_date: string | null;
  last_login_approximate: string | null;
}

interface AdminAction {
  id: string;
  admin_user_id: string;
  target_user_id: string | null;
  action_type: string;
  action_details: any;
  old_values: any;
  new_values: any;
  created_at: string;
}

export const useAdminDebug = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const logAdminAction = async (
    actionType: string,
    targetUserId: string | null,
    actionDetails: any,
    oldValues: any = {},
    newValues: any = {}
  ) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('admin_logs')
        .insert({
          admin_user_id: user.id,
          target_user_id: targetUserId,
          action_type: actionType,
          action_details: actionDetails,
          old_values: oldValues,
          new_values: newValues
        });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const fetchUsers = async () => {
    console.log("🔍 [Admin Debug] Starting fetchUsers...");
    setLoading(true);
    try {
      // Get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, created_at')
        .order('display_name', { ascending: true });

      if (profilesError) {
        console.error("❌ [Admin Debug] Profiles error:", profilesError);
        throw profilesError;
      }
      console.log("✅ [Admin Debug] Profiles loaded:", profilesData?.length, "users");

      // Get subscribers - also check by email as fallback
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('user_id, email, subscribed, subscription_tier, subscription_end, created_at');

      if (subscribersError) {
        console.error("❌ [Admin Debug] Subscribers error:", subscribersError);
        throw subscribersError;
      }
      console.log("✅ [Admin Debug] Subscribers loaded:", subscribersData?.length, "entries");

      // Get user trials
      const { data: trialsData, error: trialsError } = await supabase
        .from('user_trials')
        .select('user_id, is_active, expires_at, trial_type, created_at')
        .eq('is_active', true);

      if (trialsError) {
        console.error("❌ [Admin Debug] Trials error:", trialsError);
        throw trialsError;
      }
      console.log("✅ [Admin Debug] Active trials loaded:", trialsData?.length, "entries");

      // Get user points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, total_points, current_level, level_name');

      if (pointsError) {
        console.error("❌ [Admin Debug] Points error:", pointsError);
        throw pointsError;
      }
      console.log("✅ [Admin Debug] User points loaded:", pointsData?.length, "entries");

      // Sammle alle Benutzer-IDs für Bulk-Abfragen
      const userIds = profilesData?.map(p => p.user_id) || [];
      console.log("📊 [Admin Debug] User IDs for bulk queries:", userIds.length);

      // Parallel Abfragen für Aktivitätsstatistiken
      console.log("🔄 [Admin Debug] Starting parallel activity queries...");
      const [mealsCount, workoutsCount, weightCount, sleepCount, measurementsCount] = await Promise.all([
        // Meals Count + Latest
        supabase
          .from('meals')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        
        // Workouts Count + Latest  
        supabase
          .from('workouts')
          .select('user_id, created_at, date')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        
        // Weight entries count + Latest
        supabase
          .from('weight_history')
          .select('user_id, created_at, date')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        
        // Sleep entries count + Latest
        supabase
          .from('sleep_tracking')
          .select('user_id, created_at, date')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        
        // Body measurements count
        supabase
          .from('body_measurements')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
      ]);

      // Log the results of each query
      console.log("📈 [Admin Debug] Activity queries results:");
      console.log("  • Meals:", mealsCount.data?.length, "entries", mealsCount.error ? "ERROR:" + JSON.stringify(mealsCount.error) : "✅");
      console.log("  • Workouts:", workoutsCount.data?.length, "entries", workoutsCount.error ? "ERROR:" + JSON.stringify(workoutsCount.error) : "✅");
      console.log("  • Weight:", weightCount.data?.length, "entries", weightCount.error ? "ERROR:" + JSON.stringify(weightCount.error) : "✅");
      console.log("  • Sleep:", sleepCount.data?.length, "entries", sleepCount.error ? "ERROR:" + JSON.stringify(sleepCount.error) : "✅");
      console.log("  • Measurements:", measurementsCount.data?.length, "entries", measurementsCount.error ? "ERROR:" + JSON.stringify(measurementsCount.error) : "✅");

      // Verarbeite Statistiken
      const getUserStats = (userId: string) => {
        const userMeals = mealsCount.data?.filter(m => m.user_id === userId) || [];
        const userWorkouts = workoutsCount.data?.filter(w => w.user_id === userId) || [];
        const userWeights = weightCount.data?.filter(w => w.user_id === userId) || [];
        const userSleep = sleepCount.data?.filter(s => s.user_id === userId) || [];
        const userMeasurements = measurementsCount.data?.filter(m => m.user_id === userId) || [];

        // Debug für spezifischen User
        if (userId === '84b0664f-0934-49ce-9c35-c99546b792bf') {
          console.log("🔍 [Admin Debug] Stats for mi.brandl78 (84b0664f-0934-49ce-9c35-c99546b792bf):");
          console.log("  • Raw meals data:", mealsCount.data?.filter(m => m.user_id === userId));
          console.log("  • Filtered meals:", userMeals.length);
          console.log("  • Filtered workouts:", userWorkouts.length);
          console.log("  • Filtered weights:", userWeights.length);
          console.log("  • Filtered sleep:", userSleep.length);
        }

        return {
          meals_count: userMeals.length,
          workouts_count: userWorkouts.length,
          weight_entries_count: userWeights.length,
          sleep_entries_count: userSleep.length,
          body_measurements_count: userMeasurements.length,
          last_meal_date: userMeals[0]?.created_at || null,
          last_workout_date: userWorkouts[0]?.created_at || null,
          last_weight_date: userWeights[0]?.created_at || null,
          // Approximate last login from most recent activity
          last_login_approximate: [
            ...userMeals.map(m => m.created_at),
            ...userWorkouts.map(w => w.created_at),
            ...userWeights.map(w => w.created_at),
            ...userSleep.map(s => s.created_at)
          ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
        };
      };

        const formattedUsers: User[] = profilesData?.map(profile => {
        // Try to find subscriber by user_id first, then by email as fallback
        let subscriber = subscribersData?.find(s => s.user_id === profile.user_id);
        if (!subscriber && profile.email) {
          subscriber = subscribersData?.find(s => s.email === profile.email);
        }
        
        const trial = trialsData?.find(t => t.user_id === profile.user_id);
        const points = pointsData?.find(p => p.user_id === profile.user_id);
        const stats = getUserStats(profile.user_id);

        // Debug specific users subscription mapping
        if (profile.user_id === '84b0664f-0934-49ce-9c35-c99546b792bf') {
          console.log("🔍 [Admin Debug] Subscription mapping for mi.brandl78:");
          console.log("  • Profile user_id:", profile.user_id);
          console.log("  • Profile email:", profile.email);
          console.log("  • Found subscriber by user_id:", subscribersData?.find(s => s.user_id === profile.user_id));
          console.log("  • Found subscriber by email:", profile.email ? subscribersData?.find(s => s.email === profile.email) : 'no email');
          console.log("  • Final subscriber:", subscriber);
        }

        const user = {
          user_id: profile.user_id,
          display_name: profile.display_name,
          email: profile.email,
          subscribed: subscriber?.subscribed ?? false,
          subscription_tier: subscriber?.subscription_tier ?? null,
          subscription_end: subscriber?.subscription_end ?? null,
          profile_created: profile.created_at,
          subscription_created: subscriber?.created_at ?? null,
          // Aktivitätsstatistiken
          meals_count: stats.meals_count,
          workouts_count: stats.workouts_count,
          weight_entries_count: stats.weight_entries_count,
          sleep_entries_count: stats.sleep_entries_count,
          body_measurements_count: stats.body_measurements_count,
          // Punkte & Level
          total_points: points?.total_points || 0,
          current_level: points?.current_level || 1,
          level_name: points?.level_name || 'Rookie',
          // Trial Info
          has_active_trial: !!trial?.is_active,
          trial_expires_at: trial?.expires_at || null,
          trial_type: trial?.trial_type || null,
          // Letzte Aktivität
          last_meal_date: stats.last_meal_date,
          last_workout_date: stats.last_workout_date,
          last_weight_date: stats.last_weight_date,
          last_login_approximate: stats.last_login_approximate
        };

        // Debug für spezifischen User
        if (profile.user_id === '84b0664f-0934-49ce-9c35-c99546b792bf') {
          console.log("👤 [Admin Debug] Final user object for mi.brandl78:");
          console.log("  • Final meals_count:", user.meals_count);
          console.log("  • Final workouts_count:", user.workouts_count);
          console.log("  • Final total_points:", user.total_points);
          console.log("  • Subscriber data:", subscriber);
          console.log("  • Points data:", points);
          console.log("  • Stats data:", stats);
        }

        return user;
      }) || [];

      console.log("✅ [Admin Debug] Final users array:", formattedUsers.length, "users processed");
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAdminLogs(data || []);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
    }
  };

  const grantPremium = async (targetUserId: string, duration: string, tier: string = 'Premium') => {
    if (!user?.id) return;

    try {
      // Get user profile to check email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('user_id', targetUserId)
        .single();

      if (profileError || !profile?.email) {
        toast.error('Benutzer nicht gefunden oder keine E-Mail vorhanden');
        return;
      }

      console.log('Granting premium to user:', {
        targetUserId,
        email: profile.email,
        duration,
        tier
      });

      // Calculate end date
      const calculateEndDate = (duration: string): Date | null => {
        if (duration === 'permanent') return null;
        
        const durationMap: Record<string, number> = {
          '1week': 7 * 24 * 60 * 60 * 1000,
          '1month': 30 * 24 * 60 * 60 * 1000,
          '3months': 90 * 24 * 60 * 60 * 1000,
          '6months': 180 * 24 * 60 * 60 * 1000,
          '12months': 365 * 24 * 60 * 60 * 1000
        };
        
        const milliseconds = durationMap[duration] || durationMap['1month'];
        return new Date(Date.now() + milliseconds);
      };

      const endDate = calculateEndDate(duration);

      // Check current subscription status
      const { data: existingSubscriber } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', profile.email)
        .maybeSingle();

      let result;
      
      // Level 1: Try UPDATE first (if subscription exists)
      if (existingSubscriber) {
        console.log('Existing subscription found, attempting UPDATE...');
        const { data: updateData, error: updateError } = await supabase
          .from('subscribers')
          .update({
            user_id: targetUserId,
            subscribed: true,
            subscription_tier: tier,
            subscription_end: endDate?.toISOString() || null,
            updated_at: new Date().toISOString()
          })
          .eq('email', profile.email)
          .select()
          .single();

        if (updateError) {
          console.error('UPDATE failed:', updateError);
          throw updateError;
        }
        
        result = updateData;
        console.log('UPDATE successful:', result);
      } else {
        // Level 2: Try INSERT (if no existing subscription)
        console.log('No existing subscription found, attempting INSERT...');
        const { data: insertData, error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: targetUserId,
            email: profile.email,
            subscribed: true,
            subscription_tier: tier,
            subscription_end: endDate?.toISOString() || null,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('INSERT failed:', insertError);
          throw insertError;
        }
        
        result = insertData;
        console.log('INSERT successful:', result);
      }

      console.log('Premium granted successfully:', result);

      // Log the action with detailed information
      await logAdminAction(
        tier === 'Enterprise' ? 'GRANT_ENTERPRISE' : 'GRANT_PREMIUM',
        targetUserId,
        { 
          duration, 
          tier, 
          endDate: endDate?.toISOString() || 'permanent',
          method: existingSubscriber ? 'update' : 'create',
          userEmail: profile.email,
          userName: profile.display_name
        },
        existingSubscriber || {},
        result
      );

      const action = existingSubscriber ? 'aktualisiert' : 'vergeben';
      toast.success(`${tier} für ${duration} ${action} (${profile.display_name || profile.email})`);
      
      await fetchUsers();
      await fetchAdminLogs();
    } catch (error: any) {
      console.error('Error granting subscription:', error);
      
      // Provide detailed error information
      const errorMessage = error?.message || 'Unbekannter Fehler';
      toast.error(`Fehler beim Vergeben von ${tier}: ${errorMessage}`);
    }
  };

  const revokePremium = async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      const { data: oldData } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      const { error } = await supabase
        .from('subscribers')
        .update({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId);

      if (error) throw error;

      await logAdminAction(
        'REVOKE_SUBSCRIPTION',
        targetUserId,
        {},
        oldData || {},
        { subscribed: false, subscription_tier: null, subscription_end: null }
      );

      toast.success('Subscription widerrufen');
      await fetchUsers();
    } catch (error) {
      console.error('Error revoking subscription:', error);
      toast.error('Fehler beim Widerrufen der Subscription');
    }
  };

  const switchToUser = async (targetUserId: string) => {
    try {
      // This would need to be implemented with proper session management
      await logAdminAction(
        'SWITCH_USER',
        targetUserId,
        { action: 'account_switch' }
      );
      
      toast.info('Account-Wechsel Funktion noch nicht implementiert');
    } catch (error) {
      console.error('Error switching user:', error);
      toast.error('Fehler beim Account-Wechsel');
    }
  };

  const filteredUsers = users.filter(user =>
    (user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
    fetchAdminLogs();
  }, []);

  return {
    users: filteredUsers,
    adminLogs,
    loading,
    searchTerm,
    setSearchTerm,
    grantPremium,
    revokePremium,
    switchToUser,
    fetchUsers,
    fetchAdminLogs,
    logAdminAction
  };
};
