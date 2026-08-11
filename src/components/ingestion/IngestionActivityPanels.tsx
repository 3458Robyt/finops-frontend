import type {
  DataQualityCheckItem,
  DataQualityStatus,
  IngestionJobHistoryItem,
  IngestionJobStatus,
  IngestionSourceType,
} from '../../services/api';

const sourceLabels: Readonly<Record<IngestionSourceType, string>> = {
  BILLING_EXPORT: 'Facturación', INVENTORY: 'Inventario', TECHNICAL_METRIC: 'Métrica técnica', AGENT_METRIC: 'Métrica de agente',
};
const jobStyles: Readonly<Record<IngestionJobStatus, { readonly label: string; readonly className: string }>> = {
  PENDING: { label: 'Pendiente', className: 'bg-zinc-800 text-zinc-300' }, RUNNING: { label: 'En ejecución', className: 'bg-sky-500/15 text-sky-300' }, SUCCESS: { label: 'Completado', className: 'bg-green-500/15 text-green-300' }, FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' }, CANCELLED: { label: 'Cancelado', className: 'bg-zinc-700 text-zinc-400' },
};
const qualityStyles: Readonly<Record<DataQualityStatus, { readonly label: string; readonly className: string }>> = {
  PASSED: { label: 'Aprobado', className: 'bg-green-500/15 text-green-300' }, WARNING: { label: 'Advertencia', className: 'bg-tak-yellow/15 text-tak-yellow' }, FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' },
};

export function IngestionHistoryPanel({ jobs, loading }: { readonly jobs: readonly IngestionJobHistoryItem[]; readonly loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <PanelHeader icon="cloud_sync" title="Historial de ingesta" />
      <div className="custom-scrollbar overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="bg-zinc-950/50"><Th>Fecha</Th><Th>Conexión</Th><Th>Fuente</Th><Th>Estado</Th><Th>Intentos</Th><Th>Rango objetivo</Th></tr></thead><tbody>
        {loading ? <EmptyRow colSpan={6} text="Cargando historial de ingesta..." /> : jobs.length === 0 ? <EmptyRow colSpan={6} text="Sin trabajos de ingesta registrados" /> : jobs.map((job) => <tr key={job.id} className="border-b border-zinc-800/50 align-top transition-colors last:border-0 hover:bg-zinc-800/50"><td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(job.createdAt)}</td><td className="p-4 text-sm font-medium text-white">{job.cloudConnectionId}</td><td className="p-4 text-sm text-zinc-300">{sourceLabels[job.sourceType]}</td><td className="p-4"><StatusBadge {...jobStyles[job.status]} />{job.status === 'FAILED' && job.errorMessage !== undefined && <p className="mt-1 max-w-xs text-[11px] leading-snug text-red-300/80">{job.errorMessage}</p>}</td><td className="p-4 text-sm text-zinc-300">{job.attempts}/{job.maxAttempts}</td><td className="p-4 text-xs text-zinc-400">{formatDate(job.targetStart)} – {formatDate(job.targetEnd)}</td></tr>)}
      </tbody></table></div>
    </section>
  );
}

export function DataQualityPanel({ checks, loading }: { readonly checks: readonly DataQualityCheckItem[]; readonly loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <PanelHeader icon="fact_check" title="Calidad de datos" />
      <div className="custom-scrollbar overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left"><thead><tr className="bg-zinc-950/50"><Th>Observado</Th><Th>Control</Th><Th>Fuente</Th><Th>Estado</Th><Th>Esperado</Th></tr></thead><tbody>
        {loading ? <EmptyRow colSpan={5} text="Cargando controles de calidad..." /> : checks.length === 0 ? <EmptyRow colSpan={5} text="Sin controles de calidad registrados" /> : checks.map((check) => <tr key={check.id} className="border-b border-zinc-800/50 transition-colors last:border-0 hover:bg-zinc-800/50"><td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(check.observedAt)}</td><td className="p-4 text-sm font-medium text-white">{check.checkName}</td><td className="p-4 text-sm text-zinc-300">{sourceLabels[check.sourceType]}</td><td className="p-4"><StatusBadge {...qualityStyles[check.status]} /></td><td className="p-4 text-xs text-zinc-400">{check.expectedAt !== undefined ? formatDateTime(check.expectedAt) : '—'}</td></tr>)}
      </tbody></table></div>
    </section>
  );
}

function PanelHeader({ icon, title }: { readonly icon: string; readonly title: string }) { return <header className="flex items-center gap-2 border-b border-zinc-800 p-6"><span className="material-symbols-outlined text-tak-yellow">{icon}</span><h3 className="text-lg font-bold text-white">{title}</h3></header>; }
function Th({ children }: { readonly children: React.ReactNode }) { return <th className="border-b border-zinc-800 p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{children}</th>; }
function EmptyRow({ colSpan, text }: { readonly colSpan: number; readonly text: string }) { return <tr><td colSpan={colSpan} className="p-6 text-center text-sm font-bold text-zinc-500">{text}</td></tr>; }
function StatusBadge({ label, className }: { readonly label: string; readonly className: string }) { return <span className={`inline-block w-fit rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>{label}</span>; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function formatDate(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value)); }
