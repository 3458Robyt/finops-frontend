import { useCallback, useEffect, useState } from 'react';
import CloudOnboarding from '../components/CloudOnboarding';
import { DataQualityPanel, IngestionHistoryPanel } from '../components/ingestion/IngestionActivityPanels';
import BillingSourcePanel, { type FocusFormState } from '../components/ingestion/BillingSourcePanel';
import { QueueIngestionPanel, TechnicalMetricBackfillPanel } from '../components/ingestion/IngestionControls';
import IngestionReadinessPanel from '../components/ingestion/IngestionReadinessPanel';
import ResourceLinkagePanel from '../components/ingestion/ResourceLinkagePanel';
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
  type IngestionJobHistoryItem,
  type IngestionReadinessConnectionSummary,
  type IngestionReadinessIssue,
  type IngestionSourceType,
  type ResourceLinkageReadinessResponse,
} from '../services/api';

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

  const handleFocusFormChange = (patch: Partial<FocusFormState>): void => {
    if (patch.connectionId !== undefined) setFocusConnectionId(patch.connectionId);
    if (patch.mode !== undefined) setFocusMode(patch.mode);
    if (patch.bucket !== undefined) setFocusBucket(patch.bucket);
    if (patch.prefix !== undefined) setFocusPrefix(patch.prefix);
    if (patch.objectKey !== undefined) setFocusObjectKey(patch.objectKey);
    if (patch.namespace !== undefined) setFocusNamespace(patch.namespace);
    if (patch.region !== undefined) setFocusRegion(patch.region);
    if (patch.version !== undefined) setFocusVersion(patch.version);
    if (patch.maxObjects !== undefined) setFocusMaxObjects(patch.maxObjects);
    if (patch.replace !== undefined) setFocusReplace(patch.replace);
  };

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

      <IngestionReadinessPanel
        ok={readinessOk}
        generatedAt={readinessGeneratedAt}
        connections={readinessConnections}
        issues={readinessIssues}
        loading={loading}
      />

      {resourceLinkage !== null && <ResourceLinkagePanel readiness={resourceLinkage} />}

      <TechnicalMetricBackfillPanel
        connections={connections}
        connectionId={backfillConnectionId}
        lookbackDays={backfillLookbackDays}
        windowHours={backfillWindowHours}
        submitting={backfilling}
        onConnectionChange={setBackfillConnectionId}
        onLookbackDaysChange={setBackfillLookbackDays}
        onWindowHoursChange={setBackfillWindowHours}
        onSubmit={handleBackfill}
      />

      <QueueIngestionPanel
        connections={connections}
        connectionId={cloudConnectionId}
        sourceType={sourceType}
        targetStart={targetStart}
        targetEnd={targetEnd}
        submitting={queueing}
        onConnectionChange={setCloudConnectionId}
        onSourceTypeChange={setSourceType}
        onTargetStartChange={setTargetStart}
        onTargetEndChange={setTargetEnd}
        onSubmit={handleQueueJob}
      />

      <BillingSourcePanel
        connections={connections}
        provider={selectedFocusProvider}
        billingSourceMode={billingSourceMode}
        focus={{
          connectionId: focusConnectionId,
          mode: focusMode,
          bucket: focusBucket,
          prefix: focusPrefix,
          objectKey: focusObjectKey,
          namespace: focusNamespace,
          region: focusRegion,
          version: focusVersion,
          maxObjects: focusMaxObjects,
          replace: focusReplace,
        }}
        configuringBillingSource={configuringBillingSource}
        configuringFocus={configuringFocus}
        onBillingSourceModeChange={setBillingSourceMode}
        onFocusChange={handleFocusFormChange}
        onBillingSubmit={handleConfigureBillingSource}
        onFocusSubmit={handleConfigureFocus}
      />

      <IngestionHistoryPanel jobs={jobs} loading={loading} />

      <DataQualityPanel checks={checks} loading={loading} />

    </div>
  );
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

function toDatetimeLocal(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}
