import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
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
  validateCloudCredential,
  validateCloudConnection,
  type BillingSourceMode,
  type CloudConnectionSummary,
  type CloudOnboardingDetail,
  type CloudOnboardingStatus,
  type CloudProviderCatalogEntry,
  type CloudFocusPreview,
  type IngestionSourceType,
} from '../services/api';
import { Badge, CredentialRow, Empty, Field, inputClass, OnboardingStep, primaryButton, secondaryButton } from './cloud-onboarding/CloudOnboardingUi';
import { readCloudOnboardingError } from './cloud-onboarding/cloudOnboardingUtils';

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

const credentialValidationRetryDelaysMs = [10_000, 30_000, 60_000] as const;

export default function CloudOnboarding({ connections, canManage, onChanged, onNavigate }: {
  readonly connections: readonly CloudConnectionSummary[];
  readonly canManage: boolean;
  readonly onChanged: () => Promise<void>;
  readonly onNavigate: (view: 'dashboard' | 'cloud_inventory' | 'metricas_tecnicas') => void;
}) {
  const token = useAccessToken();
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
  const [privateKey, setPrivateKey] = useState('');
  const [keyFileName, setKeyFileName] = useState('');
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
  const privateKeyInputRef = useRef<HTMLInputElement>(null);
  const credentialValidationTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const controller = new AbortController();
    void fetchCloudProviders(token).then((response) => {
      if (!controller.signal.aborted) setProviders(response.providers.filter((provider) => provider.enabled && ['oci', 'aws'].includes(provider.code)));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(readCloudOnboardingError(cause, 'No se pudo cargar el catálogo cloud.'));
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

  useEffect(() => () => {
    for (const timer of credentialValidationTimersRef.current.values()) window.clearTimeout(timer);
    credentialValidationTimersRef.current.clear();
  }, [selectedId, token]);

  useEffect(() => {
    if (selectedId === '') {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    void fetchCloudOnboarding(token, selectedId, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setDetail(response.onboarding); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(readCloudOnboardingError(cause, 'No se pudo cargar el onboarding.')); });
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
      setError(readCloudOnboardingError(cause, 'No se pudo completar la operación.'));
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

  const startCredentialValidation = useCallback(function validateCredentialCandidate(
    cloudConnectionId: string,
    credentialId: string,
    retryAttempt = 0,
  ) {
    const scheduledTimer = credentialValidationTimersRef.current.get(credentialId);
    if (scheduledTimer !== undefined) {
      window.clearTimeout(scheduledTimer);
      credentialValidationTimersRef.current.delete(credentialId);
    }
    void (async () => {
      setBusy(`credential-${credentialId}`);
      setError(null);
      try {
        const response = await validateCloudCredential(token, cloudConnectionId, credentialId);
        const retryDelay = credentialValidationRetryDelaysMs[retryAttempt];
        const propagationPending = response.credential.status === 'PENDING'
          && response.credential.validationStatus === 'RETRYABLE_ERROR';
        if (response.credential.status === 'ACTIVE') {
          setMessage('Acceso verificado. La credencial anterior fue deshabilitada de forma segura.');
        } else if (propagationPending && retryDelay !== undefined) {
          setMessage(`La credencial quedó protegida mientras OCI propaga la API key. Se reintentará automáticamente en ${retryDelay / 1000} segundos (${retryAttempt + 1}/${credentialValidationRetryDelaysMs.length}).`);
          const timer = window.setTimeout(() => {
            credentialValidationTimersRef.current.delete(credentialId);
            validateCredentialCandidate(cloudConnectionId, credentialId, retryAttempt + 1);
          }, retryDelay);
          credentialValidationTimersRef.current.set(credentialId, timer);
        } else {
          setMessage(response.credential.validationMessage ?? 'La credencial sigue pendiente de validación.');
        }
        await onChanged();
        reloadDetail();
      } catch (cause: unknown) {
        setMessage(`La credencial quedó guardada, pero la validación se podrá reintentar desde “Credenciales registradas”. ${readCloudOnboardingError(cause, '')}`.trim());
        reloadDetail();
      } finally {
        setBusy(null);
      }
    })();
  }, [onChanged, reloadDetail, token]);

  const readPrivateKeyFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    if (file.size > 64 * 1024) {
      setError('La clave privada supera 64 KiB. Selecciona únicamente el archivo PEM/KEY, sin documentación adicional.');
      event.target.value = '';
      return;
    }
    void file.text().then((value) => {
      setPrivateKey(value);
      setKeyFileName(file.name);
      setError(null);
    }).catch(() => setError('No se pudo leer el archivo de clave privada. Puedes pegar el PEM manualmente.'));
  };

  const saveCredential = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (detail === null) return;
    void (async () => {
      setBusy('credential-save');
      setError(null);
      setMessage(null);
      const provider = detail.connection.providerCode.toLowerCase();
      const payload: Readonly<Record<string, string>> = provider === 'aws'
        ? { roleArn, externalId, region: detail.connection.defaultRegion ?? defaultRegion }
        : {
            tenancyId: detail.connection.rootExternalId,
            userId: ociUserId,
            privateKey,
            region: detail.connection.defaultRegion ?? defaultRegion,
            ...(passphrase === '' ? {} : { passphrase }),
          };
      try {
        const response = await storeCloudCredential(token, detail.connection.id, { purpose: 'OPERATIONAL', label: credentialLabel, payload });
        setExternalId(''); setPrivateKey(''); setKeyFileName(''); setPassphrase('');
        if (privateKeyInputRef.current !== null) privateKeyInputRef.current.value = '';
        setMessage(response.reused
          ? 'Esta credencial ya estaba registrada. Se reutilizó el candidato existente y no se duplicó el secreto.'
          : 'Credencial cifrada y guardada. La conexión permanece protegida mientras se verifica el acceso.');
        await onChanged();
        reloadDetail();
        if (response.nextAction === 'VALIDATE') window.setTimeout(() => startCredentialValidation(detail.connection.id, response.credential.id), 0);
      } catch (cause: unknown) {
        setError(readCloudOnboardingError(cause, 'No se pudo guardar la credencial. Revisa los campos y vuelve a intentarlo.'));
      } finally {
        setBusy(null);
      }
    })();
  };

  const selectedProvider = detail?.connection.providerCode.toLowerCase() ?? providerCode;
  const readinessStatus = detail?.readiness?.onboardingStatus;
  const canActivate = detail !== null && hasUsableValidation(detail);
  const failedSources = uniqueJobSources(detail, 'FAILED');
  const pendingSources = uniqueJobSources(detail, 'PENDING');

  return (
    <section className="ui-surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Agregar y activar una cuenta cloud</h3>
          <p className="mt-1 text-sm text-zinc-400">Conecta OCI o AWS con permisos de solo lectura y verifica cada fuente antes de ingerir datos.</p>
        </div>
        {readinessStatus !== undefined && <Badge text={statusLabels[readinessStatus]} tone={readinessStatus === 'READY' ? 'green' : readinessStatus === 'REQUIRES_ATTENTION' ? 'red' : 'yellow'} />}
      </div>

      {(error !== null || message !== null) && <div aria-live="polite" className={`m-6 p-4 text-sm ${error !== null ? 'ui-alert-danger' : 'ui-alert-positive'}`}>{error ?? message}</div>}

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
        <div className="space-y-5">
          <div>
            <label htmlFor="onboarding-connection" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Cuenta configurada</label>
            <select id="onboarding-connection" value={selectedId} onChange={(event) => { const nextId = event.target.value; if (nextId === selectedId) return; setDetail(null); setSelectedId(nextId); }} className={inputClass}>
              <option value="">Selecciona una conexión</option>
              {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name} · {connection.providerCode.toUpperCase()}</option>)}
            </select>
          </div>

          {canManage && (
            <form onSubmit={createConnection} className="ui-surface-raised space-y-3 p-4">
              <h4 className="font-bold text-white">1. Crear conexión</h4>
              <Field label="Proveedor" help="Selecciona el proveedor de la cuenta que vas a conectar."><select value={providerCode} onChange={(event) => setProviderCode(event.target.value as 'oci' | 'aws')} className={inputClass}>{providers.length === 0 ? <><option value="oci">Oracle Cloud</option><option value="aws">Amazon Web Services</option></> : providers.map((provider) => <option key={provider.code} value={provider.code}>{provider.displayName}</option>)}</select></Field>
              <Field label="Nombre reconocible" help="Usa un nombre que permita distinguir fácilmente la cuenta, por ejemplo: OCI Producción TAK."><input required maxLength={120} value={connectionName} onChange={(event) => setConnectionName(event.target.value)} className={inputClass} placeholder="Producción del cliente" /></Field>
              <Field label={providerCode === 'oci' ? 'Tenancy OCID' : 'AWS Account ID'} help={providerCode === 'oci' ? 'Copia el Tenancy OCID desde OCI. Debe comenzar por ocid1.tenancy.' : 'Es el identificador numérico de 12 dígitos de la cuenta AWS, no el correo del usuario.'}><input required value={rootExternalId} onChange={(event) => setRootExternalId(event.target.value)} className={inputClass} placeholder={providerCode === 'oci' ? 'ocid1.tenancy...' : '123456789012'} /></Field>
              <Field label="Región principal" help="Región por defecto para inventario y métricas. Puedes cambiarla después."><input required value={defaultRegion} onChange={(event) => setDefaultRegion(event.target.value)} className={inputClass} placeholder={providerCode === 'oci' ? 'us-ashburn-1' : 'us-east-1'} /></Field>
              <button disabled={busy !== null} className={primaryButton}>{busy === 'create' ? 'Creando…' : 'Crear conexión'}</button>
            </form>
          )}
        </div>

        {detail === null ? <Empty text="Crea o selecciona una conexión para continuar." /> : (
          <div className="space-y-5">
            <div className="ui-surface-raised flex flex-wrap items-center justify-between gap-3 p-4">
              <div><h4 className="font-bold text-white">{detail.connection.name}</h4><p className="mt-1 break-all text-xs text-zinc-500">{detail.connection.providerCode.toUpperCase()} · {detail.connection.rootExternalId} · {detail.connection.defaultRegion ?? 'Sin región'}</p></div>
              {canManage && <button type="button" disabled={busy !== null} onClick={() => { const next = detail.connection.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'; if (next === 'ACTIVE' || window.confirm('¿Deshabilitar esta conexión? Los datos históricos se conservarán y no se crearán nuevas ingestas.')) void run('status', async () => { await setCloudConnectionStatus(token, detail.connection.id, next); return next === 'ACTIVE' ? 'Conexión habilitada.' : 'Conexión deshabilitada; se conservaron los datos históricos.'; }); }} className={secondaryButton}>{detail.connection.status === 'ACTIVE' ? 'Deshabilitar' : 'Habilitar'}</button>}
            </div>

            <ol aria-label="Progreso del onboarding" className="grid gap-2 sm:grid-cols-4">
              <OnboardingStep number="1" title="Cuenta" complete={true} active={false} />
              <OnboardingStep number="2" title="Acceso seguro" complete={detail.credentials.some((credential) => credential.status === 'ACTIVE')} active={detail.credentials.length === 0 || detail.credentials.every((credential) => credential.status !== 'ACTIVE')} />
              <OnboardingStep number="3" title="Verificación" complete={detail.readiness?.authentication?.status === 'VERIFIED'} active={detail.readiness?.authentication?.status !== 'VERIFIED'} />
              <OnboardingStep number="4" title="Sincronización" complete={readinessStatus === 'READY'} active={canActivate && readinessStatus !== 'READY'} />
            </ol>

            {canManage && <form onSubmit={(event) => { event.preventDefault(); void run('update', async () => { await updateCloudConnection(token, detail.connection.id, { name: editName, ...(editRegion.trim() === '' ? {} : { defaultRegion: editRegion }) }); return 'Datos de la conexión actualizados.'; }); }} className="ui-surface-raised grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><Field label="Nombre de la conexión"><input required maxLength={120} value={editName} onChange={(event) => setEditName(event.target.value)} className={inputClass} /></Field><Field label="Región principal"><input value={editRegion} onChange={(event) => setEditRegion(event.target.value)} className={inputClass} /></Field><button disabled={busy !== null} className={secondaryButton}>{busy === 'update' ? 'Guardando…' : 'Guardar datos'}</button></form>}

            {canManage && <form onSubmit={saveCredential} className="ui-surface-raised space-y-3 p-4">
              <div><h4 className="font-bold text-white">2. Acceso seguro de solo lectura</h4><p className="mt-1 text-xs text-zinc-500">La credencial se cifra al guardarse. La aplicación nunca volverá a mostrar la clave privada o el External ID.</p></div>
              <Field label="Etiqueta" help="Nombre visible para identificar esta credencial. Nunca escribas aquí la clave privada ni una contraseña."><input required maxLength={120} value={credentialLabel} onChange={(event) => setCredentialLabel(event.target.value)} className={inputClass} /></Field>
              {selectedProvider === 'aws' ? <>
                <Field label="Role ARN" help="ARN del rol IAM que la plataforma asumirá. Debe pertenecer al Account ID anterior y tener permisos de lectura."><input required value={roleArn} onChange={(event) => setRoleArn(event.target.value)} className={inputClass} placeholder="arn:aws:iam::123456789012:role/FinOpsReadOnly" /></Field>
                <Field label="External ID" help="Valor de confianza configurado en la relación del rol IAM. No es la contraseña de AWS y no se muestra después de guardarlo."><input required type="password" autoComplete="new-password" value={externalId} onChange={(event) => setExternalId(event.target.value)} className={inputClass} /></Field>
              </> : <>
                <Field label="User OCID" help="Copia el User OCID de OCI, no el nombre de usuario ni el fingerprint. Debe comenzar por ocid1.user."><input required value={ociUserId} onChange={(event) => setOciUserId(event.target.value)} className={inputClass} placeholder="ocid1.user..." /></Field>
                <Field label="Archivo de clave privada" help="Selecciona el archivo .pem/.key generado para la API Key de OCI. El archivo se lee solo en el navegador y no se guarda localmente."><input ref={privateKeyInputRef} type="file" accept=".pem,.key,text/plain" onChange={readPrivateKeyFile} className="mt-2 block min-h-11 w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-tak-yellow file:px-3 file:py-2 file:text-xs file:font-black file:text-zinc-950" />{keyFileName !== '' && <span className="mt-1 block text-xs text-zinc-500">Archivo cargado: {keyFileName}</span>}</Field>
                <Field label="Private key PEM" help="También puedes pegar el contenido completo. Debe incluir BEGIN y END, ser RSA de al menos 2048 bits y puede terminar con OCI_API_KEY."><textarea required rows={7} value={privateKey} onChange={(event) => { setPrivateKey(event.target.value); setKeyFileName(''); }} className={inputClass} autoComplete="off" placeholder="-----BEGIN PRIVATE KEY-----" /></Field>
                <Field label="Passphrase (opcional)" help="Solo diligénciala si la clave PEM fue cifrada al generarla. No es la contraseña de OCI."><input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className={inputClass} /></Field>
                <p className="text-xs leading-relaxed text-zinc-500">El fingerprint se calcula automáticamente desde la clave pública de este PEM. Debe coincidir con el API key registrado en OCI; no tienes que escribirlo.</p>
              </>}
              <button disabled={busy !== null} className={primaryButton}>{busy === 'credential-save' ? 'Guardando…' : detail.credentials.some((credential) => credential.status === 'ACTIVE') ? 'Reemplazar credencial' : 'Guardar credencial'}</button>
            </form>}

            <div className="ui-surface-raised p-4">
              <h4 className="font-bold text-white">Credenciales registradas</h4>
              {detail.credentials.length === 0 ? <p className="mt-2 text-sm text-zinc-500">Todavía no hay credenciales operativas.</p> : detail.credentials.map((credential) => <CredentialRow key={credential.id} credential={credential} canManage={canManage} busy={busy} onRevoke={() => { if (window.confirm('¿Revocar esta credencial localmente?')) void run('revoke', async () => { await revokeCloudCredential(token, detail.connection.id, credential.id); return 'Credencial revocada.'; }); }} onRetry={() => startCredentialValidation(detail.connection.id, credential.id)} />)}
            </div>

            <div className="ui-surface-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold text-white">3. Validar capacidades</h4><p className="mt-1 text-xs text-zinc-500">Primero se verifica la firma; solo después se consultan permisos por capacidad.</p>{detail.readiness?.authentication && <p className={`mt-2 text-xs leading-relaxed ${detail.readiness.authentication.status === 'VERIFIED' ? 'text-green-300' : 'text-amber-300'}`}><strong>{detail.readiness.authentication.status === 'VERIFIED' ? 'Autenticación verificada.' : 'Autenticación no verificada.'}</strong> {detail.readiness.authentication.message}</p>}</div>{canManage && <button type="button" disabled={busy !== null || detail.credentials.every((credential) => credential.status !== 'ACTIVE')} onClick={() => void run('validate', async () => { await validateCloudConnection(token, detail.connection.id); return 'Validación completada. Revisa el resultado de autenticación y de cada capacidad.'; })} className={secondaryButton}>{busy === 'validate' ? 'Validando…' : 'Validar acceso'}</button>}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{detail.readiness?.capabilities.length ? detail.readiness.capabilities.map((item) => <div key={item.capability} className="rounded-xl border border-zinc-800 p-3"><div className="flex justify-between gap-2"><p className="text-sm font-bold text-zinc-200">{capabilityLabels[item.capability] ?? item.capability}</p><Badge text={item.status === 'AVAILABLE' ? 'Disponible' : item.status === 'NOT_CONFIGURED' ? 'No configurado' : item.status === 'DENIED' ? 'Sin permiso' : item.status === 'BLOCKED' ? 'No consultado' : 'Error'} tone={item.status === 'AVAILABLE' ? 'green' : item.status === 'DENIED' || item.status === 'ERROR' ? 'red' : 'yellow'} /></div><p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.message}</p></div>) : <p className="text-sm text-zinc-500">Valida la conexión para comprobar identidad, inventario, costos, métricas y FOCUS.</p>}</div>
              {detail.issues.length > 0 && <div className="mt-4 space-y-2"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Qué debes corregir</p>{detail.issues.map((issue, index) => <div key={`${issue.actionCode}-${index}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-sm font-semibold text-zinc-200">{issue.message}</p><p className="mt-1 text-xs text-zinc-500">Afecta: {issue.affectedData.join(', ')}.</p><p className="mt-1 text-xs text-amber-300">Siguiente acción: {issue.action}</p></div>)}</div>}
            </div>

            {canManage && <details className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-white">Configuración técnica avanzada (opcional) <span className="ml-2 text-xs font-normal text-zinc-500">Métricas, fuente de costos y control de trabajos</span></summary>
              <div className="mt-4 space-y-5">
            {canManage && <form onSubmit={(event) => { event.preventDefault(); void run('metrics-config', async () => { const definition = selectedProvider === 'aws' ? { externalResourceId: metricResourceId, namespace: metricNamespace, metricName, stat: metricStat, dimensions: [{ Name: 'InstanceId', Value: metricResourceId }], ...(editRegion === '' ? {} : { region: editRegion }), ...(metricUnit === '' ? {} : { unit: metricUnit }) } : { compartmentId: metricCompartmentId, namespace: metricNamespace, metricName, resourceId: metricResourceId, ...(metricUnit === '' ? {} : { unit: metricUnit }) }; const response = await configureCloudMetricDefinitions(token, detail.connection.id, { definitions: [definition], replace: replaceMetrics }); return `${response.metricDefinitions.configuredCount} definición(es) de métricas configuradas.`; }); }} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><div><h4 className="font-bold text-white">Configuración avanzada: métricas técnicas</h4><p className="mt-1 text-xs text-zinc-500">Relaciona una métrica real con el identificador exacto del recurso. La memoria suele requerir el agente del proveedor.</p></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Namespace" help="Namespace o espacio de nombres exacto que publica el proveedor para esa métrica."><input required value={metricNamespace} onChange={(event) => setMetricNamespace(event.target.value)} className={inputClass} /></Field><Field label="Nombre de métrica" help="Nombre exacto de la métrica. Debe coincidir con el catálogo del proveedor."><input required value={metricName} onChange={(event) => setMetricName(event.target.value)} className={inputClass} /></Field><Field label={selectedProvider === 'aws' ? 'Instance ID' : 'Resource OCID'} help="Identificador del recurso que quieres relacionar con la serie técnica."><input required value={metricResourceId} onChange={(event) => setMetricResourceId(event.target.value)} className={inputClass} placeholder={selectedProvider === 'aws' ? 'i-0123456789abcdef0' : 'ocid1.instance...'} /></Field>{selectedProvider === 'oci' ? <Field label="Compartment OCID" help="Compartment donde está el recurso. La cuenta debe tener acceso de lectura a este compartment."><input required value={metricCompartmentId} onChange={(event) => setMetricCompartmentId(event.target.value)} className={inputClass} /></Field> : <Field label="Estadística" help="Estadística que se consultará al proveedor: promedio, máximo, mínimo o suma."><select value={metricStat} onChange={(event) => setMetricStat(event.target.value)} className={inputClass}><option>Average</option><option>Maximum</option><option>Minimum</option><option>Sum</option></select></Field>}<Field label="Unidad (opcional)" help="Unidad declarada por el proveedor, por ejemplo Percent o Bytes."><input value={metricUnit} onChange={(event) => setMetricUnit(event.target.value)} className={inputClass} placeholder="Percent" /></Field></div><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={replaceMetrics} onChange={(event) => setReplaceMetrics(event.target.checked)} /> Reemplazar las definiciones existentes</label><button disabled={busy !== null} className={secondaryButton}>{busy === 'metrics-config' ? 'Guardando…' : 'Guardar definición'}</button></form>}

            {canManage && <div className="grid gap-5 lg:grid-cols-2">
              <form onSubmit={(event) => { event.preventDefault(); void run('billing', async () => { await configureBillingSource(token, detail.connection.id, billingMode); return `Fuente de costos configurada en ${billingMode}.`; }); }} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">Configuración avanzada: fuente de costos</h4><Field label="Modo" help="AUTO prioriza un export FOCUS configurado y usa la API directa solo cuando está disponible. FOCUS es la fuente principal recomendada."><select value={billingMode} onChange={(event) => setBillingMode(event.target.value as BillingSourceMode)} className={inputClass}><option value="AUTO">AUTO · prioriza FOCUS y usa API como respaldo</option><option value="FOCUS">FOCUS · export normalizado</option><option value="PROVIDER_API">API directa del proveedor</option></select></Field><p className="text-xs text-zinc-500">Configura el bucket en “Fuentes FOCUS” y comprueba el acceso antes de ingerir filas.</p><div className="flex flex-wrap gap-2"><button disabled={busy !== null} className={secondaryButton}>Guardar fuente</button><button type="button" disabled={busy !== null} onClick={() => void run('focus-preview', async () => { const response = await previewCloudFocusSource(token, detail.connection.id); setFocusPreview(response.preview); return `Preview FOCUS completado: ${response.preview.discoveredObjects} objeto(s) descubierto(s).`; })} className={secondaryButton}>{busy === 'focus-preview' ? 'Comprobando…' : 'Comprobar FOCUS'}</button></div>{focusPreview !== null && <div className="rounded-xl border border-zinc-800 p-3 text-xs text-zinc-400"><p>{focusPreview.configuredLocations} ubicación(es), {focusPreview.discoveredObjects} objeto(s), {focusPreview.sizedObjects > 0 ? `${formatBytes(focusPreview.approximateBytes)} inspeccionados` : 'tamaño no reportado por el listado'}.</p><p className="mt-1">Formatos: {focusPreview.supportedFormats.join(', ')}{focusPreview.earliestObjectAt ? ` · rango visible ${formatDate(focusPreview.earliestObjectAt)} a ${formatDate(focusPreview.latestObjectAt ?? focusPreview.earliestObjectAt)}` : ''}</p>{focusPreview.errors.map((error) => <p key={error} className="mt-1 text-red-300">{error}</p>)}{focusPreview.objects.slice(0, 3).map((object) => <p key={object.location} className="mt-1 truncate" title={object.location}>{object.name}</p>)}</div>}</form>
              <form onSubmit={(event) => { event.preventDefault(); void run('activate', async () => { const response = await activateCloudConnection(token, detail.connection.id, { billingLookbackDays: Number(billingDays), metricLookbackDays: Number(metricDays), metricWindowHours: Number(windowHours) }); return `Activación encolada: ${response.activation.createdJobs.length} jobs creados, ${response.activation.skipped.length} ya cubiertos y ${response.activation.unavailable.length} no disponibles por configuración o permisos.`; }); }} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">4. Sincronización inicial</h4><p className="mt-1 text-xs text-zinc-500">Trae el histórico inicial después de verificar la cuenta. La operación se encola y no bloquea la pantalla.</p><div className="grid grid-cols-3 gap-2"><Field label="Costos (días)" help="Días de histórico de costos que quieres solicitar en la primera sincronización."><input type="number" min="1" max="366" value={billingDays} onChange={(event) => setBillingDays(event.target.value)} className={inputClass} /></Field><Field label="Métricas (días)" help="Días de métricas técnicas a recuperar. OCI permite hasta 90 días según la disponibilidad del proveedor."><input type="number" min="1" max="90" value={metricDays} onChange={(event) => setMetricDays(event.target.value)} className={inputClass} /></Field><Field label="Ventana (h)" help="Tamaño de cada ventana de ingesta. Ventanas cortas facilitan reintentos y evitan solicitudes demasiado pesadas."><input type="number" min="1" max="24" value={windowHours} onChange={(event) => setWindowHours(event.target.value)} className={inputClass} /></Field></div>{!canActivate && <p className="text-xs text-amber-300">Valida la identidad y al menos una fuente de datos antes de activar.</p>}<button disabled={busy !== null || !canActivate} className={primaryButton}>{busy === 'activate' ? 'Activando…' : 'Activar cuenta'}</button></form>
            </div>}
            {canManage && (failedSources.length > 0 || pendingSources.length > 0) && <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">Control de trabajos</h4><p className="mt-1 text-xs text-zinc-500">Reintenta solo fuentes fallidas o cancela trabajos que todavía no comenzaron. Un trabajo en ejecución terminará su ventana actual.</p><div className="mt-3 flex flex-wrap gap-2">{failedSources.map((source) => <button key={`retry-${source}`} type="button" disabled={busy !== null} onClick={() => void run(`retry-${source}`, async () => { const response = await retryFailedCloudIngestion(token, detail.connection.id, source); return `${response.jobs.length} ventana(s) fallida(s) encoladas para ${sourceLabel(source)}.`; })} className={secondaryButton}>Reintentar {sourceLabel(source)}</button>)}{pendingSources.map((source) => <button key={`cancel-${source}`} type="button" disabled={busy !== null} onClick={() => { if (window.confirm(`¿Cancelar los trabajos pendientes de ${sourceLabel(source)}?`)) void run(`cancel-${source}`, async () => { const response = await cancelPendingCloudIngestion(token, detail.connection.id, source); return `${response.cancelled} trabajo(s) pendientes cancelados.`; }); }} className={secondaryButton}>Cancelar pendientes de {sourceLabel(source)}</button>)}</div></div>}
              </div>
            </details>}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h4 className="font-bold text-white">7. Consultar los datos</h4><p className="mt-1 text-xs text-zinc-500">Cuando finalicen los jobs, comprueba que cada fuente alimentó las vistas operativas.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onNavigate('dashboard')} className={secondaryButton}>Abrir panel de control</button><button type="button" onClick={() => onNavigate('cloud_inventory')} className={secondaryButton}>Abrir inventario</button><button type="button" onClick={() => onNavigate('metricas_tecnicas')} className={secondaryButton}>Abrir métricas</button></div></div>
          </div>
        )}
      </div>
    </section>
  );
}

function hasUsableValidation(detail: CloudOnboardingDetail): boolean {
  const available = detail.readiness?.capabilities.filter((item) => item.status === 'AVAILABLE') ?? [];
  const authenticated = detail.readiness?.authentication?.status === 'VERIFIED'
    || (detail.readiness?.authentication === undefined && available.some((item) => item.capability === 'IDENTITY'));
  return detail.connection.lastValidatedAt !== undefined
    && authenticated
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
