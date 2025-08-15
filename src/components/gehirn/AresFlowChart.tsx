import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TraceBundle, TraceStage } from '@/lib/traceTypes';
import { JsonPanel } from './JsonPanel';
import { X, Info, Brain } from 'lucide-react';

type FlowNode = Node & {
  data: {
    stage: TraceStage;
    isActive: boolean;
    status: 'pending' | 'running' | 'success' | 'error';
  };
};

type Props = {
  bundle: TraceBundle | null;
  isLive: boolean;
  onShowPrompt?: (traceId: string) => void;
};

const statusToColor = (status: 'pending' | 'running' | 'success' | 'error') => {
  switch (status) {
    case 'pending': return 'hsl(var(--muted))';
    case 'running': return 'hsl(43 74% 66%)'; // yellow
    case 'success': return 'hsl(120 70% 50%)'; // green  
    case 'error': return 'hsl(0 84% 60%)'; // red
  }
};

const statusToDotColor = (status: 'pending' | 'running' | 'success' | 'error') => {
  switch (status) {
    case 'pending': return '⚪';
    case 'running': return '🟡';
    case 'success': return '🟢';
    case 'error': return '🔴';
  }
};

const stageToTitle = (stage: string) => {
  const stageMap: Record<string, string> = {
    'received': '📨 Nachricht empfangen',
    'route_decision': '🧠 Intent & Route',
    'clarify_reply': '❓ Nachfrage',
    'tool_exec': '🛠️ Tool Ausführung',
    'tool_result': '📊 Tool Ergebnis',
    'fallback_llm_only': '🤖 LLM Fallback',
    'reply_send': '🚀 Antwort senden',
    'error': '❌ Fehler',
  };
  return stageMap[stage] || stage;
};

const FlowNodeComponent = React.memo(({ data, onShowPrompt, bundle }: { 
  data: FlowNode['data']; 
  onShowPrompt?: (traceId: string) => void;
  bundle?: TraceBundle | null;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="relative">
      <div 
        className="min-w-[200px] rounded-xl border-2 bg-background p-3 shadow-sm cursor-pointer"
        style={{ borderColor: statusToColor(data.status) }}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">{stageToTitle(data.stage.stage)}</div>
          <div className="flex items-center gap-1">
            {bundle?.hasPromptData && (data.stage.stage.includes('prompt') || data.stage.stage.includes('llm')) && onShowPrompt && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowPrompt(bundle.traceId);
                }}
                className="p-1 hover:bg-accent rounded text-blue-500"
                title="Show Prompt Analysis"
              >
                <Brain className="h-3 w-3" />
              </button>
            )}
            <div className="text-lg">{statusToDotColor(data.status)}</div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mb-1">
          Handler: {data.stage.handler || '—'}
        </div>
        
        {data.stage.latency_ms && (
          <div className="text-xs text-muted-foreground">
            {data.stage.latency_ms}ms
          </div>
        )}
        
        <div className="text-[10px] text-muted-foreground mt-1">
          {new Date(data.stage.at).toLocaleTimeString()}
        </div>
        
        {data.isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>
      
      {showDetails && (
        <div className="absolute top-full left-0 z-50 mt-2 w-96 max-w-[90vw] rounded-xl border bg-background p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="font-medium">Details: {stageToTitle(data.stage.stage)}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDetails(false); }}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Status & Timing</div>
              <div className="text-xs space-y-1">
                <div>Status: {data.stage.status}</div>
                <div>Latenz: {data.stage.latency_ms}ms</div>
                <div>Zeit: {new Date(data.stage.at).toLocaleString()}</div>
              </div>
            </div>
            
            {data.stage.row.payload_json && (
              <div>
                <div className="text-sm font-medium mb-1">Payload</div>
                <JsonPanel data={data.stage.row.payload_json} maxHeight={150} />
              </div>
            )}
            
            {data.stage.row.error_message && (
              <div>
                <div className="text-sm font-medium mb-1">Fehler</div>
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {data.stage.row.error_message}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

FlowNodeComponent.displayName = 'FlowNodeComponent';

const nodeTypes = {
  aresStage: (props: any) => <FlowNodeComponent {...props} onShowPrompt={props.data.onShowPrompt} bundle={props.data.bundle} />,
};

export function AresFlowChart({ bundle, isLive, onShowPrompt }: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!bundle || !bundle.stages.length) {
      return { nodes: [], edges: [] };
    }

    const stages = bundle.stages;
    const nodes: FlowNode[] = [];
    const edges: Edge[] = [];

    // Create nodes for each stage
    stages.forEach((stage, index) => {
      let status: 'pending' | 'running' | 'success' | 'error' = 'pending';
      
      if (stage.status === 'ERROR') {
        status = 'error';
      } else if (stage.status === 'RUNNING') {
        status = 'running';
      } else if (stage.status === 'OK') {
        status = 'success';
      }

      // Enhanced positioning with branching support
      const baseX = (index % 4) * 300;
      const baseY = Math.floor(index / 4) * 150;
      
      // Add branching offset for decision nodes
      let branchOffset = 0;
      if (stage.stage.includes('tool_picker') || stage.stage.includes('decision')) {
        branchOffset = Math.random() * 100 - 50; // Small random offset for branching
      }

      nodes.push({
        id: `stage-${index}`,
        type: 'aresStage',
        position: {
          x: baseX + branchOffset,
          y: baseY,
        },
        data: {
          stage,
          isActive: isLive && status === 'running',
          status,
          isDecisionNode: stage.stage.includes('tool_picker') || stage.stage.includes('decision'),
          branchCount: stage.stage.includes('tool_picker') ? 3 : 1,
          onShowPrompt,
          bundle,
        },
      });

      // Create edge to next stage
      if (index < stages.length - 1) {
        edges.push({
          id: `edge-${index}`,
          source: `stage-${index}`,
          target: `stage-${index + 1}`,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          style: {
            stroke: status === 'error' ? 'hsl(0 84% 60%)' : 'hsl(var(--border))',
            strokeWidth: 2,
          },
        });
      }
    });

    return { nodes, edges };
  }, [bundle, isLive]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes when bundle changes
  React.useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!bundle) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">🧠 ARES Gehirn</div>
          <div className="text-sm">Wähle eine Trace aus um den Message Flow zu sehen</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 border rounded-xl bg-background">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        style={{ background: 'hsl(var(--background))' }}
      >
        <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-2 border">
          <div className="text-sm font-medium">🧠 ARES Message Flow</div>
          <div className="text-xs text-muted-foreground">
            Trace: {bundle.traceId.slice(0, 8)}... • {bundle.stages.length} Schritte
          </div>
        </div>
        <Controls />
        <MiniMap 
          nodeStrokeColor={(n) => statusToColor((n.data?.status as 'pending' | 'running' | 'success' | 'error') || 'pending')}
          nodeColor={(n) => statusToColor((n.data?.status as 'pending' | 'running' | 'success' | 'error') || 'pending')}
          nodeBorderRadius={12}
        />
        <Background />
      </ReactFlow>
    </div>
  );
}