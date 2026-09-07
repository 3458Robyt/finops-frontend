import type { BillingSourceMode, CloudConnectionSummary } from '../../services/api';

export interface FocusFormState {
  readonly connectionId: string;
  readonly mode: 'location' | 'object';
  readonly bucket: string;
  readonly prefix: string;
  readonly objectKey: string;
  readonly namespace: string;
  readonly region: string;
  readonly version: string;
  readonly maxObjects: string;
  readonly replace: boolean;
}

export default function BillingSourcePanel({
  connections,
  provider,
  billingSourceMode,
  focus,
  configuringBillingSource,
  configuringFocus,
  onBillingSourceModeChange,
  onFocusChange,
  onBillingSubmit,
  onFocusSubmit,
}: {
  readonly connections: readonly CloudConnectionSummary[];
  readonly provider?: string;
  readonly billingSourceMode: BillingSourceMode;
  readonly focus: FocusFormState;
  readonly configuringBillingSource: boolean;
  readonly configuringFocus: boolean;
  readonly onBillingSourceModeChange: (value: BillingSourceMode) => void;
  readonly onFocusChange: (patch: Partial<FocusFormState>) => void;
  readonly onBillingSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  readonly onFocusSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="ui-surface overflow-hidden">
      <header className="flex items-center gap-2 border-b border-zinc-800 p-6"><span className="material-symbols-outlined text-tak-yellow">folder_managed</span><h3 className="text-lg font-bold text-white">Fuente de facturación</h3></header>
      <form onSubmit={onBillingSubmit} className="border-b border-zinc-800 p-6">
        <div className="grid items-end gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]">
          <ConnectionSelect connections={connections} value={focus.connectionId} onChange={(connectionId) => onFocusChange({ connectionId })} />
          <label className="space-y-2"><FieldLabel>Origen</FieldLabel><select value={billingSourceMode} onChange={(event) => onBillingSourceModeChange(event.target.value as BillingSourceMode)} className={inputClassName}><option value="AUTO">Automático: FOCUS si está configurado; API directa si no</option><option value="FOCUS">Solo exportación FOCUS</option><option value="PROVIDER_API">Solo API del proveedor</option></select></label>
          <button type="submit" disabled={configuringBillingSource || focus.connectionId.trim() === ''} className={buttonClassName}>{configuringBillingSource ? 'Guardando' : 'Guardar origen'}</button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">Cada trabajo conserva una sola procedencia. FOCUS solo se usa cuando el origen lo permite y existe un export válido.</p>
      </form>

      <form onSubmit={onFocusSubmit} className="space-y-4 p-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="space-y-2 lg:col-span-2"><FieldLabel>Conexión</FieldLabel><ConnectionSelectBare connections={connections} value={focus.connectionId} onChange={(connectionId) => onFocusChange({ connectionId })} /></label>
          <label className="space-y-2"><FieldLabel>Modo</FieldLabel><select value={focus.mode} onChange={(event) => onFocusChange({ mode: event.target.value as FocusFormState['mode'] })} className={inputClassName}><option value="location">Prefijo</option><option value="object">Objeto directo</option></select></label>
          <label className="ui-surface-raised flex items-end gap-3 px-3 py-2"><input type="checkbox" checked={focus.replace} onChange={(event) => onFocusChange({ replace: event.target.checked })} className="h-4 w-4 accent-tak-yellow" /><span className="text-sm font-bold text-zinc-300">Reemplazar lista</span></label>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {provider === 'oci' && <TextField label="Namespace OCI" value={focus.namespace} onChange={(namespace) => onFocusChange({ namespace })} required />}
          <TextField label={provider === 'aws' ? 'Bucket S3' : 'Bucket OCI'} value={focus.bucket} onChange={(bucket) => onFocusChange({ bucket })} required />
          <TextField className="lg:col-span-2" label={focus.mode === 'location' ? 'Prefijo' : 'Objeto'} value={focus.mode === 'location' ? focus.prefix : focus.objectKey} onChange={(value) => onFocusChange(focus.mode === 'location' ? { prefix: value } : { objectKey: value })} required />
          {provider === 'aws' && <TextField label="Región" value={focus.region} onChange={(region) => onFocusChange({ region })} />}
          <TextField label="FOCUS" value={focus.version} onChange={(version) => onFocusChange({ version })} required />
          {focus.mode === 'location' && <label className="space-y-2"><FieldLabel>Máximo de objetos</FieldLabel><input type="number" min="1" max="1000" value={focus.maxObjects} onChange={(event) => onFocusChange({ maxObjects: event.target.value })} className={inputClassName} required /></label>}
        </div>
        <button type="submit" disabled={configuringFocus || focus.connectionId.trim() === ''} className={`${buttonClassName} gap-2`}><span className="material-symbols-outlined text-[20px]">save</span>{configuringFocus ? 'Guardando' : 'Guardar fuente FOCUS'}</button>
      </form>
    </section>
  );
}

function ConnectionSelect({ connections, value, onChange }: { readonly connections: readonly CloudConnectionSummary[]; readonly value: string; readonly onChange: (value: string) => void }) { return <label className="space-y-2"><FieldLabel>Conexión</FieldLabel><ConnectionSelectBare connections={connections} value={value} onChange={onChange} /></label>; }
function ConnectionSelectBare({ connections, value, onChange }: { readonly connections: readonly CloudConnectionSummary[]; readonly value: string; readonly onChange: (value: string) => void }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} required>{connections.length === 0 ? <option value="">Sin conexiones activas</option> : connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name} · {connection.providerCode.toUpperCase()}</option>)}</select>; }
function TextField({ label, value, onChange, required = false, className = '' }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void; readonly required?: boolean; readonly className?: string }) { return <label className={`space-y-2 ${className}`}><FieldLabel>{label}</FieldLabel><input value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} required={required} /></label>; }
function FieldLabel({ children }: { readonly children: React.ReactNode }) { return <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">{children}</span>; }

const inputClassName = 'ui-control w-full px-3 py-2 text-sm font-medium outline-none';
const buttonClassName = 'ui-button ui-button-secondary h-10 disabled:cursor-not-allowed disabled:opacity-60';
