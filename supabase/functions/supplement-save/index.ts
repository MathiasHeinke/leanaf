// supabase/functions/supplement-save/index.ts
// Thin Function: Save a recognized supplement to the user's stack with idempotency and telemetry.
// Contract (POST): { userId?: string, item: { name: string; canonical?: string|null; dose?: string|null; confidence?: number|null; notes?: string|null; image_url?: string|null }, clientEventId?: string }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logTraceEvent, softTruncate } from "../telemetry.ts";

type Json = Record<string, any>;

const HANDLER = "supplement-save";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();
  const authorization = req.headers.get("Authorization") ?? "";
  const source = req.headers.get("x-source") ?? "chat";
  const chatMode = req.headers.get("x-chat-mode") ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      clientEventId?: string | null;
      mode?: 'insert' | 'update';
      item?: {
        id?: number;
        canonical?: string;
        name?: string;
        dose?: string | null;
        schedule?: {
          freq?: 'daily' | 'weekly' | 'custom';
          time?: 'morning' | 'noon' | 'evening' | 'preworkout' | 'postworkout' | 'bedtime' | 'custom';
          custom?: string | null;
        } | null;
        notes?: string | null;
      };
    };

    const { data: userRes } = await supabase.auth.getUser();
    const authUserId = userRes?.user?.id ?? null;

    const inputUserId = body?.userId;
    const mode = (body?.mode as 'insert' | 'update') || 'insert';
    const item = body?.item;
    const clientEventId = body?.clientEventId ?? null;
    const userId = inputUserId || authUserId || null;

    const sanitizeText = (v: unknown, max = 160) =>
      typeof v === 'string' ? v.trim().slice(0, max) : null;

    const sanitizeSchedule = (s: any) => {
      if (!s || typeof s !== 'object') return null;
      const out: Record<string, any> = {};
      if (s.freq && ['daily', 'weekly', 'custom'].includes(s.freq)) out.freq = s.freq;
      if (s.time && ['morning', 'noon', 'evening', 'preworkout', 'postworkout', 'bedtime', 'custom'].includes(s.time)) out.time = s.time;
      if (s.custom) out.custom = String(s.custom).slice(0, 120);
      return Object.keys(out).length ? out : null;
    };

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: null,
      stage: 'received',
      handler: HANDLER,
      status: 'RUNNING',
      payload: softTruncate(
        { input: { mode, hasItem: Boolean(item), canonical: item?.canonical, hasSchedule: Boolean(item?.schedule) }, headers: { source, chatMode } },
        4000,
      ),
    });

    if (!userId) return respond({ success: false, error: 'Authentication required' }, 401);
    if (!item) return respond({ success: false, error: 'Invalid item' }, 400);

    // Quick idempotency check via client_event_id
    if (clientEventId) {
      const { data: existingByEvent } = await supabase
        .from('user_supplements')
        .select('id')
        .eq('user_id', userId)
        .eq('client_event_id', clientEventId)
        .maybeSingle();
      if (existingByEvent?.id) {
        await logTraceEvent(supabase, {
          traceId,
          userId,
          coachId: null,
          stage: 'tool_result',
          handler: HANDLER,
          status: 'OK',
          payload: { idempotent: true, id: existingByEvent.id, mode },
        });
        await logTraceEvent(supabase, { traceId, userId, coachId: null, stage: 'reply_send', handler: HANDLER, status: 'OK' });
        return respond({ success: true, id: existingByEvent.id, action: 'noop', idempotent: true });
      }
    }

    const execStart = Date.now();
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: null,
      stage: 'tool_exec',
      handler: HANDLER,
      status: 'RUNNING',
      payload: softTruncate({ action: 'save user_supplements', mode }, 2000),
    });

    if (mode === 'update') {
      // Resolve target by id or (user, canonical, name)
      let targetId = item.id ?? null;
      if (!targetId) {
        if (!item.canonical || !item.name) {
          return respond({ success: false, error: 'Update requires item.id or (canonical + name)' }, 400);
        }
        const { data: found } = await supabase
          .from('user_supplements')
          .select('id')
          .eq('user_id', userId)
          .eq('canonical', String(item.canonical))
          .eq('name', String(item.name))
          .maybeSingle();
        targetId = found?.id ?? null;
      }

      if (!targetId) return respond({ success: false, error: 'Target supplement not found' }, 404);

      // Build patch from provided fields only
      const patch: Record<string, any> = {};
      if (typeof item.dose !== 'undefined') patch.dose = sanitizeText(item.dose, 60);
      if (typeof item.notes !== 'undefined') patch.notes = sanitizeText(item.notes, 1000);
      if (typeof item.schedule !== 'undefined') patch.schedule = sanitizeSchedule(item.schedule);
      if (clientEventId) patch.client_event_id = clientEventId;

      if (Object.keys(patch).length === 0) {
        await logTraceEvent(supabase, {
          traceId,
          userId,
          coachId: null,
          stage: 'tool_result',
          handler: HANDLER,
          status: 'OK',
          latencyMs: Date.now() - execStart,
          payload: { action: 'noop' },
        });
        return respond({ success: true, id: targetId, action: 'noop' });
      }

      const { data: upd, error: updErr } = await supabase
        .from('user_supplements')
        .update(patch)
        .eq('id', targetId)
        .eq('user_id', userId)
        .select('id')
        .single();

      if (updErr) {
        // If unique violation on client_event_id, treat as idempotent
        if ((updErr as any).code === '23505' && clientEventId) {
          const { data: exists } = await supabase
            .from('user_supplements')
            .select('id')
            .eq('user_id', userId)
            .eq('client_event_id', clientEventId)
            .maybeSingle();
          if (exists?.id) {
            await logTraceEvent(supabase, {
              traceId,
              userId,
              coachId: null,
              stage: 'tool_result',
              handler: HANDLER,
              status: 'OK',
              latencyMs: Date.now() - execStart,
              payload: { action: 'update', idempotent: true },
            });
            return respond({ success: true, id: exists.id, action: 'update', idempotent: true });
          }
        }
        throw updErr;
      }

      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId: null,
        stage: 'tool_result',
        handler: HANDLER,
        status: 'OK',
        latencyMs: Date.now() - execStart,
        payload: softTruncate({ output: { id: upd?.id }, action: 'update' }, 2000),
      });

      await logTraceEvent(supabase, { traceId, userId, coachId: null, stage: 'reply_send', handler: HANDLER, status: 'OK' });
      return respond({ success: true, id: upd?.id, action: 'update' });
    }

    // INSERT branch
    const canonical = sanitizeText(item.canonical, 160);
    const name = sanitizeText(item.name, 160);
    if (!canonical || !name) return respond({ success: false, error: 'canonical and name required' }, 400);

    const insertPayload: Json = {
      user_id: userId,
      canonical,
      name,
      dose: sanitizeText(item.dose, 60),
      schedule: sanitizeSchedule(item.schedule),
      notes: sanitizeText(item.notes, 1000),
      client_event_id: clientEventId,
    };

    const { data: ins, error: insErr } = await supabase
      .from('user_supplements')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insErr) {
      // Handle uniqueness on (user_id, canonical, name)
      if ((insErr as any).code === '23505') {
        // Check idempotency via client_event_id first
        if (clientEventId) {
          const { data: existsByEvent } = await supabase
            .from('user_supplements')
            .select('id')
            .eq('user_id', userId)
            .eq('client_event_id', clientEventId)
            .maybeSingle();
          if (existsByEvent?.id) {
            await logTraceEvent(supabase, {
              traceId,
              userId,
              coachId: null,
              stage: 'tool_result',
              handler: HANDLER,
              status: 'OK',
              latencyMs: Date.now() - execStart,
              payload: { idempotent: true },
            });
            await logTraceEvent(supabase, { traceId, userId, coachId: null, stage: 'reply_send', handler: HANDLER, status: 'OK' });
            return respond({ success: true, id: existsByEvent.id, action: 'noop', idempotent: true });
          }
        }
        // Otherwise treat as duplicate by uniqueness
        const { data: existing } = await supabase
          .from('user_supplements')
          .select('id')
          .eq('user_id', userId)
          .eq('canonical', canonical)
          .eq('name', name)
          .maybeSingle();
        await logTraceEvent(supabase, {
          traceId,
          userId,
          coachId: null,
          stage: 'tool_result',
          handler: HANDLER,
          status: 'OK',
          latencyMs: Date.now() - execStart,
          payload: { duplicate: true, existingId: existing?.id },
        });
        await logTraceEvent(supabase, { traceId, userId, coachId: null, stage: 'reply_send', handler: HANDLER, status: 'OK' });
        return respond({ success: true, id: existing?.id, action: 'noop', duplicate: true });
      }
      throw insErr;
    }

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: null,
      stage: 'tool_result',
      handler: HANDLER,
      status: 'OK',
      latencyMs: Date.now() - execStart,
      payload: softTruncate({ output: { id: ins?.id }, action: 'insert' }, 2000),
    });

    await logTraceEvent(supabase, { traceId, userId, coachId: null, stage: 'reply_send', handler: HANDLER, status: 'OK' });
    return respond({ success: true, id: ins?.id, action: 'insert' });
  } catch (e: any) {
    try {
      await logTraceEvent(supabase, {
        traceId,
        userId: null,
        coachId: null,
        stage: 'error',
        handler: HANDLER,
        status: 'ERROR',
        latencyMs: Date.now() - t0,
        errorMessage: String(e?.message || e),
      });
    } catch {
      // ignore logging failure
    }
    return respond({ success: false, error: 'supplement-save failed' }, 500);
  }
});
