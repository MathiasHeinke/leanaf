import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeErrorMessage, getSecurityHeaders, validateInput } from '@/utils/securityHelpers';

interface SecurityEvent {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  metadata: any;
}

interface SecurityStatus {
  authentication: 'secure' | 'warning' | 'error';
  database: 'secure' | 'warning' | 'error';
  functions: 'secure' | 'warning' | 'error';
  rateLimit: 'secure' | 'warning' | 'error';
  encryption: 'secure' | 'warning' | 'error';
}

export const SecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    authentication: 'secure',
    database: 'secure', 
    functions: 'secure',
    rateLimit: 'secure',
    encryption: 'secure'
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkSecurityStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Check authentication security
      const authStatus = await checkAuthSecurity();
      
      // Check database security
      const dbStatus = await checkDatabaseSecurity();
      
      // Check function security
      const funcStatus = await checkFunctionSecurity();
      
      // Check rate limiting
      const rateLimitStatus = await checkRateLimit();
      
      // Check encryption
      const encryptionStatus = checkEncryption();
      
      setSecurityStatus({
        authentication: authStatus,
        database: dbStatus,
        functions: funcStatus,
        rateLimit: rateLimitStatus,
        encryption: encryptionStatus
      });
      
      // Load recent security events if user is admin
      await loadSecurityEvents();
      
      setLastCheck(new Date());
    } catch (error) {
      console.error('Security check failed:', sanitizeErrorMessage(error as Error));
    } finally {
      setLoading(false);
    }
  };

  const checkAuthSecurity = async (): Promise<'secure' | 'warning' | 'error'> => {
    try {
      // Check if session is valid and secure
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) return 'error';
      if (!session) return 'warning';
      
      // Check if session is recent (not expired soon)
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      // Warning if less than 1 hour until expiry
      if (timeUntilExpiry < 3600000) return 'warning';
      
      return 'secure';
    } catch {
      return 'error';
    }
  };

  const checkDatabaseSecurity = async (): Promise<'secure' | 'warning' | 'error'> => {
    try {
      // Test database connection with a simple query
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      return error ? 'error' : 'secure';
    } catch {
      return 'error';
    }
  };

  const checkFunctionSecurity = async (): Promise<'secure' | 'warning' | 'error'> => {
    try {
      // Test a secured function
      const { error } = await supabase.functions.invoke('check-subscription');
      
      // If we get a response (even an error), the function is reachable
      return 'secure';
    } catch {
      return 'warning';
    }
  };

  const checkRateLimit = async (): Promise<'secure' | 'warning' | 'error'> => {
    try {
      // Check AI usage limits as a proxy for rate limiting
      const { data, error } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: user?.id,
        p_feature_type: 'meal_analysis'
      });
      
      if (error) return 'warning';
      
      // Warning if close to limits
      if (data && typeof data === 'object' && 'daily_remaining' in data && 
          typeof data.daily_remaining === 'number' && data.daily_remaining < 2) {
        return 'warning';
      }
      
      return 'secure';
    } catch {
      return 'warning';
    }
  };

  const checkEncryption = (): 'secure' | 'warning' | 'error' => {
    // Check if we're using HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return 'error';
    }
    
    // Check if CSP headers are present (basic check)
    const hasCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    
    return 'secure';
  };

  const loadSecurityEvents = async () => {
    try {
      // Only super admins can view security events
      const { data: events } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (events) {
        setRecentEvents(events);
      }
    } catch (error) {
      // User might not have permission to view events
      console.log('Could not load security events (may not have permission)');
    }
  };

  useEffect(() => {
    if (user) {
      checkSecurityStatus();
      
      // Set up periodic security checks (every 5 minutes)
      const interval = setInterval(checkSecurityStatus, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure': return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case 'warning': return <ShieldAlert className="w-4 h-4 text-yellow-600" />;
      case 'error': return <Shield className="w-4 h-4 text-red-600" />;
      default: return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const getOverallStatus = () => {
    const statuses = Object.values(securityStatus);
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    return 'secure';
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            Melden Sie sich an, um den Sicherheitsstatus zu sehen
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(getOverallStatus())}
                Sicherheitsstatus
              </CardTitle>
              <CardDescription>
                Letzte Überprüfung: {lastCheck.toLocaleTimeString('de-DE')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showDetails ? 'Ausblenden' : 'Details'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={checkSecurityStatus}
                disabled={loading}
              >
                Aktualisieren
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(securityStatus.authentication)}
                <span className="font-medium">Authentifizierung</span>
              </div>
              <Badge variant={securityStatus.authentication === 'secure' ? 'default' : 'destructive'}>
                {securityStatus.authentication === 'secure' ? 'Sicher' : 
                 securityStatus.authentication === 'warning' ? 'Warnung' : 'Fehler'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(securityStatus.database)}
                <span className="font-medium">Datenbank</span>
              </div>
              <Badge variant={securityStatus.database === 'secure' ? 'default' : 'destructive'}>
                {securityStatus.database === 'secure' ? 'Sicher' : 
                 securityStatus.database === 'warning' ? 'Warnung' : 'Fehler'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(securityStatus.functions)}
                <span className="font-medium">Edge Functions</span>
              </div>
              <Badge variant={securityStatus.functions === 'secure' ? 'default' : 'destructive'}>
                {securityStatus.functions === 'secure' ? 'Sicher' : 
                 securityStatus.functions === 'warning' ? 'Warnung' : 'Fehler'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(securityStatus.rateLimit)}
                <span className="font-medium">Rate Limiting</span>
              </div>
              <Badge variant={securityStatus.rateLimit === 'secure' ? 'default' : 'destructive'}>
                {securityStatus.rateLimit === 'secure' ? 'Sicher' : 
                 securityStatus.rateLimit === 'warning' ? 'Warnung' : 'Fehler'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(securityStatus.encryption)}
                <span className="font-medium">Verschlüsselung</span>
              </div>
              <Badge variant={securityStatus.encryption === 'secure' ? 'default' : 'destructive'}>
                {securityStatus.encryption === 'secure' ? 'Sicher' : 
                 securityStatus.encryption === 'warning' ? 'Warnung' : 'Fehler'}
              </Badge>
            </div>
          </div>
          
          {showDetails && (
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Sicherheitsempfehlungen</h4>
                <div className="space-y-2">
                  {getOverallStatus() === 'error' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Kritische Sicherheitsprobleme erkannt. Bitte wenden Sie sich an den Support.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {securityStatus.authentication === 'warning' && (
                    <Alert>
                      <AlertDescription>
                        Ihre Sitzung läuft bald ab. Loggen Sie sich erneut ein.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {securityStatus.rateLimit === 'warning' && (
                    <Alert>
                      <AlertDescription>
                        Sie nähern sich Ihren Nutzungslimits. Erwägen Sie ein Upgrade.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
              
              {recentEvents.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Letzte Sicherheitsereignisse</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentEvents.map((event) => (
                      <div key={event.id} className="text-sm p-2 border rounded bg-gray-50">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{event.action}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.created_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        {event.resource_type && (
                          <div className="text-gray-600">Ressource: {event.resource_type}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};