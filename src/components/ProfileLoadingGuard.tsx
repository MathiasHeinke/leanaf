import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProfileLoadingGuardProps {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  children: React.ReactNode;
  onRetry?: () => void;
}

export const ProfileLoadingGuard: React.FC<ProfileLoadingGuardProps> = ({
  isLoading,
  hasError,
  errorMessage,
  children,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <div className="text-lg font-medium mb-2">Profil wird geladen...</div>
            <div className="text-sm text-muted-foreground">
              Deine Daten werden abgerufen
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-destructive mb-4" />
            <div className="text-lg font-medium mb-2">Fehler beim Laden des Profils</div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              {errorMessage || 'Es gab ein Problem beim Laden deiner Profildaten.'}
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                Erneut versuchen
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};