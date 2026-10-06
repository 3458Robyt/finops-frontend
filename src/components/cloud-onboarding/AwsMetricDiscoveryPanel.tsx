import { useEffect, useMemo, useRef, useState } from 'react';
import { configureCloudMetricDefinitions, previewCloudMetricDefinitions } from '../../services/api';
import type { CloudMetricDefinitionCandidate, CloudMetricDiscovery } from '../../services/api';
import { Field, inputClass, secondaryButton } from './CloudOnboardingUi';
import { readCloudOnboardingError } from './cloudOnboardingUtils';

const MAX_SELECTED = 100;

export function AwsMetricDiscoveryPanel({ token, cloudConnectionId, accountId, defaultRegion, onSaved }: {
  readonly token: string;
  readonly cloudConnectionId: string;
  readonly accountId: string;
  readonly defaultRegion: string;
  readonly onSaved: () => Promise<void>;
}) {
  const [regionId, setRegionId] = useState(defaultRegion);
  const [namespace, setNamespace] = useState('');
  const [discovery, setDiscovery] = useState<CloudMetricDiscovery | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<'preview' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    controllerRef.current?.abort();
    setRegionId(defaultRegion); setDiscovery(null); setSelected(new Set()); setBusy(null); setError(null); setNotice(null);
    return () => controllerRef.current?.abort();
  }, [cloudConnectionId, defaultRegion, token]);

  const selectedDefinitions = useMemo(() => (discovery?.definitions ?? []).filter((item) => selected.has(key(item))), [discovery, selected]);
  const preview = async () => {
    if (busy !== null) return;
    const controller = new AbortController(); controllerRef.current = controller;
    setBusy('preview'); setError(null); setNotice(null); setSelected(new Set());
    try {
      const response = await previewCloudMetricDefinitions(token, cloudConnectionId, {
        regionId: regionId.trim(), compartmentId: accountId,
        ...(namespace.trim() ? { namespace: namespace.trim() } : {}),
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setDiscovery(response.discovery);
      setNotice(`${response.discovery.definitions.length} series encontradas en ${response.discovery.apiCallCount} llamadas CloudWatch. Consulta de solo lectura.`);
    } catch (cause: unknown) {
      if (!controller.signal.aborted) { setDiscovery(null); setError(readCloudOnboardingError(cause, 'No se pudieron descubrir las métricas AWS.')); }
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setBusy(null); }
    }
  };
  const save = async () => {
    if (busy !== null || selectedDefinitions.length === 0) return;
    setBusy('save'); setError(null); setNotice(null);
    try {
      const response = await configureCloudMetricDefinitions(token, cloudConnectionId, {
        definitions: selectedDefinitions.map((item) => ({
          externalResourceId: item.resourceId, namespace: item.namespace, metricName: item.metricName,
          region: item.regionId, dimensions: item.dimensions,
          statistics: item.statistics, ...(item.unit === undefined ? {} : { unit: item.unit }),
        })),
        replace: false,
      });
      setSelected(new Set()); setNotice(`${response.metricDefinitions.configuredCount} definiciones guardadas. La ingesta se inicia desde sincronización o por el programador.`);
      await onSaved();
    } catch (cause: unknown) { setError(readCloudOnboardingError(cause, 'No se pudieron guardar las definiciones AWS.')); }
    finally { setBusy(null); }
  };
  const toggle = (item: CloudMetricDefinitionCandidate, checked: boolean) => setSelected((current) => {
    const next = new Set(current); const itemKey = key(item);
    if (checked && next.size < MAX_SELECTED) next.add(itemKey); else next.delete(itemKey);
    return next;
  });

  return <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4" aria-label="Descubrimiento de métricas AWS">
    <div><h4 className="font-bold text-white">Descubrir métricas AWS</h4><p className="mt-1 text-xs text-zinc-400">Consulta CloudWatch en modo de solo lectura. Las series se guardan únicamente cuando las seleccionas.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Región" help="Región AWS en la que están los recursos; se usa la región principal como valor inicial."><input disabled={busy !== null} value={regionId} onChange={(event) => { setRegionId(event.target.value); setDiscovery(null); }} className={inputClass} placeholder="us-east-1" /></Field>
      <Field label="Namespace (opcional)" help="Filtra por namespace, por ejemplo AWS/EC2 o AWS/EBS. Si queda vacío se consultan ambos namespaces comunes."><input disabled={busy !== null} value={namespace} onChange={(event) => { setNamespace(event.target.value); setDiscovery(null); }} className={inputClass} placeholder="AWS/EC2" /></Field>
    </div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy !== null || regionId.trim() === ''} onClick={() => void preview()} className={secondaryButton}>{busy === 'preview' ? 'Consultando CloudWatch…' : 'Previsualizar (solo lectura)'}</button>{discovery && <button type="button" disabled={busy !== null || selectedDefinitions.length === 0} onClick={() => void save()} className={secondaryButton}>{busy === 'save' ? 'Guardando…' : `Guardar ${selectedDefinitions.length} seleccionada(s)`}</button>}</div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{notice && <p aria-live="polite" className="text-xs text-emerald-300">{notice}</p>}
    {discovery && <>
      {discovery.warnings.map((warning, index) => <p key={`${index}-${warning}`} className="text-xs text-amber-200">{warning}</p>)}
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 p-2">{discovery.definitions.length === 0 ? <p className="p-3 text-sm text-zinc-400">No se encontraron métricas asociadas a una dimensión EC2 o EBS reconocida.</p> : discovery.definitions.map((item) => <label key={key(item)} className="flex gap-3 rounded-lg border border-zinc-800 p-3 text-xs">
        <input type="checkbox" checked={selected.has(key(item))} disabled={!item.resourceId || (!selected.has(key(item)) && selected.size >= MAX_SELECTED)} onChange={(event) => toggle(item, event.target.checked)} className="mt-0.5 accent-yellow-400" />
        <span className="min-w-0"><strong className="text-zinc-200">{item.metricName}</strong><span className="ml-2 text-zinc-400">{item.namespace}</span><span className="mt-1 block break-all font-mono text-[10px] text-zinc-500">{item.resourceId || 'Sin identificador exacto de recurso'}</span><span className="mt-1 block text-zinc-500">{item.unit ?? 'Unidad no declarada'} · {item.statistics?.join(', ') ?? 'MEAN'}</span>{!item.resourceId && <span className="mt-1 block text-amber-300">No se puede vincular con seguridad; no seleccionable.</span>}</span>
      </label>)}</div>
      {discovery.truncated && <p className="text-xs text-amber-200">Consulta parcial por el límite de seguridad. Reduce el namespace para continuar.</p>}
      <p className="text-[11px] text-zinc-500">Máximo {MAX_SELECTED} series por guardado. Las series sin identificador exacto no se asociarán a otro recurso.</p>
    </>}
  </section>;
}

function key(item: CloudMetricDefinitionCandidate): string {
  return JSON.stringify([item.regionId ?? '', item.namespace, item.metricName, item.resourceId, item.dimensions ?? {}]);
}
