import React from 'react';
import type { MealProposal } from '@/hooks/useOrchestrator';

interface ConfirmMealModalProps {
  open: boolean;
  prompt: string;
  proposal: MealProposal | null;
  onConfirm: () => void;
  onClose: () => void;
  uploadedImages?: string[];
}

export default function ConfirmMealModal({ open, prompt, proposal, onConfirm, onClose, uploadedImages = [] }: ConfirmMealModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg m-0 sm:m-4 rounded-t-2xl sm:rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="p-4 sm:p-6">
          <h3 className="text-base font-semibold mb-1">Vorschlag speichern?</h3>
          <p className="text-sm text-muted-foreground mb-4">{prompt}</p>

          {/* Image previews */}
          {uploadedImages.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Bilder ({uploadedImages.length})</p>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {uploadedImages.map((url, idx) => (
                  <div key={url + idx} className="flex-shrink-0">
                    <img
                      src={url}
                      alt={`Mahlzeit ${idx + 1}`}
                      className="h-16 w-16 rounded-lg object-cover border border-border shadow-sm"
                      onError={(e) => {
                        console.warn('⚠️ Failed to load image:', url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {proposal && (
            <div className="mb-4 text-sm space-y-2">
              {proposal.title && <div className="font-medium">{proposal.title}</div>}
              {typeof proposal.calories === 'number' && (
                <div className="text-muted-foreground">≈ {Math.round(proposal.calories)} kcal</div>
              )}
              {(proposal.protein || proposal.carbs || proposal.fats) && (
                <div className="text-muted-foreground">
                  {proposal.protein ? `P ${Math.round(proposal.protein)}g` : ''}
                  {proposal.carbs ? ` · C ${Math.round(proposal.carbs)}g` : ''}
                  {proposal.fats ? ` · F ${Math.round(proposal.fats)}g` : ''}
                </div>
              )}
              {proposal.confidence !== undefined && proposal.confidence < 0.7 && (
                <div className="text-amber-600 text-xs">
                  ⚠️ Analyse unsicher - bitte Werte überprüfen
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted/40"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
