import type { ReactNode } from 'react';
import type { RecommendationSeverity } from '../../services/api';

export function DetailShell({ children, onBack }: { readonly children: ReactNode; readonly onBack: () => void }) {
  return (
    <div className="ui-surface mx-auto flex w-full max-w-5xl flex-col overflow-hidden relative animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-6 py-5 md:px-10 md:py-7 border-b border-zinc-800/50 bg-zinc-950/20">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="flex size-10 items-center justify-center rounded-xl border border-tak-yellow/20 bg-tak-yellow/10 md:size-12">
            <span className="material-symbols-outlined text-tak-yellow text-2xl md:text-3xl">insights</span>
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-black tracking-tight text-white uppercase italic">Detalle de Recomendacion</h2>
            <p className="text-[10px] md:text-xs text-zinc-500 font-bold tracking-widest uppercase">FinOps Console • Cloud Optimizer</p>
          </div>
        </div>
        <button onClick={onBack} className="ui-icon-button size-10 md:size-12">
          <span className="material-symbols-outlined font-bold">close</span>
        </button>
      </div>
      {children}
    </div>
  );
}
export function Badge({ label, tone }: { readonly label: string; readonly tone?: RecommendationSeverity }) {
  const color = tone === 'CRITICAL' || tone === 'HIGH'
    ? 'bg-red-500/10 text-red-300 border-red-500/20'
    : tone === 'MEDIUM'
      ? 'bg-tak-yellow/10 text-tak-yellow border-tak-yellow/20'
      : 'bg-zinc-800 text-zinc-300 border-zinc-700';

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
      {label}
    </span>
  );
}

export function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="ui-surface-raised min-w-0 p-5">
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm font-bold text-zinc-100 break-words">{value}</p>
    </div>
  );
}

export function EvidenceLine({ icon, label, value }: { readonly icon: string; readonly label: string; readonly value: string }) {
  return (
    <div className="ui-surface-raised flex items-start gap-4 p-4">
      <span className="material-symbols-outlined text-tak-yellow text-xl">{icon}</span>
      <p className="text-xs md:text-sm text-zinc-400 font-medium">
        {value}
        <span className="block text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{label}</span>
      </p>
    </div>
  );
}

