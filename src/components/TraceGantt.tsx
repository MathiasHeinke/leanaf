import { useMemo } from 'react';

interface TraceEvent {
  id: number;
  trace_id: string;
  ts: string;
  stage: string;
  data: any;
}

interface TraceGanttProps {
  events: TraceEvent[];
  className?: string;
}

export default function TraceGantt({ events, className = "" }: TraceGanttProps) {
  const ganttData = useMemo(() => {
    if (events.length === 0) return [];

    const stages = [
      { name: 'Context', stages: ['A_received', 'B_context_ready'], color: 'hsl(var(--primary))' },
      { name: 'RAG', stages: ['C_rag_search'], color: 'hsl(var(--warning))' },
      { name: 'OpenAI', stages: ['C_openai_call', 'D_delta'], color: 'hsl(var(--accent))' },
      { name: 'Stream', stages: ['F_streaming_done', 'F_response_ready'], color: 'hsl(var(--success))' },
      { name: 'Memory', stages: ['G_complete'], color: 'hsl(var(--muted))' }
    ];

    const startTime = new Date(events[0].ts).getTime();
    const endTime = new Date(events[events.length - 1].ts).getTime();
    const totalDuration = endTime - startTime || 1;

    return stages.map(stage => {
      const stageEvents = events.filter(e => stage.stages.includes(e.stage));
      if (stageEvents.length === 0) return null;

      const stageStart = new Date(stageEvents[0].ts).getTime();
      const stageEnd = new Date(stageEvents[stageEvents.length - 1].ts).getTime();
      const duration = stageEnd - stageStart;
      
      const startPercent = ((stageStart - startTime) / totalDuration) * 100;
      const widthPercent = Math.max((duration / totalDuration) * 100, 2); // Min 2% width

      // Color based on duration
      let color = stage.color;
      if (duration > 3000) color = 'hsl(var(--destructive))'; // Red >3s
      else if (duration > 1000) color = 'hsl(var(--warning))'; // Yellow >1s

      return {
        name: stage.name,
        startPercent,
        widthPercent,
        duration,
        color,
        events: stageEvents.length
      };
    }).filter(Boolean);
  }, [events]);

  if (events.length === 0) {
    return <div className="text-muted-foreground text-center py-4">No trace data available</div>;
  }

  const totalDuration = new Date(events[events.length - 1].ts).getTime() - new Date(events[0].ts).getTime();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Total Duration: {totalDuration}ms</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-success rounded"></div>
            &lt;1s
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-warning rounded"></div>
            &lt;3s
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-destructive rounded"></div>
            &gt;3s
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {ganttData.map((stage, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-16 text-sm font-medium text-right">{stage.name}</div>
            <div className="flex-1 relative bg-muted rounded h-6">
              <div
                className="absolute top-0 h-full rounded flex items-center justify-center text-xs font-medium text-white"
                style={{
                  left: `${stage.startPercent}%`,
                  width: `${stage.widthPercent}%`,
                  backgroundColor: stage.color,
                  minWidth: '20px'
                }}
                title={`${stage.duration}ms (${stage.events} events)`}
              >
                {stage.duration > 100 && `${stage.duration}ms`}
              </div>
            </div>
            <div className="w-16 text-sm text-muted-foreground">
              {stage.duration}ms
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-3">
        <div className="w-16"></div>
        <div className="flex-1 relative">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0ms</span>
            <span>{Math.round(totalDuration / 2)}ms</span>
            <span>{totalDuration}ms</span>
          </div>
        </div>
        <div className="w-16"></div>
      </div>
    </div>
  );
}