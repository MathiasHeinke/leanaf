import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface MessageStatusBadgeProps {
  status?: 'sending' | 'sent' | 'failed';
  className?: string;
}

export const MessageStatusBadge = ({ status, className }: MessageStatusBadgeProps) => {
  if (!status) return null;

  const statusConfig = {
    sending: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      text: 'Sending...',
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    },
    sent: {
      icon: <CheckCircle className="w-3 h-3" />,
      text: 'Sent',
      variant: 'secondary' as const,
      className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    },
    failed: {
      icon: <XCircle className="w-3 h-3" />,
      text: 'Failed',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    }
  };

  const config = statusConfig[status];

  return (
    <Badge 
      variant={config.variant}
      className={`flex items-center gap-1 text-xs ${config.className} ${className || ''}`}
    >
      {config.icon}
      {config.text}
    </Badge>
  );
};