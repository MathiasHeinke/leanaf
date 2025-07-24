import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, Target } from 'lucide-react';

interface ProfileOnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const ProfileOnboardingOverlay = ({ 
  isOpen, 
  onClose, 
  userName = "Willkommen" 
}: ProfileOnboardingOverlayProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          
          <DialogTitle className="text-2xl font-bold">
            {userName}! 🎉
          </DialogTitle>
          
          <DialogDescription className="text-base space-y-4">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-semibold">Willkommen bei deiner Transformation!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Diese Plattform ist für <strong>Macher</strong> wie dich, die wirklich etwas verändern wollen.
              </p>
            </div>
            
            <div className="bg-accent/10 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                <span className="font-semibold">Dein nächster Schritt:</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Fülle jetzt zuerst deine Profildaten aus. Diese brauchen wir, um dir die perfekte Betreuung zu bieten.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={onClose} className="w-full">
            Los geht's! 🚀
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Danach geht's zur Hauptseite für dein tägliches Tracking
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};