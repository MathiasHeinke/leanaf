import { supabase } from '@/integrations/supabase/client';

export interface DataLogEntry {
  operation: string;
  table?: string;
  stage: 'start' | 'success' | 'error';
  duration?: number;
  error?: any;
  details?: Record<string, any>;
  trace_id: string;
  client_ts: Date;
}

class DataLogger {
  private traceId: string = '';
  private isEnabled: boolean = false;
  private activeOperations = new Map<string, { start: number; trace_id: string }>();

  constructor() {
    this.generateNewTrace();
    this.isEnabled = this.checkDebugMode();
  }

  private checkDebugMode(): boolean {
    try {
      // Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('dataDebug') === '1') {
        localStorage.setItem('data_debug', 'true');
        return true;
      }
      
      // Check localStorage
      return localStorage.getItem('data_debug') === 'true';
    } catch (error) {
      return false;
    }
  }

  generateNewTrace() {
    this.traceId = `data_trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTraceId() {
    return this.traceId;
  }

  isDebugEnabled() {
    return this.isEnabled;
  }

  startOperation(operation: string, table?: string, details?: Record<string, any>): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    if (this.isEnabled) {
      this.activeOperations.set(operationId, {
        start: Date.now(),
        trace_id: this.traceId
      });

      this.log({
        operation,
        table,
        stage: 'start',
        details,
        trace_id: this.traceId,
        client_ts: new Date()
      });
    }

    return operationId;
  }

  completeOperation(operationId: string, result?: any) {
    if (!this.isEnabled) return;

    const operation = this.activeOperations.get(operationId);
    if (operation) {
      const duration = Date.now() - operation.start;
      
      this.log({
        operation: operationId.split('_')[0],
        stage: 'success',
        duration,
        details: { result_count: Array.isArray(result) ? result.length : result ? 1 : 0 },
        trace_id: operation.trace_id,
        client_ts: new Date()
      });

      this.activeOperations.delete(operationId);
    }
  }

  errorOperation(operationId: string, error: any) {
    if (!this.isEnabled) return;

    const operation = this.activeOperations.get(operationId);
    if (operation) {
      const duration = Date.now() - operation.start;
      
      this.log({
        operation: operationId.split('_')[0],
        stage: 'error',
        duration,
        error: {
          message: error?.message || String(error),
          code: error?.code,
          details: error?.details
        },
        trace_id: operation.trace_id,
        client_ts: new Date()
      });

      this.activeOperations.delete(operationId);
    }
  }

  private async log(entry: DataLogEntry) {
    // Always log to console if debug is enabled
    if (this.isEnabled) {
      const logLevel = entry.stage === 'error' ? 'error' : entry.stage === 'start' ? 'info' : 'log';
      console[logLevel]('📊 Data Debug:', {
        ...entry,
        timestamp: entry.client_ts.toISOString()
      });
    }

    // Store in localStorage for overlay access
    try {
      const logs = JSON.parse(localStorage.getItem('data_debug_logs') || '[]');
      logs.unshift({ ...entry, id: `data_${Date.now()}` });
      // Keep only last 100 logs
      logs.splice(100);
      localStorage.setItem('data_debug_logs', JSON.stringify(logs));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  async getRecentLogs(limit: number = 100) {
    try {
      const logs = JSON.parse(localStorage.getItem('data_debug_logs') || '[]');
      return logs.slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem('data_debug_logs');
  }
}

export const dataLogger = new DataLogger();
