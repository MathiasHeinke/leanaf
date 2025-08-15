import React from 'react';
import { Button } from '@/components/ui/button';
import { Bug, X } from 'lucide-react';
import { useDebug } from '@/contexts/DebugContext';
import { DataDebugOverlay } from './DataDebugOverlay';

export function DebugFloatingButton() {
  const { isDebugMode, isOverlayVisible, setIsOverlayVisible } = useDebug();

  // Only show if debug mode is enabled
  if (!isDebugMode) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOverlayVisible(!isOverlayVisible)}
        className={`fixed bottom-4 right-4 z-40 shadow-lg ${
          isOverlayVisible ? 'bg-destructive text-destructive-foreground' : 'bg-background'
        }`}
      >
        {isOverlayVisible ? (
          <X className="h-4 w-4" />
        ) : (
          <Bug className="h-4 w-4" />
        )}
        Debug
      </Button>

      <DataDebugOverlay
        isVisible={isOverlayVisible}
        onClose={() => setIsOverlayVisible(false)}
      />
    </>
  );
}