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
  PENDING: { label: 'Pendiente', className: 'bg-zinc-800 text-zinc-300' }, RUNNING: { label: 'En ejecución', className: 'bg-sky-500/15 text-sky-300' }, SUCCESS: { label: 'Completado', className: 'bg-green-500/15 text-green-300' }, FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' }, CANCELLED: { label: 'Cancelado', className: 'bg-zinc-700 text-zinc-400' }, SKIPPED: { label: 'Omitido', className: 'bg-amber-500/15 text-amber-300' },
};
const qualityStyles: Readonly<Record<DataQualityStatus, { readonly label: string; readonly className: string }>> = {
  PASSED: { label: 'Aprobado', className: 'bg-green-500/15 text-green-300' }, WARNING: { label: 'Advertencia', className: 'bg-tak-yellow/15 text-tak-yellow' }, FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' },
};

export function IngestionHistoryPanel({ jobs, loading, canManage = false, includeArchived = false, onIncludeArchivedChange, onCancel, onArchive }: { readonly jobs: readonly IngestionJobHistoryItem[]; readonly loading: boolean; readonly canManage?: boolean; readonly includeArchived?: boolean; readonly onIncludeArchivedChange?: (value: boolean) => void; readonly onCancel?: (jobId: string) => void; readonly onArchive?: (jobId: string) => void }) {
  return (
    <section className="ui-surface overflow-hidden">
      <PanelHeader icon="cloud_sync" title="Historial de ingesta" actions={canManage && onIncludeArchivedChange !== undefined ? <button type="button" onClick={() => onIncludeArchivedChange(!includeArchived)} className="ui-button ui-button-secondary min-h-8 px-3 text-[10px] uppercase tracking-wide">{includeArchived ? 'Ocultar archivados' : 'Ver archivados'}</button> : undefined} />
      <div className="custom-scrollbar overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left"><thead><tr className="bg-zinc-950/50"><Th>Fecha</Th><Th>Conexión</Th><Th>Fuente</Th><Th>Estado / progreso</Th><Th>Intentos</Th><Th>Rango objetivo</Th>{canManage && <Th>Acciones</Th>}</tr></thead><tbody>
        {loading ? <EmptyRow colSpan={canManage ? 7 : 6} text="Cargando historial de ingesta..." /> : jobs.length === 0 ? <EmptyRow colSpan={canManage ? 7 : 6} text="Sin trabajos de ingesta registrados" /> : jobs.map((job) => <tr key={job.id} className="border-b border-zinc-800/50 align-top transition-colors last:border-0 hover:bg-zinc-800/50"><td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(job.createdAt)}</td><td className="p-4 text-sm font-medium text-white">{job.cloudConnectionId}</td><td className="p-4 text-sm text-zinc-300">{sourceLabels[job.sourceType]}</td><td className="p-4"><StatusBadge {...jobStyles[job.status]} />{job.sourceType === 'TECHNICAL_METRIC' && job.projectionStatus !== undefined && <ProjectionStatus status={job.projectionStatus} errorMessage={job.projectionErrorMessage} />}{job.progress !== undefined && <p className="mt-1 max-w-xs text-[11px] leading-snug text-zinc-400">{progressMessage(job.progress)}</p>}{job.resultSummary !== undefined && <p className="mt-1 max-w-xs text-[11px] leading-snug text-zinc-500">{summaryMessage(job.resultSummary)}</p>}{job.errorMessage !== undefined && <p className="mt-1 max-w-xs text-[11px] leading-snug text-red-300/80">{job.errorMessage}</p>}</td><td className="p-4 text-sm text-zinc-300">{job.attempts}/{job.maxAttempts}</td><td className="p-4 text-xs text-zinc-400">{formatDate(job.targetStart)} – {formatDate(job.targetEnd)}</td>{canManage && <td className="p-4"><div className="flex gap-2">{(job.status === 'PENDING' || job.status === 'RUNNING') && onCancel !== undefined && <button type="button" onClick={() => window.confirm('¿Cancelar este trabajo? Se conservará la trazabilidad.') && onCancel(job.id)} className="rounded border border-red-500/30 px-2 py-1 text-[10px] font-bold uppercase text-red-300 hover:bg-red-500/10">Cancelar</button>}{(['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED'] as IngestionJobStatus[]).includes(job.status) && job.archivedAt === undefined && onArchive !== undefined && <button type="button" onClick={() => window.confirm('¿Archivar este trabajo? No se borrará del historial.') && onArchive(job.id)} className="rounded border border-zinc-700 px-2 py-1 text-[10px] font-bold uppercase text-zinc-300 hover:bg-zinc-800">Archivar</button>}</div></td>}</tr>)}
      </tbody></table></div>
    </section>
  );
}

export function DataQualityPanel({ checks, loading }: { readonly checks: readonly DataQualityCheckItem[]; readonly loading: boolean }) {
  return (
    <section className="ui-surface overflow-hidden">
      <PanelHeader icon="fact_check" title="Calidad de datos" />
      <div className="custom-scrollbar overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left"><thead><tr className="bg-zinc-950/50"><Th>Observado</Th><Th>Control</Th><Th>Fuente</Th><Th>Estado</Th><Th>Esperado</Th></tr></thead><tbody>
        {loading ? <EmptyRow colSpan={5} text="Cargando controles de calidad..." /> : checks.length === 0 ? <EmptyRow colSpan={5} text="Sin controles de calidad registrados" /> : checks.map((check) => <tr key={check.id} className="border-b border-zinc-800/50 transition-colors last:border-0 hover:bg-zinc-800/50"><td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(check.observedAt)}</td><td className="p-4 text-sm font-medium text-white">{check.checkName}</td><td className="p-4 text-sm text-zinc-300">{sourceLabels[check.sourceType]}</td><td className="p-4"><StatusBadge {...qualityStyles[check.status]} /></td><td className="p-4 text-xs text-zinc-400">{check.expectedAt !== undefined ? formatDateTime(check.expectedAt) : '—'}</td></tr>)}
      </tbody></table></div>
    </section>
  );
}

function PanelHeader({ icon, title, actions }: { readonly icon: string; readonly title: string; readonly actions?: React.ReactNode }) { return <header className="flex items-center gap-2 border-b border-zinc-800 p-6"><span className="material-symbols-outlined text-tak-yellow">{icon}</span><h3 className="text-lg font-bold text-white">{title}</h3>{actions !== undefined && <div className="ml-auto">{actions}</div>}</header>; }
function Th({ children }: { readonly children: React.ReactNode }) { return <th className="border-b border-zinc-800 p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{children}</th>; }
function EmptyRow({ colSpan, text }: { readonly colSpan: number; readonly text: string }) { return <tr><td colSpan={colSpan} className="p-6 text-center text-sm font-bold text-zinc-500">{text}</td></tr>; }
function StatusBadge({ label, className }: { readonly label: string; readonly className: string }) { return <span className={`inline-block w-fit rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>{label}</span>; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function formatDate(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value)); }
function progressMessage(progress: Readonly<Record<string, unknown>>): string {
  const phase = typeof progress['phase'] === 'string' ? progress['phase'] : 'EN_PROCESO';
  const message = typeof progress['message'] === 'string' ? progress['message'] : '';
  const completed = typeof progress['completed'] === 'number' && typeof progress['total'] === 'number' ? ` (${progress['completed']}/${progress['total']})` : '';
  return `${message || phase}${completed}`;
}
function summaryMessage(summary: Readonly<Record<string, unknown>>): string {
  const pieces = ['metricSamples', 'metricSamplesInserted', 'focusRowsInserted', 'resources', 'apiCallCount'].flatMap((key) => typeof summary[key] === 'number' ? [`${key}: ${summary[key]}`] : []);
  return pieces.join(' · ');
}

function ProjectionStatus({ status, errorMessage }: { readonly status: NonNullable<IngestionJobHistoryItem['projectionStatus']>; readonly errorMessage?: string }): React.ReactNode {
  const copy: Readonly<Record<typeof status, string>> = {
    NOT_REQUIRED: 'Proyección no requerida',
    PENDING: 'Proyección en cola',
    RUNNING: 'Proyección en curso',
    SUCCESS: 'Proyección lista',
    FAILED: 'Proyección pendiente de revisión',
  };
  const tone = status === 'SUCCESS' ? 'text-emerald-300' : status === 'FAILED' ? 'text-amber-300' : 'text-sky-300';
  return <p className={`mt-1 text-[11px] ${tone}`}>{copy[status]}{status === 'FAILED' && errorMessage !== undefined ? ` · ${errorMessage}` : ''}</p>;
}
