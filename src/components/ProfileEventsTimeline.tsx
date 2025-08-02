import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, ChevronUp, Clock, User, Target, Activity, AlertTriangle } from 'lucide-react';

interface ProfileEvent {
  id: number | string;
  created_at: string;
  profile_delta: any;
  event_type?: string;
}

interface ProfileEventsTimelineProps {
  className?: string;
  maxEvents?: number;
}

export const ProfileEventsTimeline: React.FC<ProfileEventsTimelineProps> = ({
  className = '',
  maxEvents = 10
}) => {
  const [events, setEvents] = useState<ProfileEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('user_profile_events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(maxEvents);

        if (error) throw error;
        
        console.log('📚 Profile events loaded:', data?.length || 0);
        setEvents((data || []).map(event => ({ ...event, id: String(event.id) })));
      } catch (err) {
        console.error('Error fetching profile events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user?.id, maxEvents]);

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const formatEventIcon = (event: ProfileEvent) => {
    const delta = event.profile_delta;
    
    if (delta.experienceYears !== undefined) return <Activity className="h-4 w-4" />;
    if (delta.goal !== undefined) return <Target className="h-4 w-4" />;
    if (delta.injuries !== undefined) return <AlertTriangle className="h-4 w-4" />;
    if (delta.availableMinutes !== undefined) return <Clock className="h-4 w-4" />;
    
    return <User className="h-4 w-4" />;
  };

  const formatEventTitle = (event: ProfileEvent) => {
    const delta = event.profile_delta;
    const changes: string[] = [];
    
    if (delta.experienceYears !== undefined) changes.push('Trainingserfahrung');
    if (delta.availableMinutes !== undefined) changes.push('Verfügbare Zeit');
    if (delta.weeklySessions !== undefined) changes.push('Wöchentliche Sessions');
    if (delta.goal !== undefined) changes.push('Trainingsziel');
    if (delta.injuries !== undefined) changes.push('Verletzungen');
    if (delta.preferences !== undefined) changes.push('Präferenzen');
    
    if (changes.length === 0) return 'Profil aktualisiert';
    if (changes.length === 1) return `${changes[0]} aktualisiert`;
    if (changes.length <= 3) return `${changes.join(', ')} aktualisiert`;
    
    return `${changes.length} Felder aktualisiert`;
  };

  const formatEventDetails = (event: ProfileEvent) => {
    const delta = event.profile_delta;
    const details: string[] = [];
    
    if (delta.experienceYears !== undefined) {
      details.push(`Erfahrung: ${delta.experienceYears} Jahre`);
    }
    if (delta.availableMinutes !== undefined) {
      details.push(`Zeit: ${delta.availableMinutes} min`);
    }
    if (delta.weeklySessions !== undefined) {
      details.push(`Sessions: ${delta.weeklySessions}×/Woche`);
    }
    if (delta.goal !== undefined) {
      const goalLabels = {
        hypertrophy: 'Muskelaufbau',
        strength: 'Kraftaufbau', 
        endurance: 'Ausdauer',
        general: 'Allgemeine Fitness'
      };
      details.push(`Ziel: ${goalLabels[delta.goal as keyof typeof goalLabels] || delta.goal}`);
    }
    if (delta.injuries && Array.isArray(delta.injuries)) {
      if (delta.injuries.length > 0) {
        details.push(`Verletzungen: ${delta.injuries.join(', ')}`);
      } else {
        details.push('Keine Verletzungen');
      }
    }
    
    return details;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    if (diffHours > 0) return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
    if (diffMinutes > 0) return `vor ${diffMinutes} Minute${diffMinutes > 1 ? 'n' : ''}`;
    
    return 'gerade eben';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Profil-Verlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Fehler beim Laden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Profil-Verlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Noch keine Profil-Änderungen vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Profil-Verlauf
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Deine letzten {events.length} Profil-Updates
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {events.map((event, index) => {
              const isExpanded = expandedEvents.has(event.id);
              const eventDetails = formatEventDetails(event);
              
              return (
                <div key={event.id} className="relative">
                  {/* Timeline line */}
                  {index < events.length - 1 && (
                    <div className="absolute left-4 top-8 w-px h-full bg-border" />
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {formatEventIcon(event)}
                    </div>
                    
                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(event.id)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                            <div className="text-left">
                              <h4 className="font-medium text-sm">{formatEventTitle(event)}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(event.created_at)}
                              </p>
                            </div>
                            {eventDetails.length > 0 && (
                              isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        
                        {eventDetails.length > 0 && (
                          <CollapsibleContent className="mt-2">
                            <div className="bg-muted/50 rounded-md p-3">
                              <div className="space-y-1">
                                {eventDetails.map((detail, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">
                                    • {detail}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        )}
                      </Collapsible>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};