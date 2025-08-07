import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Global listener-based overlay that can be triggered from anywhere via
// window.dispatchEvent(new CustomEvent('openCreditsOverlay'))
export const CreditsOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('openCreditsOverlay', onOpen as EventListener);
    return () => window.removeEventListener('openCreditsOverlay', onOpen as EventListener);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border bg-card shadow-xl">
        <button
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Credits aufgebraucht</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Du hast aktuell keine AI-Credits mehr. Lade dein Guthaben auf, um Analysen, Chat-Nachrichten und Bilderzeugung weiter zu nutzen.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { setOpen(false); navigate('/credits'); }}>
              Credits-Packs ansehen
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Später</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditsOverlay;
