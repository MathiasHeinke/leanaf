import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProactiveCoaching } from '@/hooks/useProactiveCoaching';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Zap } from 'lucide-react';

interface ProactiveCoachNotificationsProps {
  onMessageClick?: (message: string) => void;
}

export const ProactiveCoachNotifications = ({ onMessageClick }: ProactiveCoachNotificationsProps) => {
  const { user } = useAuth();
  const { lastMessage, isEnabled } = useProactiveCoaching();
  const [showNotification, setShowNotification] = useState(false);
  const [displayedMessage, setDisplayedMessage] = useState<any>(null);

  // Temporarily disabled - early return
  if (!isEnabled) {
    return null;
  }

  useEffect(() => {
    if (lastMessage && isEnabled) {
      setDisplayedMessage(lastMessage);
      setShowNotification(true);

      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [lastMessage, isEnabled]);

  if (!showNotification || !displayedMessage || !user?.id) {
    return null;
  }

  // ARES-only: always use Zap icon
  const getIcon = () => <Zap className="h-4 w-4" />;

  // ARES-only: always return ARES
  const getCoachName = () => 'ARES';

  const getBadgeVariant = () => {
    switch (displayedMessage.type) {
      case 'celebration':
        return 'default';
      case 'motivation':
        return 'secondary';
      case 'check_in':
        return 'outline';
      case 'support':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getBadgeVariant()} className="text-xs">
                  {getCoachName()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {displayedMessage.type}
                </Badge>
              </div>
              
              <p className="text-sm text-foreground leading-relaxed">
                {displayedMessage.message}
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    if (onMessageClick) {
                      onMessageClick(displayedMessage.message);
                    }
                    setShowNotification(false);
                  }}
                  className="text-xs h-7"
                >
                  Antworten
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNotification(false)}
                  className="text-xs h-7 ml-auto"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
