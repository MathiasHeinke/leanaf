import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, HeartOff, Search, Filter, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  vote_count: number;
  created_at: string;
  user_votes?: { user_id: string }[];
}

const categoryLabels = {
  ui_ux: 'UI/UX',
  functionality: 'Funktionalität',
  performance: 'Performance',
  integration: 'Integration',
  content: 'Content',
  other: 'Sonstiges'
};

const statusLabels = {
  pending: 'Ausstehend',
  under_review: 'In Prüfung',
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  completed: 'Abgeschlossen',
  rejected: 'Abgelehnt'
};

const priorityLabels = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  critical: 'Kritisch'
};

const statusIcons = {
  pending: Clock,
  under_review: Search,
  planned: TrendingUp,
  in_progress: AlertCircle,
  completed: CheckCircle,
  rejected: HeartOff
};

export function FeatureRequestList() {
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('votes');
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchFeatures = async () => {
    try {
      let query = supabase
        .from('feature_requests')
        .select(`
          *,
          user_votes:feature_votes(user_id)
        `);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Sort by votes (desc), created_at (desc), or status
      if (sortBy === 'votes') {
        query = query.order('vote_count', { ascending: false });
      } else if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast({
        title: 'Fehler',
        description: 'Features konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [statusFilter, categoryFilter, searchTerm, sortBy]);

  const handleVote = async (featureId: string, hasVoted: boolean) => {
    if (!user) {
      toast({
        title: 'Anmeldung erforderlich',
        description: 'Du musst angemeldet sein, um zu voten.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('feature_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('feature_request_id', featureId);

        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from('feature_votes')
          .insert({
            user_id: user.id,
            feature_request_id: featureId
          });

        if (error) throw error;
      }

      // Refresh data
      fetchFeatures();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Fehler',
        description: 'Vote konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'planned': return 'bg-purple-500';
      case 'under_review': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Suche Features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Sortierung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="votes">Meiste Votes</SelectItem>
            <SelectItem value="newest">Neueste</SelectItem>
            <SelectItem value="oldest">Älteste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feature List */}
      <div className="space-y-4">
        {features.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Keine Features gefunden.</p>
            </CardContent>
          </Card>
        ) : (
          features.map((feature) => {
            const hasVoted = user && feature.user_votes?.some(vote => vote.user_id === user.id);
            const StatusIcon = statusIcons[feature.status as keyof typeof statusIcons] || Clock;

            return (
              <Card key={feature.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={`${getStatusColor(feature.status)} text-white border-0`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusLabels[feature.status as keyof typeof statusLabels]}
                        </Badge>
                        <Badge variant="outline">
                          {categoryLabels[feature.category as keyof typeof categoryLabels]}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(feature.priority)}>
                          {priorityLabels[feature.priority as keyof typeof priorityLabels]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={hasVoted ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVote(feature.id, !!hasVoted)}
                        className="flex items-center gap-1"
                      >
                        {hasVoted ? <Heart className="h-4 w-4 fill-current" /> : <HeartOff className="h-4 w-4" />}
                        {feature.vote_count}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{feature.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Eingereicht {formatDistanceToNow(new Date(feature.created_at), { 
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