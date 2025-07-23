
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
    setLoading(true);
    try {
      // First get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, created_at')
        .order('display_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Then get subscribers for each profile
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('user_id, subscribed, subscription_tier, subscription_end, created_at');

      if (subscribersError) throw subscribersError;

      const formattedUsers = profilesData?.map(profile => {
        const subscriber = subscribersData?.find(s => s.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          display_name: profile.display_name,
          email: profile.email,
          subscribed: subscriber?.subscribed || false,
          subscription_tier: subscriber?.subscription_tier || null,
          subscription_end: subscriber?.subscription_end || null,
          profile_created: profile.created_at,
          subscription_created: subscriber?.created_at || null
        };
      }) || [];

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
