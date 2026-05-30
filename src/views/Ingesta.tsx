import { useEffect, useState } from 'react';
import {
  fetchDataQualityChecks,
  fetchIngestionHistory,
  type DataQualityCheckItem,
  type DataQualityStatus,
  type IngestionJobHistoryItem,
  type IngestionJobStatus,
  type IngestionSourceType,
} from '../services/api';

/** Etiquetas en español para el tipo de fuente de ingesta. */
const sourceTypeLabels: Readonly<Record<IngestionSourceType, string>> = {
  BILLING_EXPORT: 'Facturación',
  INVENTORY: 'Inventario',
  TECHNICAL_METRIC: 'Métrica técnica',
  AGENT_METRIC: 'Métrica de agente',
};

/** Etiqueta y color del estado de un trabajo de ingesta. */
const jobStatusStyles: Readonly<Record<IngestionJobStatus, { readonly label: string; readonly className: string }>> = {
  PENDING: { label: 'Pendiente', className: 'bg-zinc-800 text-zinc-300' },
  RUNNING: { label: 'En ejecución', className: 'bg-sky-500/15 text-sky-300' },
  SUCCESS: { label: 'Completado', className: 'bg-green-500/15 text-green-300' },
  FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' },
  CANCELLED: { label: 'Cancelado', className: 'bg-zinc-700 text-zinc-400' },
};

/** Etiqueta y color del resultado de un control de calidad de datos. */
const qualityStatusStyles: Readonly<Record<DataQualityStatus, { readonly label: string; readonly className: string }>> = {
  PASSED: { label: 'Aprobado', className: 'bg-green-500/15 text-green-300' },
  WARNING: { label: 'Advertencia', className: 'bg-tak-yellow/15 text-tak-yellow' },
  FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' },
};

export default function Ingesta({ token }: { readonly token: string }) {
  const [jobs, setJobs] = useState<readonly IngestionJobHistoryItem[]>([]);
  const [checks, setChecks] = useState<readonly DataQualityCheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchIngestionHistory(token),
      fetchDataQualityChecks(token),
    ])
      .then(([historyResponse, qualityResponse]) => {
        if (active) {
          setJobs(historyResponse.jobs);
          setChecks(qualityResponse.checks);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setJobs([]);
          setChecks([]);
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ingesta.');
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
        <h2 className="text-2xl font-black text-white">Ingesta y calidad de datos</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Historial de trabajos de ingesta y resultados de los controles de calidad del tenant.
        </p>
      </header>

      {error !== null && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">cloud_sync</span>
          <h3 className="text-lg font-bold text-white">Historial de ingesta</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <Th>Fecha</Th>
                <Th>Conexión</Th>
                <Th>Fuente</Th>
                <Th>Estado</Th>
                <Th>Intentos</Th>
                <Th>Rango objetivo</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={6} text="Cargando historial de ingesta..." />
              ) : jobs.length === 0 ? (
                <EmptyRow colSpan={6} text="Sin trabajos de ingesta registrados" />
              ) : jobs.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0 align-top">
                  <td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(job.createdAt)}</td>
                  <td className="p-4 text-sm font-medium text-white">{job.cloudConnectionId}</td>
                  <td className="p-4 text-sm text-zinc-300">{sourceTypeLabels[job.sourceType]}</td>
                  <td className="p-4">
                    <StatusBadge {...jobStatusStyles[job.status]} />
                    {job.status === 'FAILED' && job.errorMessage !== undefined && (
                      <p className="mt-1 text-[11px] leading-snug text-red-300/80 max-w-xs">{job.errorMessage}</p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-zinc-300">{job.attempts}/{job.maxAttempts}</td>
                  <td className="p-4 text-xs text-zinc-400">{formatDate(job.targetStart)} – {formatDate(job.targetEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">fact_check</span>
          <h3 className="text-lg font-bold text-white">Calidad de datos</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <Th>Observado</Th>
                <Th>Control</Th>
                <Th>Fuente</Th>
                <Th>Estado</Th>
                <Th>Esperado</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={5} text="Cargando controles de calidad..." />
              ) : checks.length === 0 ? (
                <EmptyRow colSpan={5} text="Sin controles de calidad registrados" />
              ) : checks.map((check) => (
                <tr key={check.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                  <td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(check.observedAt)}</td>
                  <td className="p-4 text-sm font-medium text-white">{check.checkName}</td>
                  <td className="p-4 text-sm text-zinc-300">{sourceTypeLabels[check.sourceType]}</td>
                  <td className="p-4"><StatusBadge {...qualityStatusStyles[check.status]} /></td>
                  <td className="p-4 text-xs text-zinc-400">{check.expectedAt !== undefined ? formatDateTime(check.expectedAt) : '—'}</td>
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));
}
