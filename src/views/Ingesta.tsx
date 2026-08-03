import { useCallback, useEffect, useState } from 'react';
import CloudOnboarding from '../components/CloudOnboarding';
import {
  configureBillingSource,
  configureFocusSource,
  fetchDataQualityChecks,
  fetchCloudConnections,
  fetchIngestionHistory,
  fetchIngestionReadiness,
  fetchResourceLinkageReadiness,
  queueIngestionJob,
  queueTechnicalMetricBackfill,
  type CloudConnectionSummary,
  type BillingSourceMode,
  type DataQualityCheckItem,
  type DataQualityStatus,
  type IngestionJobHistoryItem,
  type IngestionJobStatus,
  type IngestionReadinessConnectionSummary,
  type IngestionReadinessIssue,
  type IngestionSourceType,
  type ResourceLinkageReadinessResponse,
  type ResourceLinkReasonCode,
} from '../services/api';

/** Etiquetas en español para el tipo de fuente de ingesta. */
const sourceTypeLabels: Readonly<Record<IngestionSourceType, string>> = {
  BILLING_EXPORT: 'Facturación',
  INVENTORY: 'Inventario',
  TECHNICAL_METRIC: 'Métrica técnica',
  AGENT_METRIC: 'Métrica de agente',
};

/** Etiqueta y color del estado de un trabajo de ingesta. */
const jobStatusStyles: Readonly<Record<IngestionJobStatus, { readonly label: string; readonly className: string }>> = {
  PENDING: { label: 'Pendiente', className: 'bg-zinc-800 text-zinc-300' },
  RUNNING: { label: 'En ejecución', className: 'bg-sky-500/15 text-sky-300' },
  SUCCESS: { label: 'Completado', className: 'bg-green-500/15 text-green-300' },
  FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' },
  CANCELLED: { label: 'Cancelado', className: 'bg-zinc-700 text-zinc-400' },
};

/** Etiqueta y color del resultado de un control de calidad de datos. */
const qualityStatusStyles: Readonly<Record<DataQualityStatus, { readonly label: string; readonly className: string }>> = {
  PASSED: { label: 'Aprobado', className: 'bg-green-500/15 text-green-300' },
  WARNING: { label: 'Advertencia', className: 'bg-tak-yellow/15 text-tak-yellow' },
  FAILED: { label: 'Fallido', className: 'bg-red-500/15 text-red-300' },
};

const readinessSeverityStyles: Readonly<Record<IngestionReadinessIssue['severity'], { readonly label: string; readonly className: string }>> = {
  INFO: { label: 'Info', className: 'bg-sky-500/15 text-sky-300' },
  WARNING: { label: 'Advertencia', className: 'bg-tak-yellow/15 text-tak-yellow' },
  BLOCKER: { label: 'Bloqueante', className: 'bg-red-500/15 text-red-300' },
};

const resourceLinkageStatusStyles: Readonly<Record<ResourceLinkageReadinessResponse['readiness']['status'], { readonly label: string; readonly className: string }>> = {
  READY: { label: 'Trazabilidad lista', className: 'bg-green-500/15 text-green-300' },
  PARTIAL: { label: 'Cobertura parcial', className: 'bg-tak-yellow/15 text-tak-yellow' },
  BLOCKED: { label: 'Bloqueada', className: 'bg-red-500/15 text-red-300' },
  NO_DATA: { label: 'Sin datos', className: 'bg-zinc-800 text-zinc-400' },
};

const resourceLinkageCoverageLabels: Readonly<Record<ResourceLinkageReadinessResponse['readiness']['resources'][number]['coverage'], string>> = {
  COST_AND_TECHNICAL: 'Costo + técnica',
  COST_ONLY: 'Solo costo',
  TECHNICAL_ONLY: 'Solo técnica',
  INVENTORY_ONLY: 'Solo inventario',
};

const resourceEvidenceLabels: Readonly<Record<ResourceLinkageReadinessResponse['readiness']['resources'][number]['evidenceStatus'], string>> = {
  EVIDENCE_COMPLETE: 'Evidencia completa',
  COST_ONLY: 'Solo costo',
  TECHNICAL_ONLY: 'Solo métricas',
  INSUFFICIENT_EVIDENCE: 'Evidencia insuficiente',
  STALE_DATA: 'Datos desactualizados',
};

const technicalBlockerLabels: Readonly<Record<string, string>> = {
  NO_NORMALIZED_INVENTORY: 'No existe inventario normalizado compatible.',
  NO_RESOURCE_WITH_COST_AND_TECHNICAL_EVIDENCE: 'No hay un recurso con costo y métricas enlazados.',
  UNLINKED_COST_EVIDENCE: 'Existen costos elegibles sin vínculo exacto.',
  UNLINKED_TECHNICAL_EVIDENCE: 'Existen métricas sin vínculo exacto.',
  INVENTORY_NOT_FRESH: 'El inventario no está actualizado.',
  COST_DATA_NOT_FRESH: 'Los costos disponibles están desactualizados.',
  TECHNICAL_METRICS_NOT_FRESH: 'Las métricas técnicas están desactualizadas.',
};

const freshnessLabels: Readonly<Record<'FRESH' | 'STALE' | 'NO_DATA', string>> = {
  FRESH: 'Actualizado',
  STALE: 'Desactualizado',
  NO_DATA: 'Sin datos',
};

const resourceLinkReasonLabels: Readonly<Record<ResourceLinkReasonCode, string>> = {
  EMPTY_RESOURCE_ID: 'Identificador vacío',
  INVENTORY_RESOURCE_NOT_FOUND: 'No existe en inventario',
  CONNECTION_NOT_AVAILABLE: 'Sin conexión cloud',
  AMBIGUOUS_RESOURCE_ID: 'Identificador ambiguo',
  SERVICE_LEVEL_COST: 'Costo a nivel de servicio',
  INVALID_EXISTING_REFERENCE: 'Referencia existente inválida',
};

export default function Ingesta({ token, canManage, onNavigate }: {
  readonly token: string;
  readonly canManage: boolean;
  readonly onNavigate: (view: 'dashboard' | 'cloud_inventory' | 'metricas_tecnicas') => void;
}) {
  const [jobs, setJobs] = useState<readonly IngestionJobHistoryItem[]>([]);
  const [checks, setChecks] = useState<readonly DataQualityCheckItem[]>([]);
  const [connections, setConnections] = useState<readonly CloudConnectionSummary[]>([]);
  const [readinessOk, setReadinessOk] = useState(false);
  const [readinessGeneratedAt, setReadinessGeneratedAt] = useState<string | null>(null);
  const [readinessConnections, setReadinessConnections] = useState<readonly IngestionReadinessConnectionSummary[]>([]);
  const [readinessIssues, setReadinessIssues] = useState<readonly IngestionReadinessIssue[]>([]);
  const [resourceLinkage, setResourceLinkage] = useState<ResourceLinkageReadinessResponse['readiness'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [cloudConnectionId, setCloudConnectionId] = useState('');
  const [backfillConnectionId, setBackfillConnectionId] = useState('');
  const [backfillLookbackDays, setBackfillLookbackDays] = useState('90');
  const [backfillWindowHours, setBackfillWindowHours] = useState('24');
  const [focusConnectionId, setFocusConnectionId] = useState('');
  const [focusMode, setFocusMode] = useState<'location' | 'object'>('location');
  const [focusBucket, setFocusBucket] = useState('');
  const [focusPrefix, setFocusPrefix] = useState('');
  const [focusObjectKey, setFocusObjectKey] = useState('');
  const [focusNamespace, setFocusNamespace] = useState('');
  const [focusRegion, setFocusRegion] = useState('');
  const [focusVersion, setFocusVersion] = useState('1.0');
  const [focusMaxObjects, setFocusMaxObjects] = useState('100');
  const [focusReplace, setFocusReplace] = useState(false);
  const [configuringFocus, setConfiguringFocus] = useState(false);
  const [billingSourceMode, setBillingSourceMode] = useState<BillingSourceMode>('AUTO');
  const [configuringBillingSource, setConfiguringBillingSource] = useState(false);
  const [sourceType, setSourceType] = useState<IngestionSourceType>('TECHNICAL_METRIC');
  const [targetStart, setTargetStart] = useState(() => toDatetimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [targetEnd, setTargetEnd] = useState(() => toDatetimeLocal(new Date()));

  const loadData = useCallback(async (active: () => boolean): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [connectionsResponse, historyResponse, qualityResponse, readinessResponse, resourceLinkageResponse] = await Promise.all([
      fetchCloudConnections(token),
      fetchIngestionHistory(token),
      fetchDataQualityChecks(token),
      fetchIngestionReadiness(token),
      fetchResourceLinkageReadiness(token),
      ]);
      if (active()) {
        setConnections(connectionsResponse.connections);
        setJobs(historyResponse.jobs);
        setChecks(qualityResponse.checks);
        setReadinessOk(readinessResponse.readiness.ok);
        setReadinessGeneratedAt(readinessResponse.readiness.generatedAt);
        setReadinessConnections(readinessResponse.readiness.connections);
        setReadinessIssues(readinessResponse.readiness.issues);
        setResourceLinkage(resourceLinkageResponse.readiness);
        const defaultConnectionId = connectionsResponse.connections[0]?.id ?? historyResponse.jobs[0]?.cloudConnectionId ?? '';
        setCloudConnectionId((current) => current === '' ? defaultConnectionId : current);
        setBackfillConnectionId((current) => current === '' ? defaultConnectionId : current);
        setFocusConnectionId((current) => current === '' ? connectionsResponse.connections[0]?.id ?? '' : current);
      }
    } catch (cause: unknown) {
      if (active()) {
        setJobs([]);
        setChecks([]);
        setConnections([]);
        setReadinessOk(false);
        setReadinessGeneratedAt(null);
        setReadinessConnections([]);
        setReadinessIssues([]);
        setResourceLinkage(null);
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ingesta.');
      }
    } finally {
      if (active()) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    void loadData(() => active);

    return () => {
      active = false;
    };
  }, [loadData]);

  const handleQueueJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQueueing(true);
    setQueueMessage(null);
    setError(null);

    try {
      await queueIngestionJob(token, {
        cloudConnectionId: cloudConnectionId.trim(),
        sourceType,
        targetStart: new Date(targetStart).toISOString(),
        targetEnd: new Date(targetEnd).toISOString(),
      });
      setQueueMessage('Trabajo de ingesta encolado.');
      await loadData(() => true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo encolar la ingesta.');
    } finally {
      setQueueing(false);
    }
  };

  const selectedFocusConnection = connections.find((connection) => connection.id === focusConnectionId);
  const selectedFocusProvider = selectedFocusConnection?.providerCode.toLowerCase();

  const handleConfigureBillingSource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfiguringBillingSource(true);
    setQueueMessage(null);
    setError(null);

    try {
      await configureBillingSource(token, focusConnectionId.trim(), billingSourceMode);
      setQueueMessage(`Fuente de facturación configurada: ${billingSourceMode}.`);
      await loadData(() => true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo configurar la fuente de facturación.');
    } finally {
      setConfiguringBillingSource(false);
    }
  };

  const handleBackfill = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBackfilling(true);
    setQueueMessage(null);
    setError(null);

    try {
      const response = await queueTechnicalMetricBackfill(token, {
        cloudConnectionId: backfillConnectionId.trim(),
        lookbackDays: Number.parseInt(backfillLookbackDays, 10),
        windowHours: Number.parseInt(backfillWindowHours, 10),
      });
      setQueueMessage(
        `Backfill tecnico encolado: ${response.backfill.createdJobs.length} jobs creados, ${response.backfill.skippedWindows.length} ventanas omitidas.`,
      );
      await loadData(() => true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo encolar el backfill tecnico.');
    } finally {
      setBackfilling(false);
    }
  };

  const handleConfigureFocus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfiguringFocus(true);
    setQueueMessage(null);
    setError(null);

    try {
      await configureFocusSource(token, {
        cloudConnectionId: focusConnectionId.trim(),
        mode: focusMode,
        replace: focusReplace,
        values: buildFocusValues(selectedFocusProvider, {
          mode: focusMode,
          bucket: focusBucket,
          prefix: focusPrefix,
          objectKey: focusObjectKey,
          namespaceName: focusNamespace,
          region: focusRegion,
          focusVersion,
          maxObjects: focusMaxObjects,
        }),
      });
      setQueueMessage('Fuente FOCUS configurada.');
      await loadData(() => true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo configurar la fuente FOCUS.');
    } finally {
      setConfiguringFocus(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-black text-white">Ingesta y calidad de datos</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Historial de trabajos de ingesta y resultados de los controles de calidad del tenant.
        </p>
      </header>

      {error !== null && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}
      {queueMessage !== null && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-medium text-green-300">
          {queueMessage}
        </div>
      )}

      <CloudOnboarding
        token={token}
        connections={connections}
        canManage={canManage}
        onChanged={() => loadData(() => true)}
        onNavigate={onNavigate}
      />

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">health_and_safety</span>
            <h3 className="text-lg font-bold text-white">Preparacion de ingesta productiva</h3>
          </div>
          <StatusBadge
            label={readinessOk ? 'Listo sin bloqueantes' : 'Requiere atencion'}
            className={readinessOk ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}
          />
        </div>
        <div className="p-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Conexiones evaluadas {readinessGeneratedAt !== null ? `· ${formatDateTime(readinessGeneratedAt)}` : ''}
            </p>
            {loading ? (
              <p className="text-sm font-medium text-zinc-500">Cargando preparacion...</p>
            ) : readinessConnections.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500">Sin conexiones AWS/OCI activas para evaluar.</p>
            ) : readinessConnections.map((connection) => (
              <div key={connection.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-white">{connection.name}</p>
                    <p className="text-xs font-medium text-zinc-500">{connection.providerCode.toUpperCase()} · {connection.defaultRegion ?? 'Sin region por defecto'}</p>
                  </div>
                  <p className="text-xs font-bold text-zinc-400">{connection.recentJobs.length} jobs recientes</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ReadinessLine label="Credenciales" value={connection.credentialPurposes.length > 0 ? connection.credentialPurposes.join(', ') : 'Sin credenciales activas'} />
                  <ReadinessLine label="Metadata" value={formatMetadataCounts(connection.metadataCounts)} />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Hallazgos</p>
            {loading ? (
              <p className="text-sm font-medium text-zinc-500">Cargando hallazgos...</p>
            ) : readinessIssues.length === 0 ? (
              <p className="text-sm font-medium text-green-300">No hay bloqueantes ni advertencias registradas.</p>
            ) : readinessIssues.map((issue, index) => (
              <div key={`${issue.provider}-${issue.severity}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">{issue.provider.toUpperCase()}</p>
                  <StatusBadge {...readinessSeverityStyles[issue.severity]} />
                </div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-300">{issue.message}</p>
                <p className="mt-2 text-xs text-zinc-500">Afecta: {issue.affectedData.join(', ')}.</p>
                <p className="mt-1 text-xs font-semibold text-tak-yellow">Siguiente acción: {issue.action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {resourceLinkage !== null && (
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
          <div className="flex flex-col gap-3 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tak-yellow">account_tree</span>
                <h3 className="text-lg font-bold text-white">Trazabilidad normalizada por recurso</h3>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">
                Mide si costos, métricas y recomendaciones apuntan al mismo recurso inventariado. Un costo sin vínculo no se mezcla con métricas por nombre.
              </p>
            </div>
            <StatusBadge {...resourceLinkageStatusStyles[resourceLinkage.status]} />
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-4">
            <CoverageCard label="Recursos inventariados" value={String(resourceLinkage.inventoryResources)} detail="Identidad canónica" />
            <CoverageCard label="Costos enlazados" value={`${resourceLinkage.costs.coveragePercent}%`} detail={`${resourceLinkage.costs.linked} de ${resourceLinkage.costs.eligible} elegibles`} />
            <CoverageCard label="Métricas enlazadas" value={`${resourceLinkage.metrics.coveragePercent}%`} detail={`${resourceLinkage.metrics.linked} de ${resourceLinkage.metrics.eligible}`} />
            <CoverageCard label="Recursos con costo y técnica" value={String(resourceLinkage.linkedResourcesWithBoth)} detail="Base mínima para IA técnica" />
          </div>
          <div className="grid gap-3 border-t border-zinc-800 p-6 sm:grid-cols-3">
            <FreshnessCard label="Inventario" signal={resourceLinkage.freshness.inventory} />
            <FreshnessCard label="Costos" signal={resourceLinkage.freshness.costs} />
            <FreshnessCard label="Métricas" signal={resourceLinkage.freshness.metrics} />
          </div>
          {resourceLinkage.technicalRecommendationBlockers.length > 0 && (
            <div className="border-t border-zinc-800 bg-red-500/5 p-6">
              <p className="text-xs font-black uppercase tracking-widest text-red-300">Bloqueadores para recomendaciones técnicas</p>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {resourceLinkage.technicalRecommendationBlockers.map((blocker) => (
                  <li key={blocker} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                    {technicalBlockerLabels[blocker] ?? blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-6 border-t border-zinc-800 p-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Readiness por conexión</p>
              <div className="mb-6 grid gap-3 md:grid-cols-2">
                {resourceLinkage.connections.length === 0 ? <p className="text-sm text-zinc-500">No hay conexiones registradas.</p> : resourceLinkage.connections.map((connection) => (
                  <article key={connection.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-bold text-white">{connection.name}</p><p className="text-xs text-zinc-500">{connection.provider.toUpperCase()} · {connection.inventoryResources} recursos</p></div>
                      <StatusBadge {...resourceLinkageStatusStyles[connection.status]} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <ReadinessLine label="Costos" value={`${connection.costs.coveragePercent}%`} />
                      <ReadinessLine label="Métricas" value={`${connection.metrics.coveragePercent}%`} />
                      <ReadinessLine label="IA técnica" value={connection.recommendations.linked > 0 ? 'Con evidencia' : 'Sin vínculo'} />
                    </div>
                  </article>
                ))}
              </div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Muestra de inventario cruzado</p>
              <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="bg-zinc-950/60 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <tr><th className="p-3">Recurso</th><th className="p-3">Evidencia</th><th className="p-3">Costos</th><th className="p-3">Métricas</th><th className="p-3">Recomendaciones</th></tr>
                  </thead>
                  <tbody>
                    {resourceLinkage.resources.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-sm text-zinc-500">Todavía no hay recursos inventariados.</td></tr>
                    ) : resourceLinkage.resources.map((resource) => (
                      <tr key={resource.id} className="border-t border-zinc-800/70 text-sm">
                        <td className="p-3"><p className="font-bold text-white">{resource.externalResourceId}</p><p className="text-xs text-zinc-500">{resource.serviceName} · {resource.provider.toUpperCase()}</p></td>
                        <td className="p-3 text-xs font-bold text-zinc-300"><p>{resourceEvidenceLabels[resource.evidenceStatus]}</p><p className="mt-1 text-[10px] font-medium text-zinc-500">{resourceLinkageCoverageLabels[resource.coverage]}</p></td>
                        <td className="p-3 text-zinc-300">{resource.costMetrics}</td>
                        <td className="p-3 text-zinc-300">{resource.metricSamples}</td>
                        <td className="p-3 text-zinc-300">{resource.recommendations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Razones de no vínculo</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Estos registros quedan fuera de la evidencia técnica hasta que exista una identidad exacta.</p>
              </div>
              <CoverageReasons label="Costos" reasons={resourceLinkage.costs.reasons} />
              <CoverageReasons label="Métricas" reasons={resourceLinkage.metrics.reasons} />
              <CoverageReasons label="Recomendaciones" reasons={resourceLinkage.recommendations.reasons} />
              {resourceLinkage.latestReconciliation !== undefined && <p className="text-[11px] text-zinc-600">Última reconciliación: {formatDateTime(resourceLinkage.latestReconciliation.observedAt)}</p>}
            </div>
          </div>
        </section>
      )}

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">history</span>
            <h3 className="text-lg font-bold text-white">Backfill historico de metricas tecnicas</h3>
          </div>
          <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            maximo 90 dias
          </span>
        </div>
        <form onSubmit={handleBackfill} className="p-6 grid gap-4 lg:grid-cols-[minmax(220px,1.5fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_auto] items-end">
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Conexion</span>
            <select
              value={backfillConnectionId}
              onChange={(event) => setBackfillConnectionId(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
              required
            >
              {connections.length === 0 ? (
                <option value="">Sin conexiones activas</option>
              ) : connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name} · {connection.providerCode.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Dias hacia atras</span>
            <input
              type="number"
              min="1"
              max="90"
              value={backfillLookbackDays}
              onChange={(event) => setBackfillLookbackDays(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Ventana horas</span>
            <input
              type="number"
              min="1"
              max="24"
              value={backfillWindowHours}
              onChange={(event) => setBackfillWindowHours(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
              required
            />
          </label>
          <button
            type="submit"
            disabled={backfilling || backfillConnectionId.trim() === ''}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-black text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">cloud_download</span>
            {backfilling ? 'Encolando' : 'Traer historico'}
          </button>
        </form>
        <div className="border-t border-zinc-800 px-6 py-4 text-xs font-medium leading-relaxed text-zinc-500">
          Crea trabajos diarios de metricas tecnicas desde la retencion disponible del proveedor. Las ventanas que ya esten cubiertas por jobs pendientes, en ejecucion o exitosos se omiten.
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">playlist_add</span>
          <h3 className="text-lg font-bold text-white">Crear trabajo de ingesta</h3>
        </div>
        <form onSubmit={handleQueueJob} className="p-6 grid gap-4 lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,0.9fr)_minmax(190px,1fr)_minmax(190px,1fr)_auto] items-end">
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Conexión</span>
            <select
              value={cloudConnectionId}
              onChange={(event) => setCloudConnectionId(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
              required
            >
              {connections.length === 0 ? (
                <option value="">Sin conexiones activas</option>
              ) : connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name} · {connection.providerCode.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Fuente</span>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as IngestionSourceType)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
            >
              <option value="TECHNICAL_METRIC">Métrica técnica</option>
              <option value="BILLING_EXPORT">Facturación</option>
              <option value="INVENTORY">Inventario</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Inicio</span>
            <input
              type="datetime-local"
              value={targetStart}
              onChange={(event) => setTargetStart(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Fin</span>
            <input
              type="datetime-local"
              value={targetEnd}
              onChange={(event) => setTargetEnd(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
              required
            />
          </label>
          <button
            type="submit"
            disabled={queueing || cloudConnectionId.trim() === ''}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-tak-yellow px-4 text-sm font-black text-zinc-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">add_task</span>
            {queueing ? 'Encolando' : 'Encolar'}
          </button>
        </form>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">folder_managed</span>
          <h3 className="text-lg font-bold text-white">Fuente de facturación</h3>
        </div>
        <form onSubmit={handleConfigureBillingSource} className="border-b border-zinc-800 p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] items-end">
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Conexión</span>
              <select value={focusConnectionId} onChange={(event) => setFocusConnectionId(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow" required>
                {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name} · {connection.providerCode.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Origen</span>
              <select value={billingSourceMode} onChange={(event) => setBillingSourceMode(event.target.value as BillingSourceMode)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow">
                <option value="AUTO">Automático: FOCUS si está configurado; API directa si no</option>
                <option value="FOCUS">Solo exportación FOCUS</option>
                <option value="PROVIDER_API">Solo API del proveedor</option>
              </select>
            </label>
            <button type="submit" disabled={configuringBillingSource || focusConnectionId.trim() === ''} className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-100 px-4 text-sm font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60">
              {configuringBillingSource ? 'Guardando' : 'Guardar origen'}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">Cada trabajo conserva una sola procedencia. La configuración FOCUS siguiente solo se usa cuando el origen es FOCUS o AUTO y existe un export válido.</p>
        </form>
        <form onSubmit={handleConfigureFocus} className="p-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="space-y-2 lg:col-span-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Conexion</span>
              <select
                value={focusConnectionId}
                onChange={(event) => setFocusConnectionId(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
                required
              >
                {connections.length === 0 ? (
                  <option value="">Sin conexiones activas</option>
                ) : connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name} · {connection.providerCode.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Modo</span>
              <select
                value={focusMode}
                onChange={(event) => setFocusMode(event.target.value as 'location' | 'object')}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
              >
                <option value="location">Prefijo</option>
                <option value="object">Objeto directo</option>
              </select>
            </label>
            <label className="flex items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
              <input
                type="checkbox"
                checked={focusReplace}
                onChange={(event) => setFocusReplace(event.target.checked)}
                className="h-4 w-4 accent-tak-yellow"
              />
              <span className="text-sm font-bold text-zinc-300">Reemplazar lista</span>
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            {selectedFocusProvider === 'oci' && (
              <label className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Namespace OCI</span>
                <input
                  value={focusNamespace}
                  onChange={(event) => setFocusNamespace(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
                  required
                />
              </label>
            )}
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">{selectedFocusProvider === 'aws' ? 'Bucket S3' : 'Bucket OCI'}</span>
              <input
                value={focusBucket}
                onChange={(event) => setFocusBucket(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
                required
              />
            </label>
            <label className="space-y-2 lg:col-span-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">{focusMode === 'location' ? 'Prefijo' : 'Objeto'}</span>
              <input
                value={focusMode === 'location' ? focusPrefix : focusObjectKey}
                onChange={(event) => {
                  if (focusMode === 'location') {
                    setFocusPrefix(event.target.value);
                  } else {
                    setFocusObjectKey(event.target.value);
                  }
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
                required
              />
            </label>
            {selectedFocusProvider === 'aws' && (
              <label className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Region</span>
                <input
                  value={focusRegion}
                  onChange={(event) => setFocusRegion(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
                />
              </label>
            )}
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">FOCUS</span>
              <input
                value={focusVersion}
                onChange={(event) => setFocusVersion(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
                required
              />
            </label>
            {focusMode === 'location' && (
              <label className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Max objetos</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={focusMaxObjects}
                  onChange={(event) => setFocusMaxObjects(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-white outline-none focus:border-tak-yellow"
                  required
                />
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={configuringFocus || focusConnectionId.trim() === ''}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-black text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            {configuringFocus ? 'Guardando' : 'Guardar fuente FOCUS'}
          </button>
        </form>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">cloud_sync</span>
          <h3 className="text-lg font-bold text-white">Historial de ingesta</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <Th>Fecha</Th>
                <Th>Conexión</Th>
                <Th>Fuente</Th>
                <Th>Estado</Th>
                <Th>Intentos</Th>
                <Th>Rango objetivo</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={6} text="Cargando historial de ingesta..." />
              ) : jobs.length === 0 ? (
                <EmptyRow colSpan={6} text="Sin trabajos de ingesta registrados" />
              ) : jobs.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0 align-top">
                  <td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(job.createdAt)}</td>
                  <td className="p-4 text-sm font-medium text-white">{job.cloudConnectionId}</td>
                  <td className="p-4 text-sm text-zinc-300">{sourceTypeLabels[job.sourceType]}</td>
                  <td className="p-4">
                    <StatusBadge {...jobStatusStyles[job.status]} />
                    {job.status === 'FAILED' && job.errorMessage !== undefined && (
                      <p className="mt-1 text-[11px] leading-snug text-red-300/80 max-w-xs">{job.errorMessage}</p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-zinc-300">{job.attempts}/{job.maxAttempts}</td>
                  <td className="p-4 text-xs text-zinc-400">{formatDate(job.targetStart)} – {formatDate(job.targetEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">fact_check</span>
          <h3 className="text-lg font-bold text-white">Calidad de datos</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <Th>Observado</Th>
                <Th>Control</Th>
                <Th>Fuente</Th>
                <Th>Estado</Th>
                <Th>Esperado</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={5} text="Cargando controles de calidad..." />
              ) : checks.length === 0 ? (
                <EmptyRow colSpan={5} text="Sin controles de calidad registrados" />
              ) : checks.map((check) => (
                <tr key={check.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                  <td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(check.observedAt)}</td>
                  <td className="p-4 text-sm font-medium text-white">{check.checkName}</td>
                  <td className="p-4 text-sm text-zinc-300">{sourceTypeLabels[check.sourceType]}</td>
                  <td className="p-4"><StatusBadge {...qualityStatusStyles[check.status]} /></td>
                  <td className="p-4 text-xs text-zinc-400">{check.expectedAt !== undefined ? formatDateTime(check.expectedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
      {children}
    </th>
  );
}

function EmptyRow({ colSpan, text }: { readonly colSpan: number; readonly text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-6 text-center text-sm font-bold text-zinc-500">{text}</td>
    </tr>
  );
}

function StatusBadge({ label, className }: { readonly label: string; readonly className: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide w-fit inline-block ${className}`}>
      {label}
    </span>
  );
}

function ReadinessLine({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-1 text-xs font-medium text-zinc-300">{value}</p>
    </div>
  );
}

function CoverageCard({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function FreshnessCard({
  label,
  signal,
}: {
  readonly label: string;
  readonly signal: { readonly status: 'FRESH' | 'STALE' | 'NO_DATA'; readonly observedAt?: string };
}) {
  const className = signal.status === 'FRESH'
    ? 'text-green-300'
    : signal.status === 'STALE' ? 'text-tak-yellow' : 'text-zinc-500';
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Frescura · {label}</p>
      <p className={`mt-2 text-sm font-black ${className}`}>{freshnessLabels[signal.status]}</p>
      <p className="mt-1 text-xs text-zinc-500">{signal.observedAt !== undefined ? formatDateTime(signal.observedAt) : 'No se ha observado información.'}</p>
    </div>
  );
}

function CoverageReasons({
  label,
  reasons,
}: {
  readonly label: string;
  readonly reasons: Partial<Record<ResourceLinkReasonCode, number>>;
}) {
  const entries = Object.entries(reasons).filter(([, count]) => typeof count === 'number' && count > 0) as [ResourceLinkReasonCode, number][];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs font-bold text-zinc-300">{label}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-green-300">Sin registros pendientes.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          {entries.map(([reason, count]) => <li key={reason} className="flex justify-between gap-3"><span>{resourceLinkReasonLabels[reason]}</span><span className="font-bold text-tak-yellow">{count}</span></li>)}
        </ul>
      )}
    </div>
  );
}

function formatMetadataCounts(counts: Readonly<Record<string, number>>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return 'Sin metadata';
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(' · ');
}

function buildFocusValues(
  provider: string | undefined,
  input: {
    readonly mode: 'location' | 'object';
    readonly bucket: string;
    readonly prefix: string;
    readonly objectKey: string;
    readonly namespaceName: string;
    readonly region: string;
    readonly focusVersion: string;
    readonly maxObjects: string;
  },
): Readonly<Record<string, string>> {
  if (provider === 'aws') {
    return {
      bucket: input.bucket.trim(),
      ...(input.mode === 'location'
        ? { prefix: input.prefix.trim(), 'max-objects': input.maxObjects.trim() }
        : { key: input.objectKey.trim() }),
      ...(input.region.trim() !== '' ? { region: input.region.trim() } : {}),
      'focus-version': input.focusVersion.trim(),
    };
  }

  return {
    'namespace-name': input.namespaceName.trim(),
    'bucket-name': input.bucket.trim(),
    ...(input.mode === 'location'
      ? { prefix: input.prefix.trim(), 'max-objects': input.maxObjects.trim() }
      : { 'object-name': input.objectKey.trim() }),
    'focus-version': input.focusVersion.trim(),
  };
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));
}

function toDatetimeLocal(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}
