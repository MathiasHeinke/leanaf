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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Zap,
  Check,
  ChevronsUpDown,
  Building2,
  Target,
  Utensils,
  Dumbbell,
  Scale,
  Moon,
  Ruler,
  TrendingUp,
  LogIn
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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

  const getSelectedUserData = () => {
    return adminDebug.users.find(u => u.user_id === selectedUser);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    setUserDropdownOpen(false);
  };

  const grantEnterprise = async (userId: string, duration: string) => {
    await adminDebug.grantPremium(userId, duration, 'Enterprise');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enhanced Subscription Debug Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="status" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="users">Benutzer</TabsTrigger>
            <TabsTrigger value="database">Datenbank</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-1">
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
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={userDropdownOpen}
                          className="w-64 justify-between"
                        >
                          {selectedUser
                            ? adminDebug.users.find(u => u.user_id === selectedUser)?.display_name || adminDebug.users.find(u => u.user_id === selectedUser)?.email
                            : "Benutzer auswählen..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0">
                        <Command>
                          <CommandInput placeholder="Benutzer suchen..." />
                          <CommandEmpty>Kein Benutzer gefunden.</CommandEmpty>
                          <CommandGroup>
                            <CommandList>
                              {adminDebug.users.map((user) => (
                                <CommandItem
                                  key={user.user_id}
                                  value={user.email || user.user_id}
                                  onSelect={() => {
                                    handleUserSelect(user.user_id);
                                    setUserDropdownOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedUser === user.user_id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(user.subscribed)}
                                    <span>{user.display_name || user.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button onClick={adminDebug.fetchUsers} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Selected User Details */}
                {selectedUser && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Ausgewählter Benutzer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const userData = getSelectedUserData();
                        if (!userData) return null;
                        
                        const status = getSubscriptionStatus(userData);
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(userData.subscribed)}
                                  <span className="font-medium">
                                    {userData.display_name || 'Unbekannt'}
                                  </span>
                                  <Badge variant={status.color as any}>
                                    {status.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <div>Email: {userData.email || 'Nicht gesetzt'}</div>
                                  <div>ID: {userData.user_id}</div>
                                  {userData.subscription_end && (
                                    <div>Endet: {formatDate(userData.subscription_end)}</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Benutzerstatistiken */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <TrendingUp className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Punkte</span>
                                </div>
                                <div className="text-lg font-bold">{userData.total_points}</div>
                                <div className="text-xs text-muted-foreground">
                                  Level {userData.current_level} ({userData.level_name})
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Utensils className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium">Mahlzeiten</span>
                                </div>
                                <div className="text-lg font-bold">{userData.meals_count}</div>
                                <div className="text-xs text-muted-foreground">
                                  {userData.last_meal_date ? `Zuletzt: ${format(new Date(userData.last_meal_date), 'dd.MM.yy')}` : 'Keine'}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Dumbbell className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium">Workouts</span>
                                </div>
                                <div className="text-lg font-bold">{userData.workouts_count}</div>
                                <div className="text-xs text-muted-foreground">
                                  {userData.last_workout_date ? `Zuletzt: ${format(new Date(userData.last_workout_date), 'dd.MM.yy')}` : 'Keine'}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Scale className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-medium">Gewicht</span>
                                </div>
                                <div className="text-lg font-bold">{userData.weight_entries_count}</div>
                                <div className="text-xs text-muted-foreground">
                                  {userData.last_weight_date ? `Zuletzt: ${format(new Date(userData.last_weight_date), 'dd.MM.yy')}` : 'Keine'}
                                </div>
                              </div>
                            </div>

                            {/* Weitere Statistiken */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="flex items-center gap-2 p-3 border rounded-lg">
                                <Moon className="h-4 w-4 text-indigo-600" />
                                <div>
                                  <div className="font-medium text-sm">Schlaf</div>
                                  <div className="text-xs text-muted-foreground">{userData.sleep_entries_count} Einträge</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-3 border rounded-lg">
                                <Ruler className="h-4 w-4 text-orange-600" />
                                <div>
                                  <div className="font-medium text-sm">Messungen</div>
                                  <div className="text-xs text-muted-foreground">{userData.body_measurements_count} Einträge</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-3 border rounded-lg">
                                <LogIn className="h-4 w-4 text-gray-600" />
                                <div>
                                  <div className="font-medium text-sm">Letzte Aktivität</div>
                                  <div className="text-xs text-muted-foreground">
                                    {userData.last_login_approximate ? format(new Date(userData.last_login_approximate), 'dd.MM.yy HH:mm') : 'Nie'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Trial Status falls vorhanden */}
                            {userData.has_active_trial && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-blue-900">Aktiver Trial</span>
                                  <Badge variant="outline" className="text-blue-700">
                                    {userData.trial_type || 'Premium'}
                                  </Badge>
                                </div>
                                <div className="text-sm text-blue-700">
                                  {userData.trial_expires_at ? `Läuft ab: ${formatDate(userData.trial_expires_at)}` : 'Kein Ablaufdatum'}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2">
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
                                  onClick={() => adminDebug.grantPremium(selectedUser, selectedDuration)}
                                  size="sm"
                                  variant="default"
                                >
                                  <Crown className="h-4 w-4 mr-2" />
                                  Premium
                                </Button>
                                <Button
                                  onClick={() => grantEnterprise(selectedUser, selectedDuration)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Enterprise
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => adminDebug.revokePremium(selectedUser)}
                                  size="sm"
                                  variant="destructive"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Widerrufen
                                </Button>
                                <Button
                                  onClick={() => adminDebug.switchToUser(selectedUser)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Wechseln
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* All Users List */}
                <div className="border rounded-lg">
                  <div className="p-4">
                    <h4 className="font-medium mb-4">Alle Benutzer ({adminDebug.users.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {adminDebug.users.map((userData) => {
                        const status = getSubscriptionStatus(userData);
                        return (
                          <div
                            key={userData.user_id}
                            className={cn(
                              "flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                              selectedUser === userData.user_id && "bg-muted border-primary"
                            )}
                            onClick={() => handleUserSelect(userData.user_id)}
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon(userData.subscribed)}
                              <div>
                                <div className="font-medium text-sm">
                                  {userData.display_name || userData.email || 'Unbekannt'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {userData.user_id}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={status.color as any} className="text-xs">
                                {status.status}
                              </Badge>
                              {userData.has_active_trial && (
                                <Badge variant="outline" className="text-xs">
                                  Trial
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-1">
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
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Admin Aktionen</h3>
                  <Button onClick={adminDebug.fetchAdminLogs} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {adminDebug.adminLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Keine Admin-Logs gefunden.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {adminDebug.adminLogs.map((log, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="text-xs">
                              {log.action_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <div><strong>Admin:</strong> {log.admin_user_id}</div>
                            {log.target_user_id && (
                              <div><strong>Target User:</strong> {log.target_user_id}</div>
                            )}
                            {log.action_details && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <pre>{JSON.stringify(log.action_details, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-1">
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
                        onClick={() => subscription.refreshSubscription(true)}
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
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};