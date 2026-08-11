import type { ReactNode } from 'react';
import type { ResourceMetricSampleItem, TechnicalMetricsOverview } from '../../services/api';
import {
  formatCurrency,
  formatDateTime,
  formatGranularity,
  formatMetricValue,
  shortResource,
} from './technicalMetricsPresentation';

export function ResourceCostPanel({ overview }: { readonly overview: TechnicalMetricsOverview | null }) {
  const resources = overview?.resources ?? [];
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <h3 className="text-lg font-bold text-white">Recursos y costo asociado</h3>
        <p className="text-xs text-zinc-500">El costo solo se muestra cuando hay relacion exacta por recurso.</p>
      </div>
      <div className="max-h-[360px] overflow-auto custom-scrollbar">
        {resources.length === 0 ? <EmptyState text="Sin recursos con metricas tecnicas" /> : resources.map((resource) => (
          <div key={resource.externalResourceId} className="border-b border-zinc-800 p-4 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{resource.name ?? shortResource(resource.externalResourceId)}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{resource.provider} · {resource.serviceName ?? 'Servicio no normalizado'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-tak-yellow">
                  {resource.cost === undefined ? '-' : formatCurrency(resource.cost.totalCost, resource.cost.currency)}
                </p>
                <p className="text-[10px] font-black uppercase text-zinc-500">{resource.cost?.matchLevel ?? 'NONE'}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {resource.metricNames.join(' · ')}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SamplesTable({ samples, loading }: {
  readonly samples: readonly ResourceMetricSampleItem[];
  readonly loading: boolean;
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <h3 className="text-lg font-bold text-white">Muestras recientes</h3>
        <p className="text-xs text-zinc-500">Detalle crudo para auditoria rapida.</p>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[680px] text-left">
          <thead><tr className="bg-zinc-950/50"><Th>Momento</Th><Th>Recurso</Th><Th>Metrica</Th><Th>Valor</Th><Th>Granularidad</Th></tr></thead>
          <tbody>
            {loading ? <EmptyRow colSpan={5} text="Cargando muestras..." /> : samples.length === 0
              ? <EmptyRow colSpan={5} text="Sin muestras tecnicas registradas" />
              : samples.map((sample) => (
                <tr key={sample.id} className="border-b border-zinc-800/50 transition-colors last:border-0 hover:bg-zinc-800/50">
                  <td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(sample.sampledAt)}</td>
                  <td className="p-4 text-xs text-zinc-300">{shortResource(sample.externalResourceId)}</td>
                  <td className="p-4 text-sm font-bold text-white">{sample.metricName}</td>
                  <td className="p-4 text-sm text-zinc-200">{formatMetricValue(sample.value, sample.metricUnit)}</td>
                  <td className="p-4 text-xs text-zinc-400">{formatGranularity(sample.granularitySeconds)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { readonly children: ReactNode }) {
  return <th className="border-b border-zinc-800 p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{children}</th>;
}

function EmptyRow({ colSpan, text }: { readonly colSpan: number; readonly text: string }) {
  return <tr><td colSpan={colSpan} className="p-6 text-center text-sm font-bold text-zinc-500">{text}</td></tr>;
}

function EmptyState({ text }: { readonly text: string }) {
  return <div className="flex h-full min-h-[160px] w-full items-center justify-center p-6 text-center text-sm font-bold text-zinc-500">{text}</div>;
}
