import type { useARESMessageStore } from '../state/ARESMessageStore';

export default function ARESMessageList({ store }: { store: ReturnType<typeof useARESMessageStore> }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {store.s.items.map(m => (
        <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
          <div className={`inline-block max-w-[92%] rounded-2xl px-4 py-2 ${m.role==='user'?'bg-primary/10':'bg-muted'}`}>
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.traceId && m.role==='assistant' && (
              <div className="mt-1 text-[10px] text-muted-foreground">trace: {m.traceId}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}