// ARES 3.0 Gamification Module

export * from './types.ts';
export * from './xpCalculator.ts';
export * from './dailyQuestManager.ts';
export * from './achievementChecker.ts';

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { calculateInteractionXP, isBloodworkRelated, isProtocolRelated } from './xpCalculator.ts';
import { generateDailyQuests, getQuestProgressUpdate } from './dailyQuestManager.ts';
import { InteractionData, XPResult } from './types.ts';

/**
 * Award XP for an ARES interaction and update stats
 */
export async function awardInteractionXP(
  supabase: SupabaseClient,
  userId: string,
  data: {
    toolsUsed?: string[];
    messageText?: string;
    streakDays?: number;
  }
): Promise<XPResult | null> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Check if first question of day
    const { data: existingStats } = await supabase
      .from('ares_interaction_stats')
      .select('questions_asked')
      .eq('user_id', userId)
      .eq('interaction_date', today)
      .maybeSingle();
    
    const isFirstOfDay = !existingStats || existingStats.questions_asked === 0;
    
    // Build interaction data
    const interactionData: InteractionData = {
      userId,
      toolsUsed: data.toolsUsed || [],
      isFirstOfDay,
      streakDays: data.streakDays || 0,
      isBloodworkAnalysis: data.messageText ? isBloodworkRelated(data.messageText) : false,
      isProtocolQuestion: data.messageText ? isProtocolRelated(data.messageText) : false,
    };
    
    // Calculate XP
    const xpResult = calculateInteractionXP(interactionData);
    
    // Upsert interaction stats
    const toolsUsedJson = (data.toolsUsed || []).reduce((acc, tool) => {
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Merge with existing tools
    const existingTools = existingStats ? (existingStats as any).tools_used || {} : {};
    const mergedTools = { ...existingTools };
    for (const [tool, count] of Object.entries(toolsUsedJson)) {
      mergedTools[tool] = (mergedTools[tool] || 0) + (count as number);
    }
    
    await supabase
      .from('ares_interaction_stats')
      .upsert({
        user_id: userId,
        interaction_date: today,
        questions_asked: (existingStats?.questions_asked || 0) + 1,
        tools_used: mergedTools,
        xp_earned: (existingStats as any)?.xp_earned || 0 + xpResult.totalXP,
        streak_multiplier: xpResult.multiplier,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,interaction_date',
      });
    
    // Update user_points
    const { data: userPoints } = await supabase
      .from('user_points')
      .select('total_points, daily_points')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userPoints) {
      await supabase
        .from('user_points')
        .update({
          total_points: (userPoints.total_points || 0) + xpResult.totalXP,
          daily_points: (userPoints.daily_points || 0) + xpResult.totalXP,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }
    
    // Update quest progress
    await updateQuestProgress(supabase, userId, 'ares_question');
    
    if (data.toolsUsed && data.toolsUsed.length > 0) {
      for (const tool of data.toolsUsed) {
        await updateQuestProgress(supabase, userId, tool);
      }
    }
    
    return xpResult;
    
  } catch (error) {
    console.error('[Gamification] Error awarding XP:', error);
    return null;
  }
}

/**
 * Ensure user has daily quests, generate if needed
 */
export async function ensureDailyQuests(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Check for existing quests
    const { data: existingQuests } = await supabase
      .from('daily_quests')
      .select('id')
      .eq('user_id', userId)
      .eq('quest_date', today)
      .limit(1);
    
    if (existingQuests && existingQuests.length > 0) {
      return; // Already have quests for today
    }
    
    // Generate new quests
    const quests = generateDailyQuests(userId);
    
    // Insert quests
    const questsToInsert = quests.map(q => ({
      user_id: userId,
      quest_date: today,
      ...q,
    }));
    
    await supabase
      .from('daily_quests')
      .insert(questsToInsert);
    
  } catch (error) {
    console.error('[Gamification] Error ensuring daily quests:', error);
  }
}

/**
 * Update progress on daily quests
 */
async function updateQuestProgress(
  supabase: SupabaseClient,
  userId: string,
  action: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Get today's quests
    const { data: quests } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_date', today)
      .eq('is_completed', false);
    
    if (!quests || quests.length === 0) return;
    
    for (const quest of quests) {
      const newProgress = getQuestProgressUpdate(
        quest.quest_type,
        action,
        quest.progress
      );
      
      if (newProgress > quest.progress) {
        const isCompleted = newProgress >= quest.target;
        
        await supabase
          .from('daily_quests')
          .update({
            progress: newProgress,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
          })
          .eq('id', quest.id);
        
        // Award quest XP if completed
        if (isCompleted) {
          const { data: userPoints } = await supabase
            .from('user_points')
            .select('total_points, daily_points')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (userPoints) {
            await supabase
              .from('user_points')
              .update({
                total_points: (userPoints.total_points || 0) + quest.xp_reward,
                daily_points: (userPoints.daily_points || 0) + quest.xp_reward,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('[Gamification] Error updating quest progress:', error);
  }
}
