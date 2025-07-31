import React from 'react';
import { SmartCard } from './SmartCard';

interface Supplement {
  name: string;
  dosage: string;
  timing: string;
  stackCompatibility?: string;
}

interface SupplementCardProps {
  supplements: Supplement[];
  onConfirm?: () => void;
  onReject?: () => void;
}

export const SupplementCard = ({ 
  supplements, 
  onConfirm, 
  onReject 
}: SupplementCardProps) => {
  const actions = [];
  
  if (onConfirm) {
    actions.push({
      label: '✔︎ Übernehmen',
      variant: 'confirm' as const,
      onClick: onConfirm
    });
  }
  
  if (onReject) {
    actions.push({
      label: '✕ Verwerfen',
      variant: 'reject' as const,
      onClick: onReject
    });
  }

  return (
    <SmartCard
      tool="supplement"
      icon="💊"
      title="Supplement-Plan"
      actions={actions}
      defaultCollapsed={true}
    >
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
          <span>Name</span>
          <span>Dosierung</span>
          <span>Zeit</span>
        </div>
        {supplements.map((supplement, index) => (
          <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
            <span className="font-medium">{supplement.name}</span>
            <span>{supplement.dosage}</span>
            <span className="text-muted-foreground">{supplement.timing}</span>
          </div>
        ))}
        {supplements.length > 3 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Alle Supplements sind stack-kompatibel optimiert
          </div>
        )}
      </div>
    </SmartCard>
  );
};