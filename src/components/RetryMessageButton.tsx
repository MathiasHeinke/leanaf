import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RetryMessageButtonProps {
  onRetry: () => void;
  isRetrying?: boolean;
  disabled?: boolean;
}

export const RetryMessageButton = ({ 
  onRetry, 
  isRetrying = false, 
  disabled = false 
}: RetryMessageButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      disabled={disabled || isRetrying}
      className="h-6 px-2 text-xs"
    >
      <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
      {isRetrying ? 'Retrying...' : 'Retry'}
    </Button>
  );
};