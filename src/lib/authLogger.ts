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
    this.isEnabled = this.checkDebugMode();
  }

  private checkDebugMode(): boolean {
    try {
      // Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('authDebug') === '1') {
        localStorage.setItem('auth_debug', 'true');
        return true;
      }
      
      // Check localStorage
      return localStorage.getItem('auth_debug') === 'true';
    } catch (error) {
      return false;
    }
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
    const session = (await supabase.auth.getSession()).data.session;
    const user = session?.user;

    const logEntry: AuthLogEntry = {
      event: entry.event || 'UNKNOWN',
      stage: entry.stage,
      pathname: window.location.pathname,
      from_path: entry.from_path,
      to_path: entry.to_path,
      is_preview_mode: window.location.hostname.includes('lovable'),
      has_user: !!user,
      has_session: !!session,
      has_access_token: !!session?.access_token,
      auth_event: entry.auth_event,
      session_user_id: user?.id,
      details: entry.details || {},
      trace_id: this.traceId,
      client_ts: new Date(),
    };

    // Always log to console if debug is enabled
    if (this.isEnabled) {
      console.log('🔐 Auth Debug:', {
        ...logEntry,
        timestamp: logEntry.client_ts.toISOString()
      });
    }

    // Store in localStorage for overlay access
    try {
      const logs = JSON.parse(localStorage.getItem('auth_debug_logs') || '[]');
      logs.unshift({ ...logEntry, id: `local_${Date.now()}` });
      // Keep only last 50 logs
      logs.splice(50);
      localStorage.setItem('auth_debug_logs', JSON.stringify(logs));
    } catch (error) {
      // Ignore localStorage errors
    }

    // Try to save to database only if user exists
    if (user) {
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
      } catch (error) {
        console.warn('Failed to log auth event to database:', error);
      }
    }
  }

  getLocalLogs(limit: number = 50) {
    // Only read from localStorage - no network requests
    try {
      const localLogs = JSON.parse(localStorage.getItem('auth_debug_logs') || '[]');
      return localLogs.slice(0, limit);
    } catch (error) {
      console.error('Failed to read local auth logs:', error);
      return [];
    }
  }

  async getRecentLogs(limit: number = 50) {
    // First try localStorage for immediate access
    const localLogs = JSON.parse(localStorage.getItem('auth_debug_logs') || '[]');
    
    const session = (await supabase.auth.getSession()).data.session;
    const user = session?.user;
    if (!user || !session?.access_token) {
      return localLogs.slice(0, limit);
    }

    try {
      const { data, error } = await supabase
        .from('auth_debug_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('event_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch auth logs:', error);
        return localLogs.slice(0, limit);
      }

      // Merge database and local logs, removing duplicates
      const allLogs = [...(data || []), ...localLogs];
      const uniqueLogs = allLogs.filter((log, index, self) => 
        index === self.findIndex(l => l.trace_id === log.trace_id && l.event === log.event)
      );

      return uniqueLogs
        .sort((a, b) => new Date(b.event_time || b.client_ts).getTime() - new Date(a.event_time || a.client_ts).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch auth logs:', error);
      return localLogs.slice(0, limit);
    }
  }
}

export const authLogger = new AuthLogger();