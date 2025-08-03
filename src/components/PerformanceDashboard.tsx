// Performance dashboard for development
export function PerformanceDashboard() {
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border max-w-sm">
      <h3 className="font-semibold text-sm mb-2">🚀 System Status</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Real Streaming:</span>
          <span className="text-green-500">✅ Aktiv</span>
        </div>
        
        <div className="flex justify-between">
          <span>Context Builder:</span>
          <span className="text-green-500">✅ Fail-soft</span>
        </div>
        
        <div className="flex justify-between">
          <span>Memory Sync:</span>
          <span className="text-green-500">✅ Auto</span>
        </div>
        
        <div className="flex justify-between">
          <span>Error Recovery:</span>
          <span className="text-green-500">✅ 3-Layer</span>
        </div>
        
        <div className="flex justify-between">
          <span>Token Budget:</span>
          <span className="text-green-500">✅ 8k Cap</span>
        </div>
        
        <div className="flex justify-between">
          <span>Performance:</span>
          <span className="text-blue-500">📊 Monitoring</span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          Build: v2.0.0-streaming
        </div>
      </div>
    </div>
  );
}