import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Download, Share2 } from 'lucide-react';
import type { TraceBundle } from '@/lib/traceTypes';

interface TraceReplayControlsProps {
  bundle: TraceBundle | null;
  onTimelineChange?: (stepIndex: number) => void;
  onExport?: () => void;
  onShare?: () => void;
}

export function TraceReplayControls({ 
  bundle, 
  onTimelineChange, 
  onExport, 
  onShare 
}: TraceReplayControlsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const maxSteps = bundle?.stages.length || 0;

  const handlePlay = () => {
    if (!bundle || currentStep >= maxSteps - 1) return;
    
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= maxSteps - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        onTimelineChange?.(next);
        return next;
      });
    }, 1000 / playbackSpeed);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    onTimelineChange?.(0);
  };

  if (!bundle) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Wähle eine Trace für Replay-Kontrollen
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">📼 Trace Replay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline Slider */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Schritt {currentStep + 1}</span>
            <span>von {maxSteps}</span>
          </div>
          <Slider
            value={[currentStep]}
            onValueChange={([value]) => {
              setCurrentStep(value);
              onTimelineChange?.(value);
            }}
            max={maxSteps - 1}
            step={1}
            className="w-full"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
              disabled={currentStep >= maxSteps - 1}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Speed Control */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Geschwindigkeit: {playbackSpeed}x
          </div>
          <Slider
            value={[playbackSpeed]}
            onValueChange={([value]) => setPlaybackSpeed(value)}
            min={0.5}
            max={3}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Current Stage Info */}
        {bundle.stages[currentStep] && (
          <div className="text-xs bg-muted/50 p-2 rounded">
            <div className="font-medium">
              {bundle.stages[currentStep].stage}
            </div>
            <div className="text-muted-foreground">
              {bundle.stages[currentStep].latency_ms}ms • {bundle.stages[currentStep].status}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}