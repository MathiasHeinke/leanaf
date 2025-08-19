import React from 'react';
import { safeStringify } from '@/utils/safeJsonHelpers';

type Props = { data: any; maxHeight?: number };

export function JsonPanel({ data, maxHeight = 300 }: Props) {
  const pretty = safeStringify(data, String(data));

  return (
    <div className="mt-3 rounded-2xl border bg-muted/30 p-3">
      <pre className="overflow-auto text-xs leading-5" style={{ maxHeight }}>
        {pretty}
      </pre>
    </div>
  );
}
