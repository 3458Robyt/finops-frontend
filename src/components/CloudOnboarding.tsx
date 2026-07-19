import { useCallback, useEffect, useState } from 'react';
import {
  activateCloudConnection,
  cancelPendingCloudIngestion,
  configureBillingSource,
  configureCloudMetricDefinitions,
  createCloudConnection,
  fetchCloudOnboarding,
  fetchCloudProviders,
  previewCloudFocusSource,
  revokeCloudCredential,
  retryFailedCloudIngestion,
  setCloudConnectionStatus,
  storeCloudCredential,
  updateCloudConnection,
  validateCloudConnection,
  type BillingSourceMode,
  type CloudConnectionSummary,
  type CloudOnboardingDetail,
  type CloudOnboardingStatus,
  type CloudProviderCatalogEntry,
  type CloudFocusPreview,
  type IngestionSourceType,
} from '../services/api';

const statusLabels: Record<CloudOnboardingStatus, string> = {
  NO_CREDENTIAL: 'Falta configurar acceso',
  REQUIRES_VALIDATION: 'Requiere validación',
  SYNCING: 'Sincronizando',
  PARTIAL: 'Parcialmente operativo',
  READY: 'Operativo',
  REQUIRES_ATTENTION: 'Requiere atención',
};

const capabilityLabels: Record<string, string> = {
  IDENTITY: 'Identidad', INVENTORY: 'Inventario', COSTS: 'Costos', METRICS: 'Métricas', STORAGE: 'Storage FOCUS',
};

export default function CloudOnboarding({ token, connections, canManage, onChanged, onNavigate }: {
  readonly token: string;
  readonly connections: readonly CloudConnectionSummary[];
  readonly canManage: boolean;
  readonly onChanged: () => Promise<void>;
  readonly onNavigate: (view: 'dashboard' | 'cloud_inventory' | 'metricas_tecnicas') => void;
}) {
  const [providers, setProviders] = useState<readonly CloudProviderCatalogEntry[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<CloudOnboardingDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [providerCode, setProviderCode] = useState<'oci' | 'aws'>('oci');
  const [connectionName, setConnectionName] = useState('');
  const [rootExternalId, setRootExternalId] = useState('');
  const [defaultRegion, setDefaultRegion] = useState('');
  const [credentialLabel, setCredentialLabel] = useState('Acceso operativo read-only');
  const [roleArn, setRoleArn] = useState('');
  const [externalId, setExternalId] = useState('');
  const [ociUserId, setOciUserId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [billingMode, setBillingMode] = useState<BillingSourceMode>('AUTO');
  const [billingDays, setBillingDays] = useState('30');
  const [metricDays, setMetricDays] = useState('90');
  const [windowHours, setWindowHours] = useState('24');
  const [editName, setEditName] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [metricNamespace, setMetricNamespace] = useState('');
  const [metricName, setMetricName] = useState('');
  const [metricResourceId, setMetricResourceId] = useState('');
  const [metricCompartmentId, setMetricCompartmentId] = useState('');
  const [metricStat, setMetricStat] = useState('Average');
  const [metricUnit, setMetricUnit] = useState('');
  const [replaceMetrics, setReplaceMetrics] = useState(false);
  const [focusPreview, setFocusPreview] = useState<CloudFocusPreview | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCloudProviders(token).then((response) => {
      if (!controller.signal.aborted) setProviders(response.providers.filter((provider) => provider.enabled && ['oci', 'aws'].includes(provider.code)));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(readError(cause, 'No se pudo cargar el catálogo cloud.'));
    });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (selectedId === '' || !connections.some((connection) => connection.id === selectedId)) {
      setDetail(null);
      setSelectedId(connections[0]?.id ?? '');
    }
  }, [connections, selectedId]);

  const reloadDetail = useCallback(() => setRefresh((value) => value + 1), []);

  useEffect(() => {
    if (selectedId === '') {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    void fetchCloudOnboarding(token, selectedId, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setDetail(response.onboarding); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(readError(cause, 'No se pudo cargar el onboarding.')); });
    return () => controller.abort();
  }, [refresh, selectedId, token]);

  useEffect(() => {
    if (detail?.readiness?.onboardingStatus !== 'SYNCING') return;
    const timer = window.setInterval(reloadDetail, 5000);
    return () => window.clearInterval(timer);
  }, [detail?.readiness?.onboardingStatus, reloadDetail]);

  useEffect(() => {
    setEditName(detail?.connection.name ?? '');
    setEditRegion(detail?.connection.defaultRegion ?? '');
    setMetricCompartmentId(detail?.connection.providerCode === 'oci' ? detail.connection.rootExternalId : '');
    setMetricNamespace(detail?.connection.providerCode === 'aws' ? 'AWS/EC2' : 'oci_vmi_resource_utilization');
    setMetricName(detail?.connection.providerCode === 'aws' ? 'CPUUtilization' : 'CpuUtilization');
    setFocusPreview(null);
  }, [detail?.connection.id, detail?.connection.name, detail?.connection.defaultRegion, detail?.connection.providerCode, detail?.connection.rootExternalId]);

  const run = async (name: string, action: () => Promise<string>) => {
    if (busy !== null) return;
    setBusy(name); setError(null); setMessage(null);
    try {
      setMessage(await action());
      await onChanged();
      reloadDetail();
    } catch (cause: unknown) {
      setError(readError(cause, 'No se pudo completar la operación.'));
    } finally {
      setBusy(null);
    }
  };

  const createConnection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run('create', async () => {
      const response = await createCloudConnection(token, {
        providerCode, name: connectionName, rootExternalId,
        ...(defaultRegion.trim() === '' ? {} : { defaultRegion }),
      });
      setDetail(null);
      setSelectedId(response.connection.id);
      setConnectionName(''); setRootExternalId('');
      return 'Conexión creada. Continúa configurando el acceso de solo lectura.';
    });
  };

  const saveCredential = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (detail === null) return;
    void run('credential', async () => {
      const provider = detail.connection.providerCode.toLowerCase();
      const payload: Readonly<Record<string, string>> = provider === 'aws'
        ? { roleArn, externalId, region: detail.connection.defaultRegion ?? defaultRegion }
        : {
            tenancyId: detail.connection.rootExternalId,
            userId: ociUserId,
            fingerprint,
            privateKey,
            region: detail.connection.defaultRegion ?? defaultRegion,
            ...(passphrase === '' ? {} : { passphrase }),
          };
      await storeCloudCredential(token, detail.connection.id, { purpose: 'OPERATIONAL', label: credentialLabel, payload });
      setExternalId(''); setPrivateKey(''); setPassphrase('');
      return 'Credencial cifrada y guardada. El secreto ya no se mostrará.';
    });
  };

  const selectedProvider = detail?.connection.providerCode.toLowerCase() ?? providerCode;
  const readinessStatus = detail?.readiness?.onboardingStatus;
  const canActivate = detail !== null && hasUsableValidation(detail);
  const failedSources = uniqueJobSources(detail, 'FAILED');
  const pendingSources = uniqueJobSources(detail, 'PENDING');

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Agregar y activar una cuenta cloud</h3>
          <p className="mt-1 text-sm text-zinc-400">Conecta OCI o AWS con permisos de solo lectura y verifica cada fuente antes de ingerir datos.</p>
        </div>
        {readinessStatus !== undefined && <Badge text={statusLabels[readinessStatus]} tone={readinessStatus === 'READY' ? 'green' : readinessStatus === 'REQUIRES_ATTENTION' ? 'red' : 'yellow'} />}
      </div>

      {(error !== null || message !== null) && <div aria-live="polite" className={`m-6 rounded-2xl border p-4 text-sm ${error !== null ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>{error ?? message}</div>}

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
        <div className="space-y-5">
          <div>
            <label htmlFor="onboarding-connection" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Cuenta configurada</label>
            <select id="onboarding-connection" value={selectedId} onChange={(event) => { setDetail(null); setSelectedId(event.target.value); }} className={inputClass}>
              <option value="">Selecciona una conexión</option>
              {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name} · {connection.providerCode.toUpperCase()}</option>)}
            </select>
          </div>

          {canManage && (
            <form onSubmit={createConnection} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <h4 className="font-bold text-white">1. Crear conexión</h4>
              <Field label="Proveedor"><select value={providerCode} onChange={(event) => setProviderCode(event.target.value as 'oci' | 'aws')} className={inputClass}>{providers.length === 0 ? <><option value="oci">Oracle Cloud</option><option value="aws">Amazon Web Services</option></> : providers.map((provider) => <option key={provider.code} value={provider.code}>{provider.displayName}</option>)}</select></Field>
              <Field label="Nombre reconocible"><input required maxLength={120} value={connectionName} onChange={(event) => setConnectionName(event.target.value)} className={inputClass} placeholder="Producción del cliente" /></Field>
              <Field label={providerCode === 'oci' ? 'Tenancy OCID' : 'AWS Account ID'}><input required value={rootExternalId} onChange={(event) => setRootExternalId(event.target.value)} className={inputClass} placeholder={providerCode === 'oci' ? 'ocid1.tenancy...' : '123456789012'} /></Field>
              <Field label="Región principal"><input required value={defaultRegion} onChange={(event) => setDefaultRegion(event.target.value)} className={inputClass} placeholder={providerCode === 'oci' ? 'us-ashburn-1' : 'us-east-1'} /></Field>
              <button disabled={busy !== null} className={primaryButton}>{busy === 'create' ? 'Creando…' : 'Crear conexión'}</button>
            </form>
          )}
        </div>

        {detail === null ? <Empty text="Crea o selecciona una conexión para continuar." /> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div><h4 className="font-bold text-white">{detail.connection.name}</h4><p className="mt-1 break-all text-xs text-zinc-500">{detail.connection.providerCode.toUpperCase()} · {detail.connection.rootExternalId} · {detail.connection.defaultRegion ?? 'Sin región'}</p></div>
              {canManage && <button type="button" disabled={busy !== null} onClick={() => { const next = detail.connection.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'; if (next === 'ACTIVE' || window.confirm('¿Deshabilitar esta conexión? Los datos históricos se conservarán y no se crearán nuevas ingestas.')) void run('status', async () => { await setCloudConnectionStatus(token, detail.connection.id, next); return next === 'ACTIVE' ? 'Conexión habilitada.' : 'Conexión deshabilitada; se conservaron los datos históricos.'; }); }} className={secondaryButton}>{detail.connection.status === 'ACTIVE' ? 'Deshabilitar' : 'Habilitar'}</button>}
            </div>

            {canManage && <form onSubmit={(event) => { event.preventDefault(); void run('update', async () => { await updateCloudConnection(token, detail.connection.id, { name: editName, ...(editRegion.trim() === '' ? {} : { defaultRegion: editRegion }) }); return 'Datos de la conexión actualizados.'; }); }} className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><Field label="Nombre de la conexión"><input required maxLength={120} value={editName} onChange={(event) => setEditName(event.target.value)} className={inputClass} /></Field><Field label="Región principal"><input value={editRegion} onChange={(event) => setEditRegion(event.target.value)} className={inputClass} /></Field><button disabled={busy !== null} className={secondaryButton}>{busy === 'update' ? 'Guardando…' : 'Guardar datos'}</button></form>}

            {canManage && <form onSubmit={saveCredential} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div><h4 className="font-bold text-white">2. Acceso seguro de solo lectura</h4><p className="mt-1 text-xs text-zinc-500">La credencial se cifra al guardarse. La aplicación nunca volverá a mostrar la clave privada o el External ID.</p></div>
              <Field label="Etiqueta"><input required maxLength={120} value={credentialLabel} onChange={(event) => setCredentialLabel(event.target.value)} className={inputClass} /></Field>
              {selectedProvider === 'aws' ? <>
                <Field label="Role ARN"><input required value={roleArn} onChange={(event) => setRoleArn(event.target.value)} className={inputClass} placeholder="arn:aws:iam::123456789012:role/FinOpsReadOnly" /></Field>
                <Field label="External ID"><input required type="password" autoComplete="new-password" value={externalId} onChange={(event) => setExternalId(event.target.value)} className={inputClass} /></Field>
              </> : <>
                <Field label="User OCID"><input required value={ociUserId} onChange={(event) => setOciUserId(event.target.value)} className={inputClass} placeholder="ocid1.user..." /></Field>
                <Field label="Fingerprint"><input required value={fingerprint} onChange={(event) => setFingerprint(event.target.value)} className={inputClass} placeholder="aa:bb:cc:…" /></Field>
                <Field label="Private key PEM"><textarea required rows={5} value={privateKey} onChange={(event) => setPrivateKey(event.target.value)} className={inputClass} autoComplete="off" placeholder="-----BEGIN PRIVATE KEY-----" /></Field>
                <Field label="Passphrase (opcional)"><input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className={inputClass} /></Field>
              </>}
              <button disabled={busy !== null} className={primaryButton}>{busy === 'credential' ? 'Guardando…' : detail.credentials.some((credential) => credential.status === 'ACTIVE') ? 'Reemplazar credencial' : 'Guardar credencial'}</button>
            </form>}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <h4 className="font-bold text-white">Credenciales registradas</h4>
              {detail.credentials.length === 0 ? <p className="mt-2 text-sm text-zinc-500">Todavía no hay credenciales operativas.</p> : detail.credentials.map((credential) => <div key={credential.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 p-3"><div><p className="text-sm font-semibold text-zinc-200">{credential.label}</p><p className="text-xs text-zinc-500">{credential.purpose} · {credential.status}{credential.externalPrincipalId ? ` · ${credential.externalPrincipalId}` : ''}</p></div>{canManage && credential.status === 'ACTIVE' && <button type="button" disabled={busy !== null} onClick={() => { if (window.confirm('¿Revocar esta credencial localmente?')) void run('revoke', async () => { await revokeCloudCredential(token, detail.connection.id, credential.id); return 'Credencial revocada.'; }); }} className="text-xs font-bold text-red-300 hover:text-red-200">Revocar</button>}</div>)}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold text-white">3. Validar capacidades</h4><p className="mt-1 text-xs text-zinc-500">Una capacidad puede fallar sin inutilizar las demás.</p></div>{canManage && <button type="button" disabled={busy !== null || detail.credentials.every((credential) => credential.status !== 'ACTIVE')} onClick={() => void run('validate', async () => { await validateCloudConnection(token, detail.connection.id); return 'Validación completada.'; })} className={secondaryButton}>{busy === 'validate' ? 'Validando…' : 'Validar acceso'}</button>}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{detail.readiness?.capabilities.length ? detail.readiness.capabilities.map((item) => <div key={item.capability} className="rounded-xl border border-zinc-800 p-3"><div className="flex justify-between gap-2"><p className="text-sm font-bold text-zinc-200">{capabilityLabels[item.capability] ?? item.capability}</p><Badge text={item.status === 'AVAILABLE' ? 'Disponible' : item.status === 'NOT_CONFIGURED' ? 'No configurado' : item.status === 'DENIED' ? 'Sin permiso' : 'Error'} tone={item.status === 'AVAILABLE' ? 'green' : item.status === 'DENIED' || item.status === 'ERROR' ? 'red' : 'yellow'} /></div><p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.message}</p></div>) : <p className="text-sm text-zinc-500">Valida la conexión para comprobar identidad, inventario, costos, métricas y FOCUS.</p>}</div>
              {detail.issues.length > 0 && <div className="mt-4 space-y-2"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Qué debes corregir</p>{detail.issues.map((issue, index) => <div key={`${issue.actionCode}-${index}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-sm font-semibold text-zinc-200">{issue.message}</p><p className="mt-1 text-xs text-zinc-500">Afecta: {issue.affectedData.join(', ')}.</p><p className="mt-1 text-xs text-amber-300">Siguiente acción: {issue.action}</p></div>)}</div>}
            </div>

            {canManage && <form onSubmit={(event) => { event.preventDefault(); void run('metrics-config', async () => { const definition = selectedProvider === 'aws' ? { externalResourceId: metricResourceId, namespace: metricNamespace, metricName, stat: metricStat, dimensions: [{ Name: 'InstanceId', Value: metricResourceId }], ...(editRegion === '' ? {} : { region: editRegion }), ...(metricUnit === '' ? {} : { unit: metricUnit }) } : { compartmentId: metricCompartmentId, namespace: metricNamespace, metricName, resourceId: metricResourceId, ...(metricUnit === '' ? {} : { unit: metricUnit }) }; const response = await configureCloudMetricDefinitions(token, detail.connection.id, { definitions: [definition], replace: replaceMetrics }); return `${response.metricDefinitions.configuredCount} definición(es) de métricas configuradas.`; }); }} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><div><h4 className="font-bold text-white">4. Configurar métricas técnicas</h4><p className="mt-1 text-xs text-zinc-500">Relaciona una métrica real con el identificador exacto del recurso. La memoria suele requerir el agente del proveedor.</p></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Namespace"><input required value={metricNamespace} onChange={(event) => setMetricNamespace(event.target.value)} className={inputClass} /></Field><Field label="Nombre de métrica"><input required value={metricName} onChange={(event) => setMetricName(event.target.value)} className={inputClass} /></Field><Field label={selectedProvider === 'aws' ? 'Instance ID' : 'Resource OCID'}><input required value={metricResourceId} onChange={(event) => setMetricResourceId(event.target.value)} className={inputClass} placeholder={selectedProvider === 'aws' ? 'i-0123456789abcdef0' : 'ocid1.instance...'} /></Field>{selectedProvider === 'oci' ? <Field label="Compartment OCID"><input required value={metricCompartmentId} onChange={(event) => setMetricCompartmentId(event.target.value)} className={inputClass} /></Field> : <Field label="Estadística"><select value={metricStat} onChange={(event) => setMetricStat(event.target.value)} className={inputClass}><option>Average</option><option>Maximum</option><option>Minimum</option><option>Sum</option></select></Field>}<Field label="Unidad (opcional)"><input value={metricUnit} onChange={(event) => setMetricUnit(event.target.value)} className={inputClass} placeholder="Percent" /></Field></div><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={replaceMetrics} onChange={(event) => setReplaceMetrics(event.target.checked)} /> Reemplazar las definiciones existentes</label><button disabled={busy !== null} className={secondaryButton}>{busy === 'metrics-config' ? 'Guardando…' : 'Guardar definición'}</button></form>}

            {canManage && <div className="grid gap-5 lg:grid-cols-2">
              <form onSubmit={(event) => { event.preventDefault(); void run('billing', async () => { await configureBillingSource(token, detail.connection.id, billingMode); return `Fuente de costos configurada en ${billingMode}.`; }); }} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">5. Fuente de costos</h4><Field label="Modo"><select value={billingMode} onChange={(event) => setBillingMode(event.target.value as BillingSourceMode)} className={inputClass}><option value="AUTO">AUTO · prioriza FOCUS y usa API como respaldo</option><option value="FOCUS">FOCUS · export normalizado</option><option value="PROVIDER_API">API directa del proveedor</option></select></Field><p className="text-xs text-zinc-500">Configura el bucket en “Fuentes FOCUS” y comprueba el acceso antes de ingerir filas.</p><div className="flex flex-wrap gap-2"><button disabled={busy !== null} className={secondaryButton}>Guardar fuente</button><button type="button" disabled={busy !== null} onClick={() => void run('focus-preview', async () => { const response = await previewCloudFocusSource(token, detail.connection.id); setFocusPreview(response.preview); return `Preview FOCUS completado: ${response.preview.discoveredObjects} objeto(s) descubierto(s).`; })} className={secondaryButton}>{busy === 'focus-preview' ? 'Comprobando…' : 'Comprobar FOCUS'}</button></div>{focusPreview !== null && <div className="rounded-xl border border-zinc-800 p-3 text-xs text-zinc-400"><p>{focusPreview.configuredLocations} ubicación(es), {focusPreview.discoveredObjects} objeto(s), {focusPreview.sizedObjects > 0 ? `${formatBytes(focusPreview.approximateBytes)} inspeccionados` : 'tamaño no reportado por el listado'}.</p><p className="mt-1">Formatos: {focusPreview.supportedFormats.join(', ')}{focusPreview.earliestObjectAt ? ` · rango visible ${formatDate(focusPreview.earliestObjectAt)} a ${formatDate(focusPreview.latestObjectAt ?? focusPreview.earliestObjectAt)}` : ''}</p>{focusPreview.errors.map((error) => <p key={error} className="mt-1 text-red-300">{error}</p>)}{focusPreview.objects.slice(0, 3).map((object) => <p key={object.location} className="mt-1 truncate" title={object.location}>{object.name}</p>)}</div>}</form>
              <form onSubmit={(event) => { event.preventDefault(); void run('activate', async () => { const response = await activateCloudConnection(token, detail.connection.id, { billingLookbackDays: Number(billingDays), metricLookbackDays: Number(metricDays), metricWindowHours: Number(windowHours) }); return `Activación encolada: ${response.activation.createdJobs.length} jobs creados, ${response.activation.skipped.length} ya cubiertos y ${response.activation.unavailable.length} no disponibles por configuración o permisos.`; }); }} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">6. Sincronización inicial</h4><div className="grid grid-cols-3 gap-2"><Field label="Costos (días)"><input type="number" min="1" max="366" value={billingDays} onChange={(event) => setBillingDays(event.target.value)} className={inputClass} /></Field><Field label="Métricas (días)"><input type="number" min="1" max="90" value={metricDays} onChange={(event) => setMetricDays(event.target.value)} className={inputClass} /></Field><Field label="Ventana (h)"><input type="number" min="1" max="24" value={windowHours} onChange={(event) => setWindowHours(event.target.value)} className={inputClass} /></Field></div>{!canActivate && <p className="text-xs text-amber-300">Valida la identidad y al menos una fuente de datos antes de activar.</p>}<button disabled={busy !== null || !canActivate} className={primaryButton}>{busy === 'activate' ? 'Activando…' : 'Activar cuenta'}</button></form>
            </div>}
            {canManage && (failedSources.length > 0 || pendingSources.length > 0) && <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">Control de trabajos</h4><p className="mt-1 text-xs text-zinc-500">Reintenta solo fuentes fallidas o cancela trabajos que todavía no comenzaron. Un trabajo en ejecución terminará su ventana actual.</p><div className="mt-3 flex flex-wrap gap-2">{failedSources.map((source) => <button key={`retry-${source}`} type="button" disabled={busy !== null} onClick={() => void run(`retry-${source}`, async () => { const response = await retryFailedCloudIngestion(token, detail.connection.id, source); return `${response.jobs.length} ventana(s) fallida(s) encoladas para ${sourceLabel(source)}.`; })} className={secondaryButton}>Reintentar {sourceLabel(source)}</button>)}{pendingSources.map((source) => <button key={`cancel-${source}`} type="button" disabled={busy !== null} onClick={() => { if (window.confirm(`¿Cancelar los trabajos pendientes de ${sourceLabel(source)}?`)) void run(`cancel-${source}`, async () => { const response = await cancelPendingCloudIngestion(token, detail.connection.id, source); return `${response.cancelled} trabajo(s) pendientes cancelados.`; }); }} className={secondaryButton}>Cancelar pendientes de {sourceLabel(source)}</button>)}</div></div>}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">7. Consultar los datos</h4><p className="mt-1 text-xs text-zinc-500">Cuando finalicen los jobs, comprueba que cada fuente alimentó las vistas operativas.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onNavigate('dashboard')} className={secondaryButton}>Abrir panel de control</button><button type="button" onClick={() => onNavigate('cloud_inventory')} className={secondaryButton}>Abrir inventario</button><button type="button" onClick={() => onNavigate('metricas_tecnicas')} className={secondaryButton}>Abrir métricas</button></div></div>
          </div>
        )}
      </div>
    </section>
  );
}

const inputClass = 'mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-tak-yellow disabled:opacity-50';
const primaryButton = 'w-full rounded-xl bg-tak-yellow px-4 py-2.5 text-sm font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50';

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">{label}{children}</label>;
}

function Badge({ text, tone }: { readonly text: string; readonly tone: 'green' | 'yellow' | 'red' }) {
  const style = tone === 'green' ? 'bg-green-500/15 text-green-300' : tone === 'red' ? 'bg-red-500/15 text-red-300' : 'bg-tak-yellow/15 text-tak-yellow';
  return <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${style}`}>{text}</span>;
}

function Empty({ text }: { readonly text: string }) {
  return <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">{text}</div>;
}

function readError(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.name !== 'AbortError' ? cause.message : fallback;
}

function hasUsableValidation(detail: CloudOnboardingDetail): boolean {
  const available = detail.readiness?.capabilities.filter((item) => item.status === 'AVAILABLE') ?? [];
  return detail.connection.lastValidatedAt !== undefined
    && available.some((item) => item.capability === 'IDENTITY')
    && available.some((item) => ['INVENTORY', 'COSTS', 'METRICS', 'STORAGE'].includes(item.capability));
}

function uniqueJobSources(detail: CloudOnboardingDetail | null, status: 'FAILED' | 'PENDING'): readonly IngestionSourceType[] {
  return [...new Set((detail?.readiness?.recentJobs ?? [])
    .filter((job) => job.status === status)
    .map((job) => job.sourceType))];
}

function sourceLabel(source: IngestionSourceType): string {
  return source === 'INVENTORY' ? 'inventario'
    : source === 'BILLING_EXPORT' ? 'costos'
      : source === 'TECHNICAL_METRIC' ? 'métricas'
        : 'métricas de agente';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));
}
