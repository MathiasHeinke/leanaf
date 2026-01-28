/**
 * Conversation Analytics Dashboard
 * ARES Response Intelligence System - Admin Analytics
 * 
 * Visualisiert Topic-Verteilung, Expert-Level Users und Response-Längen-Trends
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { 
  RefreshCw, Shield, MessageSquare, Users, TrendingUp, 
  ArrowLeft, Brain 
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopicStats {
  topic: string;
  total_mentions: number;
  avg_chars: number;
  novice_users: number;
  intermediate_users: number;
  expert_users: number;
}

interface RawTopicRow {
  topic: string;
  mention_count: number;
  total_chars_exchanged: number;
  expert_level: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
];

export default function ConversationAnalytics() {
  const { isAdmin, loading: adminLoading } = useSecureAdminAccess('admin_panel');
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalMentions, setTotalMentions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin]);

  async function loadAnalytics() {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('user_topic_history')
        .select('topic, mention_count, total_chars_exchanged, expert_level');
      
      if (error) {
        console.error('Failed to load analytics:', error);
        setLoading(false);
        return;
      }

      // Aggregate by topic
      const byTopic = new Map<string, TopicStats>();
      const uniqueUsers = new Set<string>();
      let mentions = 0;
      
      for (const row of (data as RawTopicRow[]) || []) {
        const existing = byTopic.get(row.topic) || {
          topic: row.topic,
          total_mentions: 0,
          avg_chars: 0,
          novice_users: 0,
          intermediate_users: 0,
          expert_users: 0,
        };
        
        existing.total_mentions += row.mention_count;
        existing.avg_chars += row.total_chars_exchanged;
        mentions += row.mention_count;
        
        if (row.expert_level === 'expert') existing.expert_users++;
        else if (row.expert_level === 'intermediate') existing.intermediate_users++;
        else existing.novice_users++;
        
        byTopic.set(row.topic, existing);
      }

      // Calculate averages and format
      const stats = Array.from(byTopic.values()).map(s => ({
        ...s,
        avg_chars: s.total_mentions > 0 
          ? Math.round(s.avg_chars / s.total_mentions) 
          : 0,
      }));

      setTopicStats(stats.sort((a, b) => b.total_mentions - a.total_mentions));
      setTotalMentions(mentions);
      setTotalUsers(new Set((data || []).map((r: any) => r.user_id)).size || stats.reduce((acc, s) => acc + s.novice_users + s.intermediate_users + s.expert_users, 0));
    } catch (err) {
      console.error('Analytics error:', err);
    }
    
    setLoading(false);
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const expertCount = topicStats.reduce((acc, s) => acc + s.expert_users, 0);
  const intermediateCount = topicStats.reduce((acc, s) => acc + s.intermediate_users, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6" />
              Conversation Analytics
            </h1>
            <p className="text-muted-foreground">ARES Response Intelligence System</p>
          </div>
        </div>
        <Button onClick={loadAnalytics} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Topics erkannt</span>
            </div>
            <div className="text-3xl font-bold mt-2">{topicStats.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Erwähnungen</span>
            </div>
            <div className="text-3xl font-bold mt-2">{totalMentions.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Expert Users</span>
            </div>
            <div className="text-3xl font-bold mt-2">{expertCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-chart-3" />
              <span className="text-sm text-muted-foreground">Intermediate</span>
            </div>
            <div className="text-3xl font-bold mt-2">{intermediateCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Topic-Verteilung</CardTitle>
            <CardDescription>Anteil der Themen an allen Erwähnungen</CardDescription>
          </CardHeader>
          <CardContent>
            {topicStats.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Noch keine Daten vorhanden
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topicStats.slice(0, 8)}
                    dataKey="total_mentions"
                    nameKey="topic"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ topic, percent }) => 
                      `${topic} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {topicStats.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Erwähnungen']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Average Response Length Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ø Antwortlänge pro Topic</CardTitle>
            <CardDescription>Zeichen pro Antwort im Durchschnitt</CardDescription>
          </CardHeader>
          <CardContent>
            {topicStats.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Noch keine Daten vorhanden
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicStats.slice(0, 8)} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="topic" width={100} />
                  <Tooltip formatter={(value: number) => [`${value} Zeichen`, 'Ø Länge']} />
                  <Bar 
                    dataKey="avg_chars" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expert Level Distribution per Topic */}
      <Card>
        <CardHeader>
          <CardTitle>Expert-Level Verteilung pro Topic</CardTitle>
          <CardDescription>
            Wie viele User sind Novice, Intermediate oder Expert bei jedem Thema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topicStats.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Noch keine Topic-Daten vorhanden. Starte Gespräche mit ARES um Daten zu sammeln.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {topicStats.map(stat => (
                <div 
                  key={stat.topic} 
                  className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="font-medium capitalize text-lg">{stat.topic}</div>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {stat.total_mentions}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">Erwähnungen</div>
                  
                  <div className="flex gap-1 flex-wrap">
                    {stat.expert_users > 0 && (
                      <Badge variant="default" className="text-xs">
                        {stat.expert_users} Expert
                      </Badge>
                    )}
                    {stat.intermediate_users > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {stat.intermediate_users} Inter.
                      </Badge>
                    )}
                    {stat.novice_users > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {stat.novice_users} Novice
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
