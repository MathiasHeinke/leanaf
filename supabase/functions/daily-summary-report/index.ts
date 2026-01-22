import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ReportRequest = {
  userId: string
  days?: number
}

type DayReport = {
  date: string
  nutrition: { calories: number; meals_count: number }
  training: { sets_count: number; volume_kg: number }
  hydration: { total_ml: number }
  sleep: { has_entry: boolean; sleep_score: number | null }
  supplements: { entries: number }
  mindset: { entries: number }
  summary_present: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, days = 14, timezone = 'Europe/Berlin' }: ReportRequest & { timezone?: string } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate dates in user's timezone
    const dates: string[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Format in user's timezone
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      dates.push(formatter.format(date))
    }

    const startDate = dates[dates.length - 1]
    const endDate = dates[0]

    // Load daily summaries
    const { data: summaries } = await supabase
      .from('daily_summaries')
      .select('date,total_calories,workout_volume,sleep_score')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Meals per day
    const { data: mealsAgg } = await supabase
      .from('meals')
      .select('date, calories')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Exercise sets per day
    const { data: setsAgg } = await supabase
      .from('exercise_sets')
      .select('date, reps, weight_kg')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Hydration per day
    const { data: fluidsAgg } = await supabase
      .from('user_fluids')
      .select('date, amount_ml')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Sleep entries per day
    const { data: sleepRows } = await supabase
      .from('sleep_tracking')
      .select('date, sleep_score')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Supplements per day
    const { data: suppAgg } = await supabase
      .from('supplement_intake_log')
      .select('date, id')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Mindset entries per day
    const { data: diaryAgg } = await supabase
      .from('diary_entries')
      .select('date, id')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Index helpers
    const sIdx = new Map((summaries || []).map((s) => [s.date, s]))
    const mealIdx = new Map<string, { count: number; kcal: number }>()
    ;(mealsAgg || []).forEach((m) => {
      const key = m.date
      const prev = mealIdx.get(key) || { count: 0, kcal: 0 }
      mealIdx.set(key, { count: prev.count + 1, kcal: prev.kcal + Number(m.calories || 0) })
    })

    const setsIdx = new Map<string, { count: number; volume: number }>()
    ;(setsAgg || []).forEach((s) => {
      const key = s.date
      const vol = (Number(s.reps || 0) * Number(s.weight_kg || 0)) || 0
      const prev = setsIdx.get(key) || { count: 0, volume: 0 }
      setsIdx.set(key, { count: prev.count + 1, volume: prev.volume + vol })
    })

    const fluidsIdx = new Map<string, number>()
    ;(fluidsAgg || []).forEach((f) => {
      const key = f.date
      fluidsIdx.set(key, (fluidsIdx.get(key) || 0) + Number(f.amount_ml || 0))
    })

    const sleepIdx = new Map<string, number | null>()
    ;(sleepRows || []).forEach((r) => sleepIdx.set(r.date, r.sleep_score ?? null))

    const suppIdx = new Map<string, number>()
    ;(suppAgg || []).forEach((r) => suppIdx.set(r.date, (suppIdx.get(r.date) || 0) + 1))

    const diaryIdx = new Map<string, number>()
    ;(diaryAgg || []).forEach((r) => diaryIdx.set(r.date, (diaryIdx.get(r.date) || 0) + 1))

    const report: DayReport[] = dates.map((d) => {
      const s = sIdx.get(d)
      const meals = mealIdx.get(d) || { count: 0, kcal: 0 }
      const sets = setsIdx.get(d) || { count: 0, volume: 0 }
      const fluids = fluidsIdx.get(d) || 0
      const sleepScore = sleepIdx.get(d) ?? null
      const supp = suppIdx.get(d) || 0
      const diary = diaryIdx.get(d) || 0

      return {
        date: d,
        nutrition: { calories: meals.kcal || Number(s?.total_calories || 0), meals_count: meals.count },
        training: { sets_count: sets.count, volume_kg: Number(s?.workout_volume || 0) || sets.volume },
        hydration: { total_ml: fluids },
        sleep: { has_entry: sleepScore !== null, sleep_score: sleepScore },
        supplements: { entries: supp },
        mindset: { entries: diary },
        summary_present: Boolean(s),
      }
    })

    // Missing flags overview
    const missing = {
      nutrition_missing: report.filter((r) => r.nutrition.calories <= 0).map((r) => r.date),
      training_missing: report.filter((r) => r.training.sets_count <= 0 && r.training.volume_kg <= 0).map((r) => r.date),
      hydration_missing: report.filter((r) => r.hydration.total_ml <= 0).map((r) => r.date),
      sleep_missing: report.filter((r) => !r.sleep.has_entry).map((r) => r.date),
      supplements_missing: report.filter((r) => r.supplements.entries <= 0).map((r) => r.date),
      mindset_missing: report.filter((r) => r.mindset.entries <= 0).map((r) => r.date),
      summary_missing: report.filter((r) => !r.summary_present).map((r) => r.date),
    }

    return new Response(
      JSON.stringify({ status: 'ok', range: { startDate, endDate }, report, missing }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('daily-summary-report error:', e)
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
