import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Calendar,
  MessageSquare,
  ArrowRight,
  Clock,
  User,
  X,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChatDay {
  date: string;
  coach_personality: string;
  message_count: number;
  last_message: string;
  last_message_time: string;
}

interface MemoryPacket {
  id: string;
  created_at: string;
  packet_summary: string;
  start_message_id: string;
  end_message_id: string;
}

interface ChatHistorySidebarProps {
  selectedCoach: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
  className?: string;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  selectedCoach,
  onSelectDate,
  onClose,
  className = ""
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [chatDays, setChatDays] = useState<ChatDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id && selectedCoach) {
      loadChatHistory();
    }
  }, [user?.id, selectedCoach]);

  const loadChatHistory = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('conversation_date, coach_personality, message_content, created_at')
        .eq('user_id', user.id)
        .eq('coach_personality', selectedCoach)
        .order('conversation_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by date and get last message for each day
      const groupedByDate = data?.reduce((acc: { [key: string]: ChatDay }, msg) => {
        const date = msg.conversation_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            coach_personality: msg.coach_personality,
            message_count: 0,
            last_message: msg.message_content,
            last_message_time: msg.created_at
          };
        }
        acc[date].message_count++;
        return acc;
      }, {}) || {};

      setChatDays(Object.values(groupedByDate));
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Heute';
    if (isYesterday(date)) return 'Gestern';
    return format(date, 'dd.MM.yyyy', { locale: de });
  };

  const formatTime = (timeString: string) => {
    return format(parseISO(timeString), 'HH:mm', { locale: de });
  };

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const historyContent = (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Lade Verlauf...
        </div>
      ) : chatDays.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Noch keine Chat-Verlauf</p>
          <p className="text-xs">Starte dein erstes Gespräch!</p>
        </div>
      ) : (
        chatDays.map((day) => (
          <Card 
            key={day.date}
            className="transition-all duration-200 hover:shadow-md cursor-pointer"
            onClick={() => {
              onSelectDate(day.date);
              if (isMobile) onClose();
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {formatDate(day.date)}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {day.message_count} Nachrichten
                </Badge>
              </div>
              
              <div className="flex items-start gap-2">
                <User className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {truncateMessage(day.last_message)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatTime(day.last_message_time)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-sm mx-auto h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Chat-Verlauf
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-4">
            <div className="py-4">
              {historyContent}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={`w-80 h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Chat-Verlauf
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4">
            {historyContent}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};