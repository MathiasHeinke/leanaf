import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminDebug } from '@/hooks/useAdminDebug';
import { useAuth } from '@/hooks/useAuth';
import { 
  Settings, 
  Users, 
  Activity, 
  Database, 
  Crown, 
  UserX, 
  Calendar,
  Search,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface EnhancedSubscriptionDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnhancedSubscriptionDebugPanel: React.FC<EnhancedSubscriptionDebugPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const subscription = useSubscription();
  const adminDebug = useAdminDebug();
  const [selectedDuration, setSelectedDuration] = useState('1month');

  const getStatusIcon = (subscribed: boolean | null) => {
    if (subscribed) return <Crown className="h-4 w-4 text-warning" />;
    return <UserX className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nicht gesetzt';
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  const getSubscriptionStatus = (user: any) => {
    if (!user.subscribed) return { status: 'Free', color: 'secondary' };
    if (user.subscription_end && new Date(user.subscription_end) < new Date()) {
      return { status: 'Abgelaufen', color: 'destructive' };
    }
    return { status: user.subscription_tier || 'Premium', color: 'default' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enhanced Subscription Debug Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="status" className="h-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="users">Benutzer</TabsTrigger>
            <TabsTrigger value="database">Datenbank</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Frontend Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Frontend Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Premium Status:</span>
                    <Badge variant={subscription.isPremium ? "default" : "secondary"}>
                      {subscription.isPremium ? 'Premium' : 'Free'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Subscription Tier:</span>
                    <span>{subscription.subscriptionTier || 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Debug Mode:</span>
                    <Badge variant={subscription.isInDebugMode() ? "destructive" : "outline"}>
                      {subscription.isInDebugMode() ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Loading:</span>
                    <span>{subscription.loading ? 'Ja' : 'Nein'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Trial Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Trial Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Active Trial:</span>
                    <Badge variant={subscription.trial?.hasActiveTrial ? "default" : "outline"}>
                      {subscription.trial?.hasActiveTrial ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                  {subscription.trial?.hasActiveTrial && (
                    <>
                      <div className="flex justify-between">
                        <span>Ends At:</span>
                        <span>{subscription.trial?.trialExpiry ? formatDate(subscription.trial.trialExpiry.toISOString()) : 'Nicht gesetzt'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Days Left:</span>
                        <span>{subscription.trial?.trialDaysLeft || 'Unbekannt'}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Current User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>User ID:</strong> {user?.id}
                  </div>
                  <div>
                    <strong>Email:</strong> {user?.email}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Suche nach Name, Email oder ID..."
                  value={adminDebug.searchTerm}
                  onChange={(e) => adminDebug.setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Button onClick={adminDebug.fetchUsers} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Alle Benutzer ({adminDebug.users.length})</CardTitle>
                <CardDescription>
                  Verwalte Subscriptions und Account-Zugriffe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {adminDebug.users.map((user) => {
                      const status = getSubscriptionStatus(user);
                      return (
                        <div key={user.user_id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(user.subscribed)}
                                <span className="font-medium">
                                  {user.display_name || 'Unbekannt'}
                                </span>
                                <Badge variant={status.color as any}>
                                  {status.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <div>Email: {user.email || 'Nicht gesetzt'}</div>
                                <div>ID: {user.user_id}</div>
                                {user.subscription_end && (
                                  <div>Endet: {formatDate(user.subscription_end)}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <Select
                                  value={selectedDuration}
                                  onValueChange={setSelectedDuration}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1week">1 Woche</SelectItem>
                                    <SelectItem value="1month">1 Monat</SelectItem>
                                    <SelectItem value="3months">3 Monate</SelectItem>
                                    <SelectItem value="6months">6 Monate</SelectItem>
                                    <SelectItem value="12months">12 Monate</SelectItem>
                                    <SelectItem value="permanent">Permanent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  onClick={() => adminDebug.grantPremium(user.user_id, selectedDuration)}
                                  size="sm"
                                  variant="default"
                                >
                                  <Crown className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => adminDebug.revokePremium(user.user_id)}
                                  size="sm"
                                  variant="destructive"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => adminDebug.switchToUser(user.user_id)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Direkte Datenbank-Kontrolle
                </CardTitle>
                <CardDescription>
                  Verwalte Subscriptions direkt in der Datenbank
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => subscription.createDebugSubscription?.()}
                    variant="default"
                  >
                    Debug Premium Erstellen
                  </Button>
                  <Button
                    onClick={() => subscription.createDebugSubscription?.()}
                    variant="outline"
                  >
                    Debug Basic Erstellen
                  </Button>
                  <Button
                    onClick={() => subscription.clearDebugSubscription?.()}
                    variant="destructive"
                  >
                    Debug Subscription Löschen
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => subscription.setDebugTier('Premium')}
                    variant="default"
                  >
                    Debug: Premium Setzen
                  </Button>
                  <Button
                    onClick={() => subscription.setDebugTier('Basic')}
                    variant="outline"
                  >
                    Debug: Basic Setzen
                  </Button>
                </div>

                <Button
                  onClick={subscription.clearDebugMode}
                  variant="secondary"
                  className="w-full"
                >
                  Debug Mode Zurücksetzen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Admin Aktionen</h3>
              <Button onClick={adminDebug.fetchAdminLogs} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <div className="p-4 space-y-3">
                    {adminDebug.adminLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              <span className="font-medium">{log.action_type}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatDate(log.created_at)}
                            </div>
                          </div>
                          <Badge variant="outline">{log.target_user_id?.slice(0, 8)}...</Badge>
                        </div>
                        {Object.keys(log.action_details).length > 0 && (
                          <pre className="text-xs mt-2 bg-muted p-2 rounded">
                            {JSON.stringify(log.action_details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Debug Controls
                </CardTitle>
                <CardDescription>
                  Entwickler-Tools für Subscription-Testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={subscription.refreshSubscription}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Subscription Neu Laden
                  </Button>
                  <Button
                    onClick={() => subscription.startPremiumTrial()}
                    variant="default"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Premium Trial Starten
                  </Button>
                </div>

                <Separator />

                <div className="text-sm">
                  <h4 className="font-medium mb-2">Keyboard Shortcuts:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Ctrl + Shift + S: Debug Panel öffnen/schließen</li>
                    <li>Ctrl + Shift + R: Subscription refreshen</li>
                    <li>Ctrl + Shift + D: Debug Mode togglen</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};