import type { ReactNode } from 'react';

export function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

export function Notice({ tone, children }: { readonly tone: 'success' | 'warning' | 'error'; readonly children: ReactNode }) {
  const colors = tone === 'error'
    ? 'border-red-500/30 bg-red-500/10 text-red-200'
    : tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${colors}`}>{children}</p>;
}
