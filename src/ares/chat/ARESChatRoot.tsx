import { useMemo } from 'react';
import { ARESOrchestratorClient } from '../orchestrator/ARESOrchestratorClient';
import { useARESMessageStore } from '../state/ARESMessageStore';
import { useAresFlags } from '../flags/useAresFlags';
import { useComponentTrace } from '../trace/withTrace';
import ARESMessageList from './ARESMessageList';
import ARESComposer from './ARESComposer';
import ARESDebugPanel from './ARESDebugPanel';

export default function ARESChatRoot({ userId }: { userId: string }) {
  const client = useMemo(() => new ARESOrchestratorClient(), []);
  const store = useARESMessageStore();
  const { has } = useAresFlags();
  
  // Component tracing
  useComponentTrace('ARES:ChatRoot', store.s.lastTraceId);
  
  // Feature flag based debug panel - no ENV fallback
  const showDebug = has('ares.debug');

  return (
    <div className="flex h-full w-full flex-col">
      <ARESMessageList store={store} />
      <ARESComposer store={store} client={client} userId={userId} />
      {showDebug && <ARESDebugPanel lastTraceId={store.s.lastTraceId ?? null} />}
    </div>
  );
}