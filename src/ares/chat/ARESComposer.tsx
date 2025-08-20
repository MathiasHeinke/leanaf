import { useRef, useState } from 'react';
import type { ARESOrchestratorClient } from '../orchestrator/ARESOrchestratorClient';
import type { useARESMessageStore } from '../state/ARESMessageStore';
import { logOnce } from '../util/ARESLogger';

export default function ARESComposer({
  store, client, userId
}: {
  store: ReturnType<typeof useARESMessageStore>,
  client: ARESOrchestratorClient,
  userId: string
}) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  function autoresize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    const h = Math.min(200, Math.max(ta.scrollHeight, 36)); // 1 Zeile min
    ta.style.height = `${h}px`;
  }

  async function send() {
    if (!text.trim()) return;
    const id = crypto.randomUUID();
    store.dispatch({ type:'ADD', msg:{ id, role:'user', content:text, ts:Date.now() }});
    store.dispatch({ type:'SENDING', val:true });

    try {
      const res = await client.send({ type:'TEXT', text }, { userId, coachId:'ares' });
      store.dispatch({ type:'ADD', msg:{ id: `${id}-a`, role:'assistant', content:res.reply, ts:Date.now(), traceId:res.traceId }});
      store.dispatch({ type:'TRACE', traceId: res.traceId ?? null });
      setText('');
      autoresize();
    } catch (e: any) {
      logOnce('invoke', 'send failed', { status: e?.status, traceId: e?.traceId });
      store.dispatch({ type:'ERROR', message: e?.message || 'Fehler' });
    } finally {
      store.dispatch({ type:'SENDING', val:false });
    }
  }

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e)=>{ setText(e.target.value); autoresize(); }}
          onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          placeholder="Nachricht eingeben…"
          className="flex-1 resize-none rounded-2xl border px-4 py-2 outline-none min-h-[36px]"
        />
        <button onClick={send} className="h-10 rounded-2xl px-4 bg-primary text-primary-foreground disabled:opacity-50" disabled={store.s.sending}>
          Senden
        </button>
      </div>
    </div>
  );
}