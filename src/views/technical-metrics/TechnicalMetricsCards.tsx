import type { ReactNode } from 'react';
import type { TechnicalMetricKpi, TechnicalMetricOpportunity } from '../../services/api';
import {
  formatCurrency,
  formatMetricValue,
  formatShortDate,
  severityStyles,
} from './technicalMetricsPresentation';

export function StatCard({ icon, label, value, helper }: {
  readonly icon: string;
  readonly label: string;
  readonly value: string;
  readonly helper: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="material-symbols-outlined text-tak-yellow">{icon}</span>
        <span className="h-2 w-2 rounded-full bg-tak-yellow" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-500">{helper}</p>
    </div>
  );
}

export function SelectField({ label, value, onChange, children }: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-tak-yellow"
      >
        {children}
      </select>
    </label>
  );
}

export function KpiCard({ kpi }: { readonly kpi: TechnicalMetricKpi }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white">{kpi.label}</p>
        <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-black text-tak-yellow">
          {kpi.sampleCount}
        </span>
      </div>
      <div className="h-20"><KpiSparkline values={[kpi.minimum, kpi.average, kpi.maximum, kpi.latest]} /></div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MiniMetric label="Promedio" value={formatMetricValue(kpi.average, kpi.unit)} />
        <MiniMetric label="Pico" value={formatMetricValue(kpi.maximum, kpi.unit)} />
        <MiniMetric label="Ultimo" value={formatMetricValue(kpi.latest, kpi.unit)} />
        <MiniMetric label="Actualizado" value={formatShortDate(kpi.latestSampledAt)} />
      </div>
    </div>
  );
}

function KpiSparkline({ values }: { readonly values: readonly number[] }) {
  const points = values.filter(Number.isFinite);
  if (points.length < 2) return <div className="h-full rounded-xl border border-zinc-800 bg-zinc-950" />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coordinates = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 100;
    const y = Number.isFinite(value) ? 92 - ((value - min) / range) * 84 : 92;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <polyline points={`0,100 ${coordinates} 100,100`} fill="#facc15" fillOpacity="0.16" stroke="none" />
      <polyline points={coordinates} fill="none" stroke="#facc15" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MiniMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

export function OpportunityCard({ opportunity }: { readonly opportunity: TechnicalMetricOpportunity }) {
  return (
    <div className={`rounded-2xl border p-4 ${severityStyles[opportunity.severity]}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-black text-white">{opportunity.title}</p>
        <span className="rounded bg-zinc-950/70 px-2 py-1 text-[10px] font-black">{opportunity.severity}</span>
      </div>
      <p className="text-xs leading-relaxed text-zinc-300">{opportunity.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
        {opportunity.value !== undefined && (
          <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-300">
            {formatMetricValue(opportunity.value, opportunity.unit)}
          </span>
        )}
        {opportunity.cost !== undefined && (
          <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-tak-yellow">
            {formatCurrency(opportunity.cost, opportunity.currency ?? 'USD')}
          </span>
        )}
      </div>
    </div>
  );
}
