import React, { useMemo, useState } from 'react';
import type { SupplementProposal } from '@/hooks/useOrchestrator';

interface ConfirmSupplementModalProps {
  open: boolean;
  prompt: string;
  proposal: SupplementProposal | null;
  onConfirm: (pickedIdx?: number, patch?: { dose?: string | null; schedule?: { freq?: 'daily'|'weekly'|'custom'; time?: 'morning'|'noon'|'evening'|'preworkout'|'postworkout'|'bedtime'|'custom'; custom?: string | null } | null; notes?: string | null; updateExisting?: boolean }) => void;
  onClose: () => void;
}

export default function ConfirmSupplementModal({ open, prompt, proposal, onConfirm, onClose }: ConfirmSupplementModalProps) {
  if (!open || !proposal) return null;
  const safeIdx = Math.max(0, Math.min(proposal.topPickIdx ?? 0, proposal.items.length - 1));
  const [idx, setIdx] = useState<number>(safeIdx);

  const item = useMemo(() => proposal.items[Math.max(0, Math.min(idx, proposal.items.length - 1))] as any, [proposal, idx]);
  const [dose, setDose] = useState<string>(item?.dose || '');
  const [notes, setNotes] = useState<string>(item?.notes || '');
  const [freq, setFreq] = useState<'daily'|'weekly'|'custom'|undefined>('daily');
  const [time, setTime] = useState<'morning'|'noon'|'evening'|'preworkout'|'postworkout'|'bedtime'|'custom'|undefined>('evening');
  const [customTime, setCustomTime] = useState<string>('');
  const existingId = (item?.existingId ?? (proposal as any)?.existingId) as number | null | undefined;
  const [updateExisting, setUpdateExisting] = useState<boolean>(false);

  const pct = Math.round(Math.max(60, Math.min(98, (item?.confidence || 0) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg m-0 sm:m-4 rounded-t-2xl sm:rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold flex items-center gap-2">Supplement speichern?
              {existingId ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">Bereits im Stack</span>
              ) : null}
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prompt}</p>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              {item?.image_url && (
                <img src={item.image_url} alt={`Supplement Vorschau: ${item.name}`} className="w-12 h-12 rounded object-cover border" loading="lazy" />
              )}
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <span>{item?.name}</span>
                  {item?.canonical && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.canonical}</span>
                  )}
                </div>
                {item?.dose && <div className="text-sm text-muted-foreground">Erkannt: {item.dose}</div>}
                {item?.notes && <div className="text-sm text-muted-foreground mt-1">{item.notes}</div>}
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">~{pct}%</div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="text-sm font-medium">Dosis</label>
                <input
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="z. B. 5 g, 2 Kapseln"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Häufigkeit</label>
                <select
                  value={freq || ''}
                  onChange={(e) => setFreq((e.target.value || undefined) as any)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2"
                >
                  <option value="daily">täglich</option>
                  <option value="weekly">wöchentlich</option>
                  <option value="custom">custom</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Zeit</label>
                <select
                  value={time || ''}
                  onChange={(e) => setTime((e.target.value || undefined) as any)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2"
                >
                  <option value="morning">morgens</option>
                  <option value="noon">mittags</option>
                  <option value="evening">abends</option>
                  <option value="preworkout">vor dem Training</option>
                  <option value="postworkout">nach dem Training</option>
                  <option value="bedtime">vor dem Schlafen</option>
                  <option value="custom">custom</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Custom‑Zeit</label>
                <input
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="z. B. 19:00"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-sm font-medium">Notiz</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="optional"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            {existingId ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
                Vorhandenen Eintrag anpassen
              </label>
            ) : null}
          </div>

          {proposal.items.length > 1 && (
            <div className="text-xs text-muted-foreground">Mehrere erkannt – wähle den richtigen.</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-3 py-2 text-sm rounded-md border">Abbrechen</button>
            <button
              onClick={() => {
                const schedule = {
                  freq,
                  time,
                  ...(time === 'custom' && customTime ? { custom: customTime } : {})
                } as any;
                onConfirm(idx, {
                  dose: dose?.trim() || null,
                  notes: notes?.trim() || null,
                  schedule: (schedule.freq || schedule.time || schedule.custom) ? schedule : null,
                  updateExisting: !!updateExisting,
                });
              }}
              className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground"
            >{existingId && updateExisting ? 'Aktualisieren' : 'Speichern'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
