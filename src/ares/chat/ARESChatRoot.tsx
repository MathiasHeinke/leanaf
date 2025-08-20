import { useMemo } from 'react';
import { ARESOrchestratorClient } from '../orchestrator/ARESOrchestratorClient';
import { useARESMessageStore } from '../state/ARESMessageStore';
import ARESMessageList from './ARESMessageList';
import ARESComposer from './ARESComposer';
import ARESDebugPanel from './ARESDebugPanel';

export default function ARESChatRoot({ userId }: { userId: string }) {
  const client = useMemo(() => new ARESOrchestratorClient(), []);
  const store = useARESMessageStore();

  return (
    <div className="flex h-full w-full flex-col">
      <ARESMessageList store={store} />
      <ARESComposer store={store} client={client} userId={userId} />
      <ARESDebugPanel lastTraceId={store.s.lastTraceId ?? null} />
    </div>
  );
}