import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckUpModal } from './CheckUpModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { RefreshCw, User, AlertCircle } from 'lucide-react';

interface WorkoutCheckUpTriggerProps {
  coachAvatar?: string;
  coachName?: string;
  className?: string;
}

export const WorkoutCheckUpTrigger: React.FC<WorkoutCheckUpTriggerProps> = ({
  coachAvatar,
  coachName,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { profile, shouldShowCheckUp, isStale, missingRequired, refreshProfile, isLoading, error, isFirstAppStart } = useUserProfile();

  // Auto-show modal on first app start or missing required fields
  useEffect(() => {
    if (missingRequired && !isLoading) {
      console.log('🚨 Auto-opening CheckUp modal - missing required fields');
      setIsModalOpen(true);
    }
  }, [missingRequired, isLoading]);

  // Listen for slash command events
  useEffect(() => {
    const handleSlashCommand = (event: CustomEvent) => {
      console.log('🔧 Received slash command event:', event.detail);
      setIsModalOpen(true);
    };

    window.addEventListener('openCheckUpModal', handleSlashCommand as EventListener);
    
    return () => {
      window.removeEventListener('openCheckUpModal', handleSlashCommand as EventListener);
    };
  }, []);

  const handleOpenModal = () => {
    console.log('👆 Manual CheckUp modal open');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('✅ CheckUp modal closed');
    setIsModalOpen(false);
    refreshProfile(); // Refresh profile data after modal closes
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`rounded-lg border border-border bg-card p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`rounded-lg border border-destructive/50 bg-destructive/10 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Profil-Laden fehlgeschlagen</h3>
            <p className="text-sm text-destructive/80">
              {error}
            </p>
          </div>
          <Button onClick={refreshProfile} variant="outline" size="sm">
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // Show different UI states based on profile status
  if (missingRequired) {
    return (
      <>
        <div className={`rounded-lg border border-orange-200 bg-orange-50 p-4 ${className}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">
                {isFirstAppStart ? 'Willkommen! Profil-Setup erforderlich' : 'Profil-Setup erforderlich'}
              </h3>
              <p className="text-sm text-orange-700">
                {isFirstAppStart 
                  ? 'Vervollständige dein Trainingsprofil für personalisierte Pläne.' 
                  : 'Einige wichtige Profildaten fehlen für optimale Trainingsplanung.'}
              </p>
            </div>
            <Button onClick={handleOpenModal} size="sm">
              {isFirstAppStart ? 'Profil erstellen' : 'Vervollständigen'}
            </Button>
          </div>
        </div>
        
        <CheckUpModal
          open={isModalOpen}
          onClose={handleCloseModal}
          defaultValues={profile}
          coachAvatar={coachAvatar}
          coachName={coachName}
        />
      </>
    );
  }

  if (isStale) {
    return (
      <>
        <div className={`rounded-lg border border-blue-200 bg-blue-50 p-3 ${className}`}>
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm text-blue-700">
                <Badge variant="secondary" className="mr-2">🔄 Update fällig</Badge>
                Profil-Update empfohlen (letztes Update vor 30+ Tagen)
              </p>
            </div>
            <Button onClick={handleOpenModal} variant="outline" size="sm">
              Update
            </Button>
          </div>
        </div>
        
        <CheckUpModal
          open={isModalOpen}
          onClose={handleCloseModal}
          defaultValues={profile}
          coachAvatar={coachAvatar}
          coachName={coachName}
        />
      </>
    );
  }

  // Profile is complete and current - show optional update button
  return (
    <>
      <Button 
        onClick={handleOpenModal} 
        variant="outline" 
        size="sm"
        className={`gap-2 ${className}`}
      >
        <User className="h-4 w-4" />
        Profil bearbeiten
      </Button>
      
      <CheckUpModal
        open={isModalOpen}
        onClose={handleCloseModal}
        defaultValues={profile}
        coachAvatar={coachAvatar}
        coachName={coachName}
      />
    </>
  );
};