import { useEffect, useState } from 'react';
import {
  fetchTechnicalMetricSamples,
  fetchTechnicalResources,
  type CloudResourceItem,
  type CloudResourceStatus,
  type ResourceMetricSampleItem,
} from '../services/api';

/** Etiqueta y color del estado de un recurso cloud. */
const resourceStatusStyles: Readonly<Record<CloudResourceStatus, { readonly label: string; readonly className: string }>> = {
  ACTIVE: { label: 'Activo', className: 'bg-green-500/15 text-green-300' },
  STOPPED: { label: 'Detenido', className: 'bg-tak-yellow/15 text-tak-yellow' },
  TERMINATED: { label: 'Terminado', className: 'bg-red-500/15 text-red-300' },
  UNKNOWN: { label: 'Desconocido', className: 'bg-zinc-800 text-zinc-400' },
};

export default function MetricasTecnicas({ token }: { readonly token: string }) {
  const [resources, setResources] = useState<readonly CloudResourceItem[]>([]);
  const [samples, setSamples] = useState<readonly ResourceMetricSampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchTechnicalResources(token),
      fetchTechnicalMetricSamples(token),
    ])
      .then(([resourcesResponse, samplesResponse]) => {
        if (active) {
          setResources(resourcesResponse.resources);
          setSamples(samplesResponse.samples);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setResources([]);
          setSamples([]);
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las métricas técnicas.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-black text-white">Métricas técnicas</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Inventario de recursos y observaciones técnicas (CPU, memoria, IOPS, throughput) recolectadas
          de fuentes de monitorización.
        </p>
      </header>

      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-200/90 flex items-start gap-3">
        <span className="material-symbols-outlined text-sky-300">info</span>
        <p>
          Estas métricas provienen de monitorización/agentes y son independientes de FOCUS. FOCUS solo
          aporta costo y consumo facturado; no incluye CPU, memoria, IOPS ni throughput. Si aún no hay
          un colector configurado, las tablas aparecerán vacías.
        </p>
      </div>

      {error !== null && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">dns</span>
          <h3 className="text-lg font-bold text-white">Inventario de recursos</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <Th>Recurso</Th>
                <Th>Tipo</Th>
                <Th>Servicio</Th>
                <Th>Región</Th>
                <Th>Estado</Th>
                <Th>Último visto</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={6} text="Cargando inventario de recursos..." />
              ) : resources.length === 0 ? (
                <EmptyRow colSpan={6} text="Sin recursos inventariados (no hay colector de métricas técnicas configurado)" />
              ) : resources.map((resource) => (
                <tr key={resource.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                  <td className="p-4 text-sm font-medium text-white">{resource.name ?? resource.externalResourceId}</td>
                  <td className="p-4 text-sm text-zinc-300">{resource.resourceType}</td>
                  <td className="p-4 text-sm text-zinc-300">{resource.serviceName}</td>
                  <td className="p-4 text-xs text-zinc-400">{resource.regionId ?? '—'}</td>
                  <td className="p-4"><StatusBadge {...resourceStatusStyles[resource.status]} /></td>
                  <td className="p-4 text-xs text-zinc-400">{formatDateTime(resource.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">monitoring</span>
          <h3 className="text-lg font-bold text-white">Muestras de métricas</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <Th>Momento</Th>
                <Th>Recurso</Th>
                <Th>Métrica</Th>
                <Th>Valor</Th>
                <Th>Granularidad</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={5} text="Cargando muestras de métricas..." />
              ) : samples.length === 0 ? (
                <EmptyRow colSpan={5} text="Sin muestras de métricas técnicas registradas" />
              ) : samples.map((sample) => (
                <tr key={sample.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                  <td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(sample.sampledAt)}</td>
                  <td className="p-4 text-sm text-zinc-300">{sample.externalResourceId}</td>
                  <td className="p-4 text-sm font-medium text-white">{sample.metricName}</td>
                  <td className="p-4 text-sm text-zinc-200">{formatValue(sample.value)}{sample.metricUnit !== undefined ? ` ${sample.metricUnit}` : ''}</td>
                  <td className="p-4 text-xs text-zinc-400">{formatGranularity(sample.granularitySeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
      {children}
    </th>
  );
}

function EmptyRow({ colSpan, text }: { readonly colSpan: number; readonly text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-6 text-center text-sm font-bold text-zinc-500">{text}</td>
    </tr>
  );
}

function StatusBadge({ label, className }: { readonly label: string; readonly className: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide w-fit inline-block ${className}`}>
      {label}
    </span>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatValue(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(value);
}

function formatGranularity(seconds: number): string {
  if (seconds % 3600 === 0) {
    return `${seconds / 3600} h`;
  }

  if (seconds % 60 === 0) {
    return `${seconds / 60} min`;
  }

  return `${seconds} s`;
}
