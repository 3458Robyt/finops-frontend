import type { MasterAdminTenant, MasterAdminIngestionJob } from '../../services/types/admin';
import type { IngestionJobStatus, IngestionSourceType } from '../../services/types/ingestion';
import { useMasterAdminIngestionJobsController } from './useMasterAdminIngestionJobsController';

interface Props { readonly tenants: readonly MasterAdminTenant[]; }

const statusLabels: Record<IngestionJobStatus, string> = { PENDING: 'Pendiente', RUNNING: 'Ejecutando', SUCCESS: 'Exitoso', FAILED: 'Fallido', CANCELLED: 'Cancelado', SKIPPED: 'Omitido' };
const sourceLabels: Record<IngestionSourceType, string> = { INVENTORY: 'Inventario', BILLING_EXPORT: 'Facturación', TECHNICAL_METRIC: 'Métricas técnicas', AGENT_METRIC: 'Métricas del agente' };

export default function MasterAdminIngestionJobsPanel({ tenants }: Props) {
  const controller = useMasterAdminIngestionJobsController();
  const { jobs, summary, loading, saving, message, error } = controller;

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <header className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-tak-yellow">monitoring</span><h2 className="text-sm font-black uppercase tracking-widest text-white">Consola central de jobs</h2></div>
          <p className="mt-1 text-xs text-zinc-500">Administra la cola de todos los tenants sin cambiar de cuenta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void controller.reload()} disabled={loading || saving} className="rounded border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-300 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-50">Actualizar</button>
          <button type="button" onClick={() => controller.setIncludeArchived(!controller.includeArchived)} className="rounded border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-300 hover:border-tak-yellow hover:text-tak-yellow">{controller.includeArchived ? 'Ocultar archivados' : 'Ver archivados'}</button>
          <button type="button" onClick={() => { if (summary.pending > 0 && window.confirm(`Se eliminarán físicamente ${summary.pending} jobs pendientes de todos los tenants. Esta acción no se puede deshacer. ¿Continuar?`)) void controller.purgePending(); }} disabled={saving || summary.pending === 0} className="rounded border border-red-500/40 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-red-200 hover:bg-red-500/10 disabled:opacity-50">Eliminar pendientes ({summary.pending})</button>
        </div>
      </header>

      {(message !== null || error !== null) && <div className={`border-b px-5 py-3 text-sm font-bold ${error !== null ? 'border-red-500/20 bg-red-500/10 text-red-200' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'}`}>{error ?? message}</div>}
      <div className="grid grid-cols-2 gap-3 border-b border-zinc-800 p-5 sm:grid-cols-4 xl:grid-cols-7">
        <Summary label="Total" value={summary.total} /><Summary label="Pendientes" value={summary.pending} tone="text-tak-yellow" /><Summary label="Ejecutando" value={summary.running} tone="text-blue-300" /><Summary label="Fallidos" value={summary.failed} tone="text-red-300" /><Summary label="Exitosos" value={summary.success} tone="text-emerald-300" /><Summary label="Cancelados" value={summary.cancelled} /><Summary label="Omitidos" value={summary.skipped} />
      </div>
      <div className="grid gap-3 border-b border-zinc-800 p-5 md:grid-cols-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tenant<select value={controller.tenantId} onChange={(event) => controller.setTenantId(event.target.value)} className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-200"><option value="">Todos los tenants</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado<select value={controller.status} onChange={(event) => controller.setStatus(event.target.value as IngestionJobStatus | '')} className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-200"><option value="">Todos los estados</option>{Object.keys(statusLabels).map((status) => <option key={status} value={status}>{statusLabels[status as IngestionJobStatus]}</option>)}</select></label>
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fuente<select value={controller.sourceType} onChange={(event) => controller.setSourceType(event.target.value as IngestionSourceType | '')} className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-200"><option value="">Todas las fuentes</option>{Object.keys(sourceLabels).map((source) => <option key={source} value={source}>{sourceLabels[source as IngestionSourceType]}</option>)}</select></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1160px] border-collapse text-left"><thead><tr className="bg-zinc-900/70 text-[10px] uppercase tracking-widest text-zinc-500"><th className="px-5 py-3">Tenant / conexión</th><th className="px-5 py-3">Fuente</th><th className="px-5 py-3">Estado / progreso</th><th className="px-5 py-3">Rango</th><th className="px-5 py-3">Creado</th><th className="px-5 py-3">Acción</th></tr></thead><tbody className="divide-y divide-zinc-900">{loading ? <Empty text="Cargando consola global..." /> : jobs.length === 0 ? <Empty text="No hay jobs para los filtros seleccionados." /> : jobs.map((job) => <JobRow key={job.id} job={job} saving={saving} onCancel={controller.cancel} onArchive={controller.archive} />)}</tbody></table></div>
      {controller.hasMore && <p className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-500">Se muestran los 100 jobs más recientes. Usa los filtros para acotar la consulta.</p>}
    </section>
  );
}

function Summary({ label, value, tone = 'text-white' }: { readonly label: string; readonly value: number; readonly tone?: string }) { return <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p><p className={`mt-1 text-xl font-black ${tone}`}>{value}</p></div>; }
function Empty({ text }: { readonly text: string }) { return <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-bold text-zinc-500">{text}</td></tr>; }
function JobRow({ job, saving, onCancel, onArchive }: { readonly job: MasterAdminIngestionJob; readonly saving: boolean; readonly onCancel: (id: string) => Promise<void>; readonly onArchive: (id: string) => Promise<void> }) {
  const terminal = ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED'].includes(job.status);
  return <tr className="align-top text-sm text-zinc-300 hover:bg-zinc-900/50"><td className="px-5 py-4"><p className="font-bold text-white">{job.tenantName}</p><p className="text-xs text-zinc-500">{job.connectionName} · {job.providerCode.toUpperCase()}</p></td><td className="px-5 py-4 text-xs">{sourceLabels[job.sourceType]}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(job.status)}`}>{statusLabels[job.status]}</span>{job.sourceType === 'TECHNICAL_METRIC' && job.projectionStatus !== undefined && <p className={`mt-1 text-[11px] ${projectionTone(job.projectionStatus)}`}>{projectionLabel(job.projectionStatus)}</p>}<p className="mt-1 max-w-[260px] text-[11px] text-zinc-500">{progressText(job.progress) ?? job.errorMessage ?? 'Sin detalle adicional'}</p></td><td className="px-5 py-4 text-xs text-zinc-500">{formatDate(job.targetStart)} – {formatDate(job.targetEnd)}</td><td className="px-5 py-4 text-xs text-zinc-500">{formatDateTime(job.createdAt)}</td><td className="px-5 py-4"><div className="flex gap-2">{(job.status === 'PENDING' || job.status === 'RUNNING') && <button type="button" disabled={saving} onClick={() => { if (window.confirm('¿Cancelar este job? Se conservará su trazabilidad.')) void onCancel(job.id); }} className="rounded border border-red-500/30 px-2 py-1 text-[10px] font-black uppercase text-red-200 disabled:opacity-50">Cancelar</button>}{terminal && job.archivedAt === undefined && <button type="button" disabled={saving} onClick={() => { if (window.confirm('¿Archivar este job? No se eliminará.')) void onArchive(job.id); }} className="rounded border border-zinc-700 px-2 py-1 text-[10px] font-black uppercase text-zinc-300 disabled:opacity-50">Archivar</button>}</div></td></tr>;
}
function statusTone(status: IngestionJobStatus): string { return status === 'SUCCESS' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : status === 'FAILED' ? 'border-red-500/30 bg-red-500/10 text-red-300' : status === 'RUNNING' ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : status === 'PENDING' ? 'border-tak-yellow/30 bg-tak-yellow/10 text-tak-yellow' : 'border-zinc-700 bg-zinc-800 text-zinc-300'; }
function progressText(progress: Readonly<Record<string, unknown>> | undefined): string | undefined { if (progress === undefined) return undefined; return typeof progress['message'] === 'string' ? progress['message'] : typeof progress['phase'] === 'string' ? progress['phase'] : undefined; }
function projectionLabel(status: NonNullable<MasterAdminIngestionJob['projectionStatus']>): string { return ({ NOT_REQUIRED: 'Proyección no requerida', PENDING: 'Proyección en cola', RUNNING: 'Proyección en curso', SUCCESS: 'Proyección lista', FAILED: 'Proyección pendiente de revisión' })[status]; }
function projectionTone(status: NonNullable<MasterAdminIngestionJob['projectionStatus']>): string { return status === 'SUCCESS' ? 'text-emerald-300' : status === 'FAILED' ? 'text-amber-300' : 'text-sky-300'; }
function formatDate(value: string): string { return new Date(value).toLocaleDateString('es-CO'); }
function formatDateTime(value: string): string { return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }); }
