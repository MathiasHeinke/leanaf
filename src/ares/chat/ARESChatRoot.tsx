import { useMemo } from 'react';
import { ARESOrchestratorClient } from '../orchestrator/ARESOrchestratorClient';
import { useARESMessageStore } from '../state/ARESMessageStore';
import { useComponentTrace } from '../trace/withTrace';
import ARESMessageList from './ARESMessageList';
import ARESComposer from './ARESComposer';

export default function ARESChatRoot({ userId }: { userId: string }) {
  const client = useMemo(() => new ARESOrchestratorClient(), []);
  const store = useARESMessageStore();
  
  // Component tracing
  useComponentTrace('ARES:ChatRoot', store.s.lastTraceId);

  return (
    <div className="flex h-full w-full flex-col">
      <ARESMessageList store={store} />
      <ARESComposer store={store} client={client} userId={userId} />
    </div>
  );
}
