import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, AlertCircle, Pause, Calendar, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  estimated_completion: string | null;
  completion_percentage: number;
  version: string | null;
  created_at: string;
}

const statusLabels = {
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  completed: 'Abgeschlossen',
  on_hold: 'Pausiert'
};

const statusIcons = {
  planned: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle,
  on_hold: Pause
};

const statusColors = {
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200'
};

const priorityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
};

export default function Roadmap() {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchRoadmapItems = async () => {
    try {
      let query = supabase
        .from('roadmap_items')
        .select('*')
        .eq('is_public', true);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order('priority', { ascending: false })
                   .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setRoadmapItems(data || []);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      toast({
        title: 'Fehler',
        description: 'Roadmap konnte nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmapItems();
  }, [statusFilter]);

  const getStatusStats = () => {
    const stats = {
      total: roadmapItems.length,
      planned: roadmapItems.filter(item => item.status === 'planned').length,
      in_progress: roadmapItems.filter(item => item.status === 'in_progress').length,
      completed: roadmapItems.filter(item => item.status === 'completed').length,
      on_hold: roadmapItems.filter(item => item.status === 'on_hold').length
    };

    return stats;
  };

  const stats = getStatusStats();
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roadmap</h1>
          <p className="text-muted-foreground">
            Unsere Pläne für die Zukunft der App
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Features insgesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geplant</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
            <p className="text-xs text-muted-foreground mt-1">Noch zu entwickeln</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Arbeit</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
            <p className="text-xs text-muted-foreground mt-1">Aktuell entwickelt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abgeschlossen</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Fertiggestellt</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-3 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fertigstellung</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Gesamt-Fortschritt</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {roadmapItems.length} {roadmapItems.length === 1 ? 'Feature' : 'Features'} 
          {statusFilter !== 'all' && ` mit Status "${statusLabels[statusFilter as keyof typeof statusLabels]}"`}
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roadmapItems.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Keine Roadmap-Items gefunden.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          roadmapItems.map((item) => {
            const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Clock;
            
            return (
              <Card key={item.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <CardTitle className="text-lg leading-tight flex items-start gap-2">
                        <StatusIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{item.title}</span>
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge 
                          variant="outline" 
                          className={statusColors[item.status as keyof typeof statusColors]}
                        >
                          {statusLabels[item.status as keyof typeof statusLabels]}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={priorityColors[item.priority as keyof typeof priorityColors]}
                        >
                          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </Badge>
                        {item.version && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            v{item.version}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {item.estimated_completion && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground pt-2">
                      <Calendar className="h-4 w-4" />
                      <span>Ziel: {format(new Date(item.estimated_completion), 'MMM yyyy', { locale: de })}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{item.description}</p>
                  
                  {item.status === 'in_progress' && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Fortschritt</span>
                        <span className="font-bold text-yellow-700 dark:text-yellow-400">{item.completion_percentage}%</span>
                      </div>
                      <Progress value={item.completion_percentage} className="h-2" />
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Hinzugefügt {formatDistanceToNow(new Date(item.created_at), { 
                      addSuffix: true, 
                      locale: de 
                    })}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}