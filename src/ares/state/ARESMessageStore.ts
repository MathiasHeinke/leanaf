import { useEffect, useReducer } from 'react';

export type ARESMsg = {
  id: string;
  role: 'user'|'assistant'|'system';
  content: string;
  ts: number;
  traceId?: string | null;
};

type S = { items: ARESMsg[]; sending: boolean; lastTraceId?: string | null; error?: string | null };
type A =
  | { type: 'ADD'; msg: ARESMsg }
  | { type: 'SENDING'; val: boolean }
  | { type: 'TRACE'; traceId: string | null }
  | { type: 'ERROR'; message: string | null };

function r(state: S, a: A): S {
  switch (a.type) {
    case 'ADD': return { ...state, items: [...state.items, a.msg] };
    case 'SENDING': return { ...state, sending: a.val };
    case 'TRACE': return { ...state, lastTraceId: a.traceId };
    case 'ERROR': return { ...state, error: a.message };
    default: return state;
  }
}

export function useARESMessageStore() {
  const [s, dispatch] = useReducer(r, { items: [], sending: false, error: null });

  useEffect(() => { /* optional: load persisted */ }, []);

  return { s, dispatch };
}