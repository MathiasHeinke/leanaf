import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CoachPlan } from '@/types/coach-dashboard';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Dumbbell, 
  UtensilsCrossed, 
  Pill,
  Clock,
  CheckCircle,
  XCircle,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlansTabProps {
  plans: CoachPlan[];
}

const getPlanIcon = (type: string) => {
  switch (type) {
    case 'training':
      return <Dumbbell className="h-4 w-4" />;
    case 'nutrition':
      return <UtensilsCrossed className="h-4 w-4" />;
    case 'supplement':
      return <Pill className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'draft':
    default:
      return <Pause className="h-4 w-4 text-yellow-600" />;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'completed':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'cancelled':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'draft':
    default:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Aktiv';
    case 'completed':
      return 'Abgeschlossen';
    case 'cancelled':
      return 'Storniert';
    case 'draft':
    default:
      return 'Entwurf';
  }
};

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'training':
      return 'Trainingsplan';
    case 'nutrition':
      return 'Ernährungsplan';
    case 'supplement':
      return 'Supplementplan';
    default:
      return 'Plan';
  }
};

export const PlansTab: React.FC<PlansTabProps> = ({ plans }) => {
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  if (plans.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Keine Pläne gefunden</p>
          <p className="text-sm">In diesem Gespräch wurden noch keine Pläne erstellt</p>
        </div>
      </div>
    );
  }

  const toggleExpanded = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const downloadPlan = (plan: CoachPlan) => {
    const dataStr = JSON.stringify(plan.json_payload, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${getTypeLabel(plan.type)}_${format(new Date(plan.created_at), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Sort by created_at descending
  const sortedPlans = [...plans].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Calculate statistics
  const plansByType = plans.reduce((acc, plan) => {
    acc[plan.type] = (acc[plan.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const plansByStatus = plans.reduce((acc, plan) => {
    acc[plan.status] = (acc[plan.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full flex flex-col">
      {/* Statistics Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Plan-Typen</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(plansByType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {getPlanIcon(type)}
                  <span className="ml-1">{getTypeLabel(type)}: {count}</span>
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Status</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(plansByStatus).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-xs">
                  {getStatusIcon(status)}
                  <span className="ml-1">{getStatusLabel(status)}: {count}</span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Plans List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {sortedPlans.map((plan) => (
            <Card key={plan.id} className="shadow-sm">
              <Collapsible
                open={expandedPlans.has(plan.id)}
                onOpenChange={() => toggleExpanded(plan.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getPlanIcon(plan.type)}
                        {plan.title || getTypeLabel(plan.type)}
                      </CardTitle>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getStatusColor(plan.status))}
                        >
                          {getStatusIcon(plan.status)}
                          <span className="ml-1">{getStatusLabel(plan.status)}</span>
                        </Badge>
                        
                        {expandedPlans.has(plan.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Erstellt: {format(new Date(plan.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                      </div>
                      
                      {plan.updated_at !== plan.created_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Aktualisiert: {format(new Date(plan.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Plan Metadata */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Typ:</span>
                          <span className="ml-2">{getTypeLabel(plan.type)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Status:</span>
                          <span className="ml-2">{getStatusLabel(plan.status)}</span>
                        </div>
                      </div>

                      {/* JSON Preview */}
                      <div className="bg-muted/50 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-muted-foreground">Plan-Daten</div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadPlan(plan)}
                            className="h-6 px-2 text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        
                        <div className="max-h-60 overflow-auto">
                          <pre className="text-xs text-muted-foreground">
                            {JSON.stringify(plan.json_payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};