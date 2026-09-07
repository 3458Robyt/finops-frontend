import type {
  IngestionOperationalReadiness,
  IngestionReadinessConnectionSummary,
  IngestionReadinessIssue,
} from '../../services/api';

const severityStyles: Readonly<Record<IngestionReadinessIssue['severity'], { readonly label: string; readonly className: string }>> = {
  INFO: { label: 'Info', className: 'bg-sky-500/15 text-sky-300' },
  WARNING: { label: 'Advertencia', className: 'bg-tak-yellow/15 text-tak-yellow' },
  BLOCKER: { label: 'Bloqueante', className: 'bg-red-500/15 text-red-300' },
};

export default function IngestionReadinessPanel({
  ok,
  generatedAt,
  connections,
  issues,
  operational,
  loading,
}: {
  readonly ok: boolean;
  readonly generatedAt: string | null;
  readonly connections: readonly IngestionReadinessConnectionSummary[];
  readonly issues: readonly IngestionReadinessIssue[];
  readonly operational: IngestionOperationalReadiness | null;
  readonly loading: boolean;
}) {
  return (
    <section className="ui-surface overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">health_and_safety</span>
          <h3 className="text-lg font-bold text-white">Preparación de ingesta productiva</h3>
        </div>
        <StatusBadge
          label={ok ? 'Listo sin bloqueantes' : 'Requiere atención'}
          className={ok ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}
        />
      </header>
      <div className="grid gap-4 p-6 lg:grid-cols-[1.2fr_1fr]">
        {operational !== null && <OperationalStatus operational={operational} />}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Conexiones evaluadas {generatedAt !== null ? `· ${formatDateTime(generatedAt)}` : ''}
          </p>
          {loading ? <Empty text="Cargando preparación..." /> : connections.length === 0
            ? <Empty text="Sin conexiones AWS/OCI activas para evaluar." />
            : connections.map((connection) => (
              <article key={connection.id} className="ui-surface-raised p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="text-sm font-black text-white">{connection.name}</p><p className="text-xs font-medium text-zinc-500">{connection.providerCode.toUpperCase()} · {connection.defaultRegion ?? 'Sin región por defecto'}</p></div>
                  <p className="text-xs font-bold text-zinc-400">{connection.recentJobs.length} jobs recientes</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ReadinessLine label="Credenciales" value={connection.credentialPurposes.length > 0 ? connection.credentialPurposes.join(', ') : 'Sin credenciales activas'} />
                  <ReadinessLine label="Metadata" value={formatMetadataCounts(connection.metadataCounts)} />
                </div>
              </article>
            ))}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Hallazgos</p>
          {loading ? <Empty text="Cargando hallazgos..." /> : issues.length === 0
            ? <p className="text-sm font-medium text-green-300">No hay bloqueantes ni advertencias registradas.</p>
            : issues.map((issue, index) => (
              <article key={`${issue.provider}-${issue.severity}-${index}`} className="ui-surface-raised p-4">
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-widest text-zinc-500">{issue.provider.toUpperCase()}</p><StatusBadge {...severityStyles[issue.severity]} /></div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-300">{issue.message}</p>
                <p className="mt-2 text-xs text-zinc-500">Afecta: {issue.affectedData.join(', ')}.</p>
                <p className="mt-1 text-xs font-semibold text-tak-yellow">Siguiente acción: {issue.action}</p>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}

function OperationalStatus({ operational }: { readonly operational: IngestionOperationalReadiness }) {
  const labels: Readonly<Record<IngestionOperationalReadiness['state'], string>> = {
    IDLE: 'Sin trabajos activos',
    WAITING_FOR_WORKER: 'En espera del worker',
    QUEUED: 'Trabajos en cola',
    RUNNING: 'Procesando trabajos',
    CANCEL_REQUESTED: 'Cancelación en curso',
    STALE: 'Trabajo posiblemente congelado',
  };
  const tone = operational.state === 'STALE' || operational.state === 'WAITING_FOR_WORKER' ? 'border-red-500/30 bg-red-500/10' : 'border-zinc-800 bg-zinc-950/60';
  return <article className={`rounded-2xl border p-4 lg:col-span-2 ${tone}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-widest text-zinc-500">Estado operativo de ingesta</p><p className="mt-1 text-sm font-bold text-white">{labels[operational.state]}</p></div>
      <StatusBadge label={operational.worker.available ? 'Worker activo' : 'Worker no detectado'} className={operational.worker.available ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'} />
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-400 sm:grid-cols-4">
      <ReadinessLine label="Pendientes" value={String(operational.queue.pending)} />
      <ReadinessLine label="Ejecutando" value={String(operational.queue.running)} />
      <ReadinessLine label="Cancelando" value={String(operational.queue.cancelRequested)} />
      <ReadinessLine label="Stale" value={String(operational.queue.staleRunning)} />
    </div>
    {operational.state === 'WAITING_FOR_WORKER' && <p className="mt-3 text-xs font-semibold text-red-300">Los trabajos no están lentos: no hay un proceso worker reclamándolos. Usa el comando local unificado.</p>}
  </article>;
}

function Empty({ text }: { readonly text: string }) { return <p className="text-sm font-medium text-zinc-500">{text}</p>; }
function StatusBadge({ label, className }: { readonly label: string; readonly className: string }) { return <span className={`inline-block w-fit rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>{label}</span>; }
function ReadinessLine({ label, value }: { readonly label: string; readonly value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-1 text-xs font-medium text-zinc-300">{value}</p></div>; }
function formatMetadataCounts(counts: Readonly<Record<string, number>>): string { const entries = Object.entries(counts); return entries.length === 0 ? 'Sin metadata' : entries.map(([key, value]) => `${key}: ${value}`).join(' · '); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
