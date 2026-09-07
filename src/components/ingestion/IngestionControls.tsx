import type { CloudConnectionSummary, IngestionSourceType } from '../../services/api';

export function TechnicalMetricBackfillPanel({
  connections,
  connectionId,
  lookbackDays,
  windowHours,
  submitting,
  onConnectionChange,
  onLookbackDaysChange,
  onWindowHoursChange,
  onSubmit,
}: {
  readonly connections: readonly CloudConnectionSummary[];
  readonly connectionId: string;
  readonly lookbackDays: string;
  readonly windowHours: string;
  readonly submitting: boolean;
  readonly onConnectionChange: (value: string) => void;
  readonly onLookbackDaysChange: (value: string) => void;
  readonly onWindowHoursChange: (value: string) => void;
  readonly onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="ui-surface overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-tak-yellow">history</span><h3 className="text-lg font-bold text-white">Backfill histórico de métricas técnicas</h3></div>
        <span className="ui-status">máximo 90 días</span>
      </header>
      <form onSubmit={onSubmit} className="grid items-end gap-4 p-6 lg:grid-cols-[minmax(220px,1.5fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_auto]">
        <ConnectionSelect connections={connections} value={connectionId} onChange={onConnectionChange} />
        <NumberField label="Días hacia atrás" min={1} max={90} value={lookbackDays} onChange={onLookbackDaysChange} />
        <NumberField label="Ventana horas" min={1} max={24} value={windowHours} onChange={onWindowHoursChange} />
        <SubmitButton icon="cloud_download" submitting={submitting} disabled={connectionId.trim() === ''} idleLabel="Traer histórico" />
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
