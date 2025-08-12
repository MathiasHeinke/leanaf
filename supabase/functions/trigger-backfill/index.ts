import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type BackfillRequest = {
  userId: string
  days?: number
  chunkSize?: number
  strategy?: 'progressive' | 'single'
  allowPartial?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, days = 14, chunkSize, strategy = 'progressive', allowPartial = true }: BackfillRequest = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Triggering backfill for user ${userId} over ${days} days (strategy=${strategy}, chunkSize=${chunkSize ?? 'auto'})`)

    const effectiveDays = Math.max(1, Math.min(365, days))
    const computedChunk = Math.max(1, Math.min(30, chunkSize ?? (effectiveDays > 14 ? 7 : effectiveDays)))

    // Build progressive milestones to leverage idempotency (e.g., 7 -> 14 -> 21 -> 30)
    const milestones: number[] = []
    if (strategy === 'single' || computedChunk >= effectiveDays) {
      milestones.push(effectiveDays)
    } else {
      for (let d = computedChunk; d < effectiveDays; d += computedChunk) {
        milestones.push(d)
      }
      if (milestones[milestones.length - 1] !== effectiveDays) {
        milestones.push(effectiveDays)
      }
    }

    const results: Array<{ days: number; rows: number; status: 'success' | 'error'; error?: any; duration_ms: number }> = []
    let totalRows = 0
    let errors = 0

    for (const d of milestones) {
      const started = Date.now()
      try {
        console.log(`Backfill chunk -> last ${d} days`)
        const { data, error } = await supabase.rpc('backfill_daily_summaries_v2', {
          p_user_id: userId,
          p_days: d,
        })
        const duration_ms = Date.now() - started
        if (error) {
          console.error('Backfill RPC error:', error)
          errors++
          results.push({ days: d, rows: 0, status: 'error', error: { code: (error as any).code, message: error.message }, duration_ms })
          if (!allowPartial) break
        } else {
          const rows = Array.isArray(data) ? data.length : 0
          totalRows += rows
          results.push({ days: d, rows, status: 'success', duration_ms })
          // Small delay to avoid overwhelming the system
          await new Promise((r) => setTimeout(r, 150))
        }
      } catch (err: any) {
        const duration_ms = Date.now() - started
        console.error('Backfill unexpected chunk error:', err)
        errors++
        results.push({ days: d, rows: 0, status: 'error', error: { message: err?.message || String(err) }, duration_ms })
        if (!allowPartial) break
      }
    }

    const summary = {
      strategy,
      requested_days: effectiveDays,
      chunk_size: computedChunk,
      milestones,
      chunks_total: results.length,
      chunks_errors: errors,
      total_rows_reported: totalRows,
      completed: errors === 0 || allowPartial,
    }

    const httpStatus = errors > 0 && !allowPartial ? 500 : errors > 0 ? 207 : 200
    return new Response(
      JSON.stringify({ status: errors ? (allowPartial ? 'partial' : 'error') : 'completed', summary, results }),
      { status: httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Unexpected error in trigger-backfill:', e)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
