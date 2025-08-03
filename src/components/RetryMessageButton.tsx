import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface RetryMessageButtonProps {
  messageId: string;
  onRetry: (messageId: string) => void;
  isRetrying?: boolean;
}

export const RetryMessageButton: React.FC<RetryMessageButtonProps> = ({
  messageId,
  onRetry,
  isRetrying = false
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onRetry(messageId)}
      disabled={isRetrying}
      className="mt-2 text-xs"
    >
      <RotateCcw className="w-3 h-3 mr-1" />
      {isRetrying ? 'Wiederholt...' : 'Wiederholen'}
    </Button>
  );
};