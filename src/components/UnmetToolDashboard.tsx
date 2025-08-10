import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  TrendingUp,
  Settings,
  RefreshCw
} from "lucide-react";
import { useUnmetToolTracking } from "@/hooks/useUnmetToolTracking";
import { format } from "date-fns";

export const UnmetToolDashboard: React.FC = () => {
  const {
    events,
    loading,
    stats,
    topMissingTools,
    averageConfidence,
    updateEventStatus,
    refresh
  } = useUnmetToolTracking();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'triaged': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_progress': return <Settings className="h-4 w-4 text-purple-500" />;
      case 'shipped': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-orange-100 text-orange-800';
      case 'triaged': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unmet Tool Dashboard</h1>
          <p className="text-muted-foreground">
            Track feature requests and tool gaps from user interactions
          </p>
        </div>
        <Button 
          onClick={refresh}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.new}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Settings className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.shipped}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Missing Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Missing Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topMissingTools.slice(0, 5).map(({ tool, count }) => (
              <div key={tool} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{tool}</span>
                  <Badge variant="secondary">{count} requests</Badge>
                </div>
                <Progress 
                  value={(count / Math.max(...topMissingTools.map(t => t.count))) * 100}
                  className="w-24"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Average Confidence */}
      <Card>
        <CardHeader>
          <CardTitle>Intent Detection Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Average Confidence Score</span>
              <span className="font-bold">{(averageConfidence * 100).toFixed(1)}%</span>
            </div>
            <Progress value={averageConfidence * 100} />
            <p className="text-sm text-muted-foreground">
              Higher confidence indicates better intent detection accuracy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Unmet Tool Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(event.status)}
                    <Badge className={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                    {event.suggested_tool && (
                      <Badge variant="outline">{event.suggested_tool}</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(event.created_at), 'MMM dd, HH:mm')}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">{event.message}</p>
                  {event.manual_summary && (
                    <p className="text-sm text-muted-foreground italic">
                      Manual response: {event.manual_summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Intent: {event.intent_guess}</span>
                    {event.confidence && (
                      <span>Confidence: {(event.confidence * 100).toFixed(1)}%</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {event.status === 'new' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEventStatus(event.id, 'triaged')}
                    >
                      Triage
                    </Button>
                  )}
                  {event.status === 'triaged' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEventStatus(event.id, 'in_progress')}
                    >
                      Start Work
                    </Button>
                  )}
                  {event.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEventStatus(event.id, 'shipped')}
                    >
                      Mark Shipped
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};