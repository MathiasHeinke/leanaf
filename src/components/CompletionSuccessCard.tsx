import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

interface CompletionSuccessCardProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export const CompletionSuccessCard = ({ 
  isOpen, 
  onClose, 
  onContinue 
}: CompletionSuccessCardProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <DialogTitle className="text-2xl font-bold">
            Geschafft! 🎉
          </DialogTitle>
          
          <DialogDescription className="text-base space-y-4">
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-400/10 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-green-500" />
                <span className="font-semibold">Profil erfolgreich erstellt!</span>
                <Sparkles className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Alle wichtigen Daten sind jetzt gespeichert. Du kannst mit dem Tracking beginnen!
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">
                🎁 <span className="text-primary">3 Tage Premium</span> sind für dich freigeschaltet!
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Teste alle Features uneingeschränkt
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={onContinue} className="w-full group">
            Zum Dashboard
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};