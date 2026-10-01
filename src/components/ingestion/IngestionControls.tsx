import type { CloudConnectionSummary, IngestionSourceType } from '../../services/api';

export function TechnicalMetricBackfillPanel({
  connections,
  connectionId,
  lookbackDays,
  windowHours,
  targeted, resourceId, regionId, namespace, metricName,
  submitting,
  onConnectionChange,
  onLookbackDaysChange,
  onWindowHoursChange,
  onTargetedChange, onResourceIdChange, onRegionIdChange, onNamespaceChange, onMetricNameChange,
  onSubmit,
}: {
  readonly connections: readonly CloudConnectionSummary[];
  readonly connectionId: string;
  readonly lookbackDays: string;
  readonly windowHours: string;
  readonly targeted: boolean;
  readonly resourceId: string;
  readonly regionId: string;
  readonly namespace: string;
  readonly metricName: 'CpuUtilization' | 'MemoryUtilization';
  readonly submitting: boolean;
  readonly onConnectionChange: (value: string) => void;
  readonly onLookbackDaysChange: (value: string) => void;
  readonly onWindowHoursChange: (value: string) => void;
  readonly onTargetedChange: (value: boolean) => void;
  readonly onResourceIdChange: (value: string) => void;
  readonly onRegionIdChange: (value: string) => void;
  readonly onNamespaceChange: (value: string) => void;
  readonly onMetricNameChange: (value: 'CpuUtilization' | 'MemoryUtilization') => void;
  readonly onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="ui-surface overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-tak-yellow">history</span><h3 className="text-lg font-bold text-white">Backfill histórico de métricas técnicas</h3></div>
        <span className="ui-status">máximo 90 días</span>
      </header>
      <form onSubmit={onSubmit} className="space-y-4 p-6">
        <div className="grid items-end gap-4 lg:grid-cols-[minmax(220px,1.5fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_auto]">
          <ConnectionSelect connections={connections} value={connectionId} onChange={onConnectionChange} />
          <NumberField label="Días hacia atrás" min={1} max={90} value={lookbackDays} onChange={onLookbackDaysChange} />
          <NumberField label="Ventana horas" min={1} max={24} value={windowHours} onChange={onWindowHoursChange} />
          <SubmitButton icon="cloud_download" submitting={submitting} disabled={connectionId.trim() === ''} idleLabel={targeted ? 'Traer serie' : 'Traer histórico'} />
        </div>
        {connections.find((item) => item.id === connectionId)?.providerCode.toLowerCase() === 'oci' && (
          <div className="rounded-lg border border-zinc-800 p-3">
            <label className="flex items-center gap-2 text-sm text-zinc-200"><input type="checkbox" checked={targeted} onChange={(event) => onTargetedChange(event.target.checked)} /> Recuperar solo una serie OCI confirmada</label>
            {targeted && <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-zinc-300">Métrica<select className={inputClassName} value={metricName} onChange={(event) => onMetricNameChange(event.target.value as 'CpuUtilization' | 'MemoryUtilization')}><option value="MemoryUtilization">Memoria</option><option value="CpuUtilization">CPU</option></select></label>
              <label className="text-xs text-zinc-300">Namespace<input className={inputClassName} value={namespace} onChange={(event) => onNamespaceChange(event.target.value)} required /></label>
              <label className="text-xs text-zinc-300">OCID del recurso<input className={inputClassName} value={resourceId} onChange={(event) => onResourceIdChange(event.target.value)} required /></label>
              <label className="text-xs text-zinc-300">Región OCI<input className={inputClassName} value={regionId} onChange={(event) => onRegionIdChange(event.target.value)} required /></label>
              <p className="md:col-span-2 text-xs text-zinc-500">La serie debe estar descubierta y habilitada. Esta operación solo descarga datos que OCI ya emite; no activa el agente de la instancia.</p>
            </div>}
          </div>
        )}
      </form>
      <p className="border-t border-zinc-800 px-6 py-4 text-xs font-medium leading-relaxed text-zinc-500">Crea trabajos diarios desde la retención disponible del proveedor. Omite ventanas ya cubiertas por jobs pendientes, en ejecución o exitosos.</p>
    </section>
  );
}

export function QueueIngestionPanel({
  connections,
  connectionId,
  sourceType,
  targetStart,
  targetEnd,
  submitting,
  onConnectionChange,
  onSourceTypeChange,
  onTargetStartChange,
  onTargetEndChange,
  onSubmit,
}: {
  readonly connections: readonly CloudConnectionSummary[];
  readonly connectionId: string;
  readonly sourceType: IngestionSourceType;
  readonly targetStart: string;
  readonly targetEnd: string;
  readonly submitting: boolean;
  readonly onConnectionChange: (value: string) => void;
  readonly onSourceTypeChange: (value: IngestionSourceType) => void;
  readonly onTargetStartChange: (value: string) => void;
  readonly onTargetEndChange: (value: string) => void;
  readonly onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="ui-surface overflow-hidden">
      <header className="flex items-center gap-2 border-b border-zinc-800 p-6"><span className="material-symbols-outlined text-tak-yellow">playlist_add</span><h3 className="text-lg font-bold text-white">Crear trabajo de ingesta</h3></header>
      <form onSubmit={onSubmit} className="grid items-end gap-4 p-6 lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,0.9fr)_minmax(190px,1fr)_minmax(190px,1fr)_auto]">
        <ConnectionSelect connections={connections} value={connectionId} onChange={onConnectionChange} />
        <label className="space-y-2"><FieldLabel>Fuente</FieldLabel><select value={sourceType} onChange={(event) => onSourceTypeChange(event.target.value as IngestionSourceType)} className={inputClassName}><option value="TECHNICAL_METRIC">Métrica técnica</option><option value="BILLING_EXPORT">Facturación</option><option value="INVENTORY">Inventario</option></select></label>
        <DateTimeField label="Inicio" value={targetStart} onChange={onTargetStartChange} />
        <DateTimeField label="Fin" value={targetEnd} onChange={onTargetEndChange} />
        <SubmitButton icon="add_task" submitting={submitting} disabled={connectionId.trim() === ''} idleLabel="Encolar" accent />
      </form>
    </section>
  );
}

function ConnectionSelect({ connections, value, onChange }: { readonly connections: readonly CloudConnectionSummary[]; readonly value: string; readonly onChange: (value: string) => void }) { return <label className="space-y-2"><FieldLabel>Conexión</FieldLabel><select value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} required>{connections.length === 0 ? <option value="">Sin conexiones activas</option> : connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name} · {connection.providerCode.toUpperCase()}</option>)}</select></label>; }
function NumberField({ label, min, max, value, onChange }: { readonly label: string; readonly min: number; readonly max: number; readonly value: string; readonly onChange: (value: string) => void }) { return <label className="space-y-2"><FieldLabel>{label}</FieldLabel><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} required /></label>; }
function DateTimeField({ label, value, onChange }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void }) { return <label className="space-y-2"><FieldLabel>{label}</FieldLabel><input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} required /></label>; }
function FieldLabel({ children }: { readonly children: React.ReactNode }) { return <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">{children}</span>; }
function SubmitButton({ icon, submitting, disabled, idleLabel, accent = false }: { readonly icon: string; readonly submitting: boolean; readonly disabled: boolean; readonly idleLabel: string; readonly accent?: boolean }) { return <button type="submit" disabled={submitting || disabled} className={`ui-button ${accent ? 'ui-button-primary' : 'ui-button-secondary'} h-10 disabled:cursor-not-allowed disabled:opacity-60`}><span className="material-symbols-outlined text-[20px]">{icon}</span>{submitting ? 'Encolando' : idleLabel}</button>; }

const inputClassName = 'ui-control w-full px-3 py-2 text-sm font-medium outline-none';
