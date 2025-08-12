
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackfillRequest {
  userId: string;
  summaryType: 'weekly' | 'monthly' | 'both';
  weeks?: number; // Number of weeks to backfill (default: 4)
  months?: number; // Number of calendar months to backfill (default: 3)
  days?: number; // Optional: use rolling N days for monthly backfill (e.g., 30)
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
      days = 0,
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
            },
            headers: {
              'x-internal-call': 'true'
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

    // Monthly backfill (supports rolling N days, e.g., 30)
    if (summaryType === 'monthly' || summaryType === 'both') {
      // Determine which (year, month) pairs to process
      const monthsToProcess: { year: number; month: number }[] = [];

      if (days && days > 0) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));

        // Walk months from start to end, include each month once
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMarker = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cursor <= endMarker) {
          monthsToProcess.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      } else {
        for (let i = 0; i < months; i++) {
          const now = new Date();
          const targetMonth = now.getMonth() - i;
          const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
          const adjustedMonth = ((targetMonth % 12) + 12) % 12 + 1;
          monthsToProcess.push({ year: targetYear, month: adjustedMonth });
        }
      }

      for (const m of monthsToProcess) {
        try {
          const response = await supabase.functions.invoke('generate-monthly-summary', {
            body: {
              userId,
              year: m.year,
              month: m.month,
              force
            },
            headers: {
              'x-internal-call': 'true'
            }
          });

          results.push({
            type: 'monthly',
            period: `${m.year}-${String(m.month).padStart(2, '0')}`,
            status: response.data?.status || 'completed',
            data: response.data
          });

          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error processing month ${m.year}-${String(m.month).padStart(2, '0')}:`, error);
          results.push({
            type: 'monthly',
            period: `${m.year}-${String(m.month).padStart(2, '0')}`,
            status: 'error',
            error: (error as any).message
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
