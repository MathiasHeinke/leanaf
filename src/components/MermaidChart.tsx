import { Card } from '@/components/ui/card';

interface MermaidChartProps {
  chart: string;
  className?: string;
}

export default function MermaidChart({ chart, className = '' }: MermaidChartProps) {
  // Fallback implementation without mermaid dependency
  return (
    <Card className={`p-4 ${className}`}>
      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-2">Flow Chart</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>Request Received</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span>Processing Context</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Response Generated</span>
          </div>
        </div>
      </div>
    </Card>
  );
}