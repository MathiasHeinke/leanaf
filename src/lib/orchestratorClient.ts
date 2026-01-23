import { supabase } from '@/integrations/supabase/client';

export interface AresCallOptions {
  text: string;
  attachments?: any[];
  context?: Record<string, any>;
  coachId?: string;
}

export interface AresResponse {
  data: any;
  traceId: string;
}

export interface AresError extends Error {
  status?: number;
  traceId?: string;
  raw?: string;
  code?: string;
}

function newTraceId(): string {
  return 't_' + Math.random().toString(36).slice(2, 12);
}

export async function sendToAres({
  text,
  attachments,
  context,
  coachId = 'ares'
}: AresCallOptions): Promise<AresResponse> {
  const { data: sess } = await supabase.auth.getSession();
  const accessToken = sess?.session?.access_token;
  const traceId = newTraceId();

  // Bullet-proof payload format - supports both modern and legacy
  const payload = {
    // Primary, modern shape
    event: { 
      type: 'TEXT', 
      text: text ?? '', 
      clientEventId: traceId,
      images: attachments || null
    },
    context: context ?? {},
    traceId,
    coachId,
    // Legacy fallbacks so server can parse older formats too
    text: text ?? '',
    message: text ?? '',
    images: attachments || null
  };

  console.log('🔧 ARES Call:', { 
    traceId, 
    textLength: (text || '').length, 
    coachId, 
    hasAuth: !!accessToken 
  });

  // Explicitly pass the user's access token - invoke() sometimes uses anon key
  if (!accessToken) {
    const aresError = Object.assign(
      new Error('Not authenticated - please sign in'),
      { status: 401, traceId, code: 'NO_SESSION' }
    ) as AresError;
    throw aresError;
  }

  const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
    body: payload,
    headers: {
      'x-trace-id': traceId,
      'x-source': 'web',
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    }
  });

  // Supabase JS hides the actual HTTP status; surface it for debugging
  if (error) {
    // Extract real HTTP status and response body from Supabase error
    // @ts-ignore - accessing internal Supabase error structure
    const status = error?.context?.response?.status;
    // @ts-ignore
    let body = '';
    try {
      // @ts-ignore
      body = await error?.context?.response?.text?.().catch(() => '');
    } catch {
      body = error.message || '';
    }

    const aresError = Object.assign(
      new Error(`ARES ${status ?? 'ERR'}: ${body || error.message}`),
      { 
        status, 
        traceId, 
        raw: body,
        code: status ? `HTTP_${status}` : 'NETWORK_ERROR'
      }
    ) as AresError;

    console.error('🔧 ARES Error:', {
      status,
      traceId,
      raw: body,
      originalError: error
    });

    throw aresError;
  }

  console.log('🔧 ARES Success:', { traceId, responseKeys: Object.keys(data || {}) });

  return { data, traceId };
}

export async function fetchTraceDetails(traceId: string) {
  try {
    const { data, error } = await supabase
      .from('ares_traces')
      .select('trace_id, status, persona, context, rag_sources, system_prompt, complete_prompt, llm_input, llm_output, error, duration_ms, created_at')
      .eq('trace_id', traceId)
      .maybeSingle();

    if (error) {
      console.warn('Failed to fetch trace details:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('Error fetching trace details:', err);
    return null;
  }
}