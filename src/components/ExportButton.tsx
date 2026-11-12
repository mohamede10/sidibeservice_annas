'use client';

import React from 'react';
import { Download } from 'lucide-react';

export default function ExportButton({
  onExport,
  disabled,
  count,
  label = 'Exporter',
}: {
  onExport: () => void;
  disabled?: boolean;
  count?: number;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      title="Télécharger Excel (CSV)"
      className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-amber-500/50 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="text-[10px] font-bold text-slate-500">{count}</span>
      )}
    </button>
  );
}
