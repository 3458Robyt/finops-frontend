import type { AllocationSummary } from '../services/api';

export function CostAllocationSharedTotals({ summary }: { readonly summary: readonly AllocationSummary[] }) {
  return <section className="grid gap-3 md:grid-cols-3">{summary.map((item) => <article key={item.currency} className="rounded-xl border border-tak-yellow/30 bg-tak-yellow/5 p-4"><p className="text-xs uppercase text-tak-yellow">{item.currency} · Distribución compartida</p><p className="mt-1 text-2xl font-black">{item.sharedCost.toFixed(2)}</p><p className="text-sm text-zinc-400">Costo distribuido entre varios destinos; se conserva el total fuente de {item.totalCost.toFixed(2)}.</p></article>)}</section>;
}
