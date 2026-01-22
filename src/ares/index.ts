// ARES Barrel Exports - Phase 4 Consolidation

// Chat Components
export { default as ARESChatRoot } from './chat/ARESChatRoot';
export { default as ARESMessageList } from './chat/ARESMessageList';
export { default as ARESComposer } from './chat/ARESComposer';

// Orchestrator & Client
export { ARESOrchestratorClient } from './orchestrator/ARESOrchestratorClient';
export type { ARESEvent, ARESContext, ARESReply } from './orchestrator/ARESPayload';

// State Management
export { useARESMessageStore } from './state/ARESMessageStore';

// Tracing & Telemetry
export { ARESClientTrace } from './trace/ARESClientTrace';
export { ARES_EMIT } from './trace/traceEmitter';
export { useComponentTrace, useActionTrace } from './trace/withTrace';

// Feature Flags
export { useAresFlags } from './flags/useAresFlags';

// Utilities
export { logOnce } from './util/ARESLogger';
