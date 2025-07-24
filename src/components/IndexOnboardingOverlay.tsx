import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Activity, Camera, Scale, Moon, TrendingUp } from 'lucide-react';

interface IndexOnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onHighlightMealInput: () => void;
}

export const IndexOnboardingOverlay = ({ 
  isOpen, 
  onClose, 
  onHighlightMealInput 
}: IndexOnboardingOverlayProps) => {
  
  const handleGetStarted = () => {
    onClose();
    setTimeout(() => {
      onHighlightMealInput();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-white" />
          </div>
          
          <DialogTitle className="text-2xl font-bold">
            Perfekt! 🎯
          </DialogTitle>
          
          <DialogDescription className="text-base space-y-4">
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-4">
              <p className="font-semibold text-center mb-3">
                Das ist dein tägliches Tracking-Dashboard
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4 text-blue-500" />
                  <span>Gewicht eingeben</span>
                </div>
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Schlafverhalten tracken</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Körpermaße (1x pro Woche)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-orange-500" />
                  <span><strong>Mahlzeiten regelmäßig fotografieren</strong></span>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-500/10 rounded-lg p-3">
              <p className="text-sm text-center font-medium">
                Tipp: Du musst nicht immer Gramm angeben - die KI erkennt sehr gut aus den Fotos! 📸
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={handleGetStarted} className="w-full">
            Verstanden! Erste Mahlzeit eingeben 🍽️
          </Button>
          
          <Button variant="outline" onClick={onClose} className="w-full">
            Später
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};