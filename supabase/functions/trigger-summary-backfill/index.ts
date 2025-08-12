
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackfillRequest {
  userId: string;
  summaryType: 'weekly' | 'monthly' | 'both';
  weeks?: number; // Number of weeks to backfill (default: 4)
  months?: number; // Number of months to backfill (default: 3)
  force?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      userId, 
      summaryType, 
      weeks = 4, 
      months = 3, 
      force = false 
    }: BackfillRequest = await req.json();

    if (!userId || !summaryType) {
      return new Response(
        JSON.stringify({ error: 'userId and summaryType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting backfill for user ${userId}, type: ${summaryType}`);

    const results: any[] = [];

    // Weekly backfill
    if (summaryType === 'weekly' || summaryType === 'both') {
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date();
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff - (i * 7));
        
        try {
          const response = await supabase.functions.invoke('generate-weekly-summary', {
            body: {
              userId,
              weekStart: weekStart.toISOString().split('T')[0],
              force
            }
          });

          results.push({
            type: 'weekly',
            period: weekStart.toISOString().split('T')[0],
            status: response.data?.status || 'completed',
            data: response.data
          });

          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error processing week ${i}:`, error);
          results.push({
            type: 'weekly',
            period: weekStart.toISOString().split('T')[0],
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Monthly backfill
    if (summaryType === 'monthly' || summaryType === 'both') {
      for (let i = 0; i < months; i++) {
        const now = new Date();
        const targetMonth = now.getMonth() - i;
        const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
        const adjustedMonth = ((targetMonth % 12) + 12) % 12 + 1;

        try {
          const response = await supabase.functions.invoke('generate-monthly-summary', {
            body: {
              userId,
              year: targetYear,
              month: adjustedMonth,
              force
            }
          });

          results.push({
            type: 'monthly',
            period: `${targetYear}-${String(adjustedMonth).padStart(2, '0')}`,
            status: response.data?.status || 'completed',
            data: response.data
          });

          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error processing month ${i}:`, error);
          results.push({
            type: 'monthly',
            period: `${targetYear}-${String(adjustedMonth).padStart(2, '0')}`,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success' || r.status === 'completed').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`Backfill completed: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        status: 'completed',
        summary: {
          total: results.length,
          success: successCount,
          errors: errorCount,
          skipped: skippedCount
        },
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in trigger-summary-backfill:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
