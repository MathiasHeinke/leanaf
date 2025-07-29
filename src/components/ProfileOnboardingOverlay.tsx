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
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-accent to-primary/60 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>
          
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Hallo {userName}! 🎉
          </DialogTitle>
          
          <DialogDescription className="text-lg space-y-6">
            <div className="bg-gradient-to-r from-primary/15 to-accent/15 rounded-xl p-6 space-y-3 border border-primary/20">
              <div className="flex items-center gap-3 justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                <span className="font-bold text-xl text-foreground">Willkommen bei deiner Transformation!</span>
                <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              </div>
              <p className="text-base text-muted-foreground">
                Diese Plattform ist für <span className="font-bold text-primary">Macher</span> wie dich, die wirklich etwas verändern wollen.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900 dark:text-blue-100">Wie dich die Coaches nennen sollen</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Dein persönlicher Name für eine individuelle Betreuung
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900 dark:text-green-100">Dein aktuelles Gewicht</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Die Basis für deine persönliche Kalorienbilanz
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-900 dark:text-purple-100">Dein Ziel</span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Abnehmen, Zunehmen oder Gewicht halten
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-900 dark:text-orange-100">Bis wann</span>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Dein Zieldatum für die perfekte Planung
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-accent/15 to-primary/15 rounded-xl p-6 space-y-3 border border-accent/20">
              <div className="flex items-center gap-3 justify-center">
                <Target className="w-6 h-6 text-accent" />
                <span className="font-bold text-xl text-foreground">Dein nächster Schritt</span>
              </div>
              <p className="text-base text-center text-muted-foreground">
                Fülle <span className="font-bold text-accent">jetzt zuerst</span> deine Profildaten aus. Diese brauchen wir, um dir die <span className="font-bold text-primary">perfekte Betreuung</span> zu bieten.
              </p>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-full text-sm font-medium">
                  🎯 Sobald du fertig bist, schalten wir alles für dich frei!
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 pt-6">
          <Button onClick={onClose} className="w-full text-lg py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
            Jetzt Profil ausfüllen! 🚀
          </Button>
          
          <p className="text-sm text-center text-muted-foreground">
            <span className="font-medium">Nach dem Ausfüllen:</span> Zugang zum Dashboard und täglichem Tracking
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};