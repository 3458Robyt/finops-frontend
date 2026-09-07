import type { ReactNode } from 'react';

export function Metric({ title, value, helper }: { readonly title: string; readonly value: number; readonly helper: string }) {
  return <div className="ui-surface-raised p-5"><p className="ui-label">{title}</p><p className="mt-2 text-3xl font-black text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{helper}</p></div>;
}

export function StatusBadge({ active, label }: { readonly active: boolean; readonly label: string }) {
  return <span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${active ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{label}</span>;
}

export function FormPanel({ title, icon, children }: { readonly title: string; readonly icon: string; readonly children: ReactNode }) {
  return <div className="ui-surface-raised p-5"><div className="mb-5 flex items-center justify-between"><h2 className="ui-label text-zinc-200">{title}</h2><span className="material-symbols-outlined text-tak-yellow">{icon}</span></div>{children}</div>;
}

export function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <label className="block"><span className="block mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">{label}</span>{children}</label>;
}
