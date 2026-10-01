import { useEffect, useMemo, useRef, useState } from 'react';
import { configureCloudMetricDefinitions, previewCloudMetricDefinitions } from '../../services/api';
import type { CloudMetricDefinitionCandidate, CloudMetricDiscovery } from '../../services/api';
import { Field, inputClass, secondaryButton } from './CloudOnboardingUi';
import { readCloudOnboardingError } from './cloudOnboardingUtils';

const MAX_SELECTED = 100;

export function OciMetricDiscoveryPanel({ token, cloudConnectionId, defaultRegion, onSaved }: {
  readonly token: string;
  readonly cloudConnectionId: string;
  readonly defaultRegion: string;
  readonly onSaved: () => Promise<void>;
}) {
  const [regionId, setRegionId] = useState(defaultRegion);
  const [compartmentId, setCompartmentId] = useState('');
  const [namespace, setNamespace] = useState('');
  const [discovery, setDiscovery] = useState<CloudMetricDiscovery | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<'preview' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const previewControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    previewControllerRef.current?.abort();
    previewControllerRef.current = null;
    setRegionId(defaultRegion);
    setDiscovery(null);
    setSelected(new Set());
    setError(null);
    setNotice(null);
    setBusy(null);
    return () => {
      previewControllerRef.current?.abort();
      previewControllerRef.current = null;
    };
  }, [cloudConnectionId, defaultRegion, token]);
  const invalidatePreview = () => {
    previewControllerRef.current?.abort();
    previewControllerRef.current = null;
    setDiscovery(null); setSelected(new Set()); setError(null); setNotice(null);
  };
  const selectedDefinitions = useMemo(
    () => (discovery?.definitions ?? []).filter((definition) => selected.has(definitionKey(definition))),
    [discovery, selected],
  );

  const preview = async () => {
    if (busy !== null) return;
    const controller = new AbortController();
    previewControllerRef.current = controller;
    setBusy('preview'); setError(null); setNotice(null); setSelected(new Set());
    try {
      const response = await previewCloudMetricDefinitions(token, cloudConnectionId, {
        regionId: regionId.trim(), compartmentId: compartmentId.trim(),
        ...(namespace.trim() === '' ? {} : { namespace: namespace.trim() }),
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setDiscovery(response.discovery);
      setNotice(`${response.discovery.definitions.length} serie(s) encontradas; ${response.discovery.apiCallCount} llamadas OCI.`);
    } catch (cause: unknown) {
      if (controller.signal.aborted) return;
      setDiscovery(null);
      setError(readCloudOnboardingError(cause, 'No se pudieron descubrir las métricas OCI.'));
    } finally {
      if (previewControllerRef.current === controller) {
        previewControllerRef.current = null;
        setBusy(null);
      }
    }
  };

  const save = async () => {
    if (busy !== null || selectedDefinitions.length === 0) return;
    setBusy('save'); setError(null); setNotice(null);
    try {
      const response = await configureCloudMetricDefinitions(token, cloudConnectionId, {
        definitions: selectedDefinitions.map((definition) => ({
          compartmentId: definition.compartmentId,
          namespace: definition.namespace,
          metricName: definition.metricName,
          resourceId: definition.resourceId,
          ...(definition.regionId === undefined ? {} : { regionId: definition.regionId }),
          ...(definition.dimensions === undefined ? {} : { dimensions: definition.dimensions }),
          ...(definition.statistics === undefined ? {} : { statistics: definition.statistics }),
          ...(definition.unit === undefined ? {} : { unit: definition.unit }),
        })),
        replace: false,
      });
      setSelected(new Set());
      setNotice(`${response.metricDefinitions.configuredCount} definición(es) guardadas. La ingesta no se inicia automáticamente.`);
      await onSaved();
    } catch (cause: unknown) {
      setError(readCloudOnboardingError(cause, 'No se pudieron guardar las definiciones seleccionadas.'));
    } finally { setBusy(null); }
  };

  const toggle = (definition: CloudMetricDefinitionCandidate, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = definitionKey(definition);
      if (checked && next.size < MAX_SELECTED) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4" aria-label="Descubrimiento de métricas OCI">
      <div><h4 className="font-bold text-white">Descubrir métricas OCI</h4><p className="mt-1 text-xs leading-relaxed text-zinc-400">Previsualiza series en una región y compartment concretos. Esta consulta es de solo lectura: no guarda definiciones ni inicia ingesta hasta que selecciones y confirmes.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Región" help="Región OCI que quieres consultar. Por defecto se usa la región principal de esta conexión."><input required disabled={busy !== null} value={regionId} onChange={(event) => { setRegionId(event.target.value); invalidatePreview(); }} className={inputClass} placeholder="us-ashburn-1" /></Field>
        <Field label="Compartment OCID" help="Usa el OCID del compartment específico; no se explora toda la tenancy automáticamente."><input required disabled={busy !== null} value={compartmentId} onChange={(event) => { setCompartmentId(event.target.value); invalidatePreview(); }} className={inputClass} placeholder="ocid1.compartment.oc1..exampleid0001..." /></Field>
        <Field label="Namespace (opcional)" help="Filtra por namespace, por ejemplo oci_computeagent. Si lo dejas vacío, se intentará descubrir namespaces dentro del scope indicado."><input disabled={busy !== null} value={namespace} onChange={(event) => { setNamespace(event.target.value); invalidatePreview(); }} className={inputClass} placeholder="oci_computeagent" /></Field>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy !== null || regionId.trim() === '' || compartmentId.trim() === ''} onClick={() => void preview()} className={secondaryButton}>{busy === 'preview' ? 'Consultando OCI…' : 'Previsualizar (solo lectura)'}</button>{discovery !== null && <button type="button" disabled={busy !== null || selectedDefinitions.length === 0} onClick={() => void save()} className={secondaryButton}>{busy === 'save' ? 'Guardando…' : `Guardar ${selectedDefinitions.length} seleccionada(s)`}</button>}</div>
      {error !== null && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {notice !== null && <p aria-live="polite" className="text-xs text-green-300">{notice}</p>}
      {discovery !== null && <>
        {discovery.truncated && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">Resultado parcial por límite de seguridad. Puedes guardar solo las series visibles que selecciones; reduce el scope o especifica un namespace para descubrir más.</p>}
        {discovery.warnings.map((warning, index) => <p key={`${index}-${warning}`} className="text-xs text-amber-200">{warning}</p>)}
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 p-2">
          {discovery.definitions.length === 0 ? <p className="p-3 text-sm text-zinc-400">No se encontraron series en este scope. Verifica permisos, región, compartment y que el agente del recurso publique métricas.</p> : discovery.definitions.map((definition) => {
            const key = definitionKey(definition);
            const eligible = definition.resourceId.trim() !== '';
            const checked = selected.has(key);
            return <label key={key} className="flex gap-3 rounded-lg border border-zinc-800 p-3 text-xs">
              <input type="checkbox" checked={checked} disabled={!eligible || (!checked && selected.size >= MAX_SELECTED)} onChange={(event) => toggle(definition, event.target.checked)} className="mt-0.5 accent-yellow-400" />
              <span className="min-w-0"><strong className="text-zinc-200">{definition.metricName}</strong><span className="ml-2 text-zinc-400">{definition.namespace}</span><span className="mt-1 block break-all font-mono text-[10px] text-zinc-500" title={definition.resourceId}>{eligible ? definition.resourceId : 'Sin dimensión resourceId'}</span><span className="mt-1 block text-zinc-500">{definition.unit ?? 'Unidad no declarada'} · {definition.statistics?.join(', ') ?? 'MEAN'}</span>{!eligible && <span className="mt-1 block text-amber-300">No se puede asociar de forma fiable a un recurso; no seleccionable.</span>}{eligible && definition.inventoryLinkage?.status === 'MATCHED' && <span className="mt-1 block text-emerald-300">Coincidencia exacta en inventario: {definition.inventoryLinkage.resourceName || definition.resourceId}</span>}{eligible && definition.inventoryLinkage?.status === 'NOT_FOUND' && <span className="mt-1 block text-amber-300">Sin coincidencia exacta en el inventario de esta conexión. No se inferirá otro recurso; el vínculo podrá resolverse cuando el inventario contenga este mismo ID.</span>}{eligible && definition.inventoryLinkage?.status === 'NOT_VERIFIED' && <span className="mt-1 block text-amber-300">No se pudo comprobar el inventario; no se creará una asociación inferida.</span>}</span>
            </label>;
          })}
        </div>
        <p className="text-[11px] text-zinc-500">Máximo {MAX_SELECTED} definiciones por guardado. Solo se incluyen identificadores de recurso devueltos exactamente por OCI; el vínculo con el inventario requiere el mismo ID exacto y nunca se infiere.</p>
      </>}
    </section>
  );
}

function definitionKey(definition: CloudMetricDefinitionCandidate): string {
  return JSON.stringify([definition.regionId ?? '', definition.compartmentId, definition.namespace, definition.metricName, definition.resourceId, definition.dimensions ?? {}]);
}
