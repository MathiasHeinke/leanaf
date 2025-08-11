import React from 'react';
import type { SupplementProposal } from '@/hooks/useOrchestrator';

interface ConfirmSupplementModalProps {
  open: boolean;
  prompt: string;
  proposal: SupplementProposal | null;
  onConfirm: (pickedIdx?: number) => void;
  onClose: () => void;
}

export default function ConfirmSupplementModal({ open, prompt, proposal, onConfirm, onClose }: ConfirmSupplementModalProps) {
  if (!open || !proposal) return null;
  const { items, topPickIdx } = proposal;
  const item = items[Math.max(0, Math.min(topPickIdx ?? 0, items.length - 1))];
  const pct = Math.round(Math.max(60, Math.min(98, (item.confidence || 0) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg m-0 sm:m-4 rounded-t-2xl sm:rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="p-4 sm:p-6 space-y-3">
          <h3 className="text-base font-semibold">Supplement speichern?</h3>
          <p className="text-sm text-muted-foreground">{prompt}</p>

          <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={`Supplement Vorschau: ${item.name}`}
                  className="w-12 h-12 rounded object-cover border"
                  loading="lazy"
                />
              )}
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <span>{item.name}</span>
                  {item.canonical && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.canonical}</span>
                  )}
                </div>
                {item.dose && <div className="text-sm text-muted-foreground">Dosierung: {item.dose}</div>}
                {item.notes && <div className="text-sm text-muted-foreground mt-1">{item.notes}</div>}
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">~{pct}%</div>
            </div>
          </div>

          {items.length > 1 && (
            <div className="text-xs text-muted-foreground">Mehrere erkannt – ich habe die beste Übereinstimmung vorausgewählt.</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-3 py-2 text-sm rounded-md border">Abbrechen</button>
            <button onClick={() => onConfirm(item ? items.indexOf(item) : 0)} className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground">Speichern</button>
          </div>
        </div>
      </div>
    </div>
  );
}
