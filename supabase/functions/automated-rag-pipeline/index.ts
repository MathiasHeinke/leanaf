import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipelineConfig {
  id: string;
  pipeline_name: string;
  is_enabled: boolean;
  interval_minutes: number;
  max_entries_per_run: number;
  last_run_at: string | null;
  next_run_at: string | null;
  failure_count: number;
  max_failures: number;
  config_data: {
    areas: string[];
    batch_rotation: boolean;
    models: string[];
  };
}

interface PipelineRun {
  id: string;
  pipeline_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  entries_processed: number;
  entries_successful: number;
  entries_failed: number;
  error_message?: string;
  execution_time_ms?: number;
  metadata: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, config_update } = await req.json().catch(() => ({}));

    switch (action) {
      case 'run_pipeline':
        return await runPipeline(supabase);
      
      case 'check_schedule':
        return await checkScheduledRuns(supabase);
      
      case 'update_config':
        return await updatePipelineConfig(supabase, config_update);
      
      case 'get_status':
        return await getPipelineStatus(supabase);
      
      default:
        return await checkScheduledRuns(supabase);
    }
  } catch (error) {
    console.error('Error in automated-rag-pipeline:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function runPipeline(supabase: any): Promise<Response> {
  const startTime = Date.now();
  
  // Erstelle Pipeline-Run Record
  const { data: runRecord, error: runError } = await supabase
    .from('automated_pipeline_runs')
    .insert({
      pipeline_type: 'perplexity_knowledge',
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (runError) {
    throw new Error(`Failed to create run record: ${runError.message}`);
  }

  try {
    // Hole Pipeline-Konfiguration
    const { data: config } = await supabase
      .from('pipeline_automation_config')
      .select('*')
      .eq('pipeline_name', 'perplexity_knowledge_pipeline')
      .single();

    if (!config || !config.is_enabled) {
      await supabase
        .from('automated_pipeline_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'Pipeline disabled or config not found'
        })
        .eq('id', runRecord.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Pipeline is disabled or not configured',
          run_id: runRecord.id
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Führe Perplexity Pipeline aus
    const pipelineResult = await supabase.functions.invoke('perplexity-knowledge-pipeline', {
      body: {
        area: 'BATCH',
        batchSize: config.max_entries_per_run
      }
    });

    if (pipelineResult.error) {
      throw new Error(`Pipeline execution failed: ${pipelineResult.error.message}`);
    }

    const pipelineData = pipelineResult.data;
    
    // Aktualisiere Run Record
    await supabase
      .from('automated_pipeline_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        entries_processed: pipelineData.summary?.total_processed || 0,
        entries_successful: pipelineData.summary?.successful || 0,
        entries_failed: pipelineData.summary?.failed || 0,
        metadata: {
          pipeline_result: pipelineData,
          processed_areas: pipelineData.summary?.processed_areas || [],
          execution_time_ms: pipelineData.execution_time_ms
        }
      })
      .eq('id', runRecord.id);

    // Aktualisiere Pipeline-Konfiguration
    const nextRunTime = new Date(Date.now() + config.interval_minutes * 60 * 1000);
    await supabase
      .from('pipeline_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunTime.toISOString(),
        failure_count: 0 // Reset bei erfolgreichem Lauf
      })
      .eq('pipeline_name', 'perplexity_knowledge_pipeline');

    // Trigger Embedding-Generierung im Hintergrund
    if (pipelineData.summary?.successful > 0) {
      // Verwende waitUntil für Background-Task
      try {
        const embeddingResult = await supabase.functions.invoke('generate-embeddings', {
          body: { auto_run: true }
        });
        console.log('🔧 Background embedding generation triggered:', embeddingResult);
      } catch (embeddingError) {
        console.error('⚠️ Background embedding generation failed:', embeddingError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        run_id: runRecord.id,
        execution_time_ms: Date.now() - startTime,
        entries_processed: pipelineData.summary?.total_processed || 0,
        entries_successful: pipelineData.summary?.successful || 0,
        entries_failed: pipelineData.summary?.failed || 0,
        next_run_at: nextRunTime.toISOString()
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Markiere Run als fehlgeschlagen
    await supabase
      .from('automated_pipeline_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        error_message: error.message
      })
      .eq('id', runRecord.id);

    // Erhöhe Failure Count
    await supabase
      .from('pipeline_automation_config')
      .update({
        failure_count: supabase.sql`failure_count + 1`
      })
      .eq('pipeline_name', 'perplexity_knowledge_pipeline');

    throw error;
  }
}

async function checkScheduledRuns(supabase: any): Promise<Response> {
  const { data: config } = await supabase
    .from('pipeline_automation_config')
    .select('*')
    .eq('pipeline_name', 'perplexity_knowledge_pipeline')
    .single();

  if (!config || !config.is_enabled) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Pipeline is disabled or not configured' 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const now = new Date();
  const nextRunTime = config.next_run_at ? new Date(config.next_run_at) : null;
  const lastRunTime = config.last_run_at ? new Date(config.last_run_at) : null;

  let shouldRun = false;
  let reason = '';

  if (!lastRunTime) {
    shouldRun = true;
    reason = 'First run';
  } else if (!nextRunTime) {
    shouldRun = true;
    reason = 'No next run time set';
  } else if (now >= nextRunTime) {
    shouldRun = true;
    reason = 'Scheduled time reached';
  } else {
    const timeSinceLastRun = now.getTime() - lastRunTime.getTime();
    const intervalMs = config.interval_minutes * 60 * 1000;
    
    if (timeSinceLastRun >= intervalMs) {
      shouldRun = true;
      reason = 'Interval exceeded';
    }
  }

  // Prüfe auf zu viele Fehler
  if (shouldRun && config.failure_count >= config.max_failures) {
    shouldRun = false;
    reason = `Too many failures (${config.failure_count}/${config.max_failures})`;
  }

  if (shouldRun) {
    return await runPipeline(supabase);
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      should_run: false,
      reason,
      next_run_at: nextRunTime?.toISOString(),
      last_run_at: lastRunTime?.toISOString(),
      failure_count: config.failure_count,
      config
    }), 
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updatePipelineConfig(supabase: any, configUpdate: Partial<PipelineConfig>): Promise<Response> {
  const { data, error } = await supabase
    .from('pipeline_automation_config')
    .update(configUpdate)
    .eq('pipeline_name', 'perplexity_knowledge_pipeline')
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update config: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      config: data
    }), 
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getPipelineStatus(supabase: any): Promise<Response> {
  const [configResult, recentRunsResult] = await Promise.all([
    supabase
      .from('pipeline_automation_config')
      .select('*')
      .eq('pipeline_name', 'perplexity_knowledge_pipeline')
      .single(),
    
    supabase
      .from('automated_pipeline_runs')
      .select('*')
      .eq('pipeline_type', 'perplexity_knowledge')
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  return new Response(
    JSON.stringify({ 
      success: true,
      config: configResult.data,
      recent_runs: recentRunsResult.data || [],
      status: {
        is_enabled: configResult.data?.is_enabled || false,
        last_run_at: configResult.data?.last_run_at,
        next_run_at: configResult.data?.next_run_at,
        failure_count: configResult.data?.failure_count || 0
      }
    }), 
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log('🤖 Automated RAG Pipeline function loaded successfully');