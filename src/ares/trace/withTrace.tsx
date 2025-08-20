import { useEffect } from 'react';
import { ARES_EMIT } from './traceEmitter';

export function useComponentTrace(name: string, traceId?: string | null) {
  useEffect(() => {
    ARES_EMIT.push({ component: name, event: 'mount', traceId });
    return () => ARES_EMIT.push({ component: name, event: 'unmount', traceId });
  }, [name, traceId]);
}

export function useActionTrace() {
  return (name: string, action: string, meta?: any, traceId?: string | null) => {
    ARES_EMIT.push({ component: name, event: action, meta, traceId });
  };
}