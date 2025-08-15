import { supabase } from '@/integrations/supabase/client';

export interface AuthLogEntry {
  event: string;
  stage?: string;
  pathname: string;
  from_path?: string;
  to_path?: string;
  is_preview_mode: boolean;
  has_user: boolean;
  has_session: boolean;
  has_access_token: boolean;
  auth_event?: string;
  session_user_id?: string;
  details?: Record<string, any>;
  trace_id: string;
  client_ts: Date;
}

class AuthLogger {
  private traceId: string = '';
  private isEnabled: boolean = false;

  constructor() {
    this.generateNewTrace();
    this.isEnabled = window.location.search.includes('authDebug=1') || 
                     localStorage.getItem('auth_debug') === 'true';
  }

  generateNewTrace() {
    this.traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTraceId() {
    return this.traceId;
  }

  isDebugEnabled() {
    return this.isEnabled;
  }

  async log(entry: Partial<AuthLogEntry>) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return; // Can't log without user

    const logEntry: AuthLogEntry = {
      event: entry.event || 'UNKNOWN',
      stage: entry.stage,
      pathname: window.location.pathname,
      from_path: entry.from_path,
      to_path: entry.to_path,
      is_preview_mode: window.location.hostname.includes('lovable'),
      has_user: !!user,
      has_session: !!(await supabase.auth.getSession()).data.session,
      has_access_token: !!(await supabase.auth.getSession()).data.session?.access_token,
      auth_event: entry.auth_event,
      session_user_id: user?.id,
      details: entry.details || {},
      trace_id: this.traceId,
      client_ts: new Date(),
    };

    try {
      await supabase.from('auth_debug_logs').insert({
        user_id: user.id,
        event_time: logEntry.client_ts.toISOString(),
        event: logEntry.event,
        stage: logEntry.stage,
        pathname: logEntry.pathname,
        from_path: logEntry.from_path,
        to_path: logEntry.to_path,
        is_preview_mode: logEntry.is_preview_mode,
        has_user: logEntry.has_user,
        has_session: logEntry.has_session,
        has_access_token: logEntry.has_access_token,
        auth_event: logEntry.auth_event,
        session_user_id: logEntry.session_user_id,
        details: logEntry.details,
        trace_id: logEntry.trace_id,
        client_ts: logEntry.client_ts.toISOString(),
        user_agent: navigator.userAgent,
        ip: null // Will be populated by Supabase
      });

      if (this.isEnabled) {
        console.log('🔐 Auth Debug:', logEntry);
      }
    } catch (error) {
      console.warn('Failed to log auth event:', error);
    }
  }

  async getRecentLogs(limit: number = 50) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await supabase
      .from('auth_debug_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('event_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch auth logs:', error);
      return [];
    }

    return data || [];
  }
}

export const authLogger = new AuthLogger();