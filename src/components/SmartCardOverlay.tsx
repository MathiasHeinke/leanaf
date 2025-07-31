import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartCardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  icon: string;
}

export const SmartCardOverlay = ({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  icon 
}: SmartCardOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-4 md:inset-8 bg-background rounded-xl border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white/30 dark:bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h2 className="font-semibold">{title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-4 h-[calc(100%-64px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};