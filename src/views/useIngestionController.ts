import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAccessToken } from '../auth/authSession';
import type { FocusFormState } from '../components/ingestion/BillingSourcePanel';
import {
  configureBillingSource,
  configureFocusSource,
  cancelIngestionJob,
  archiveIngestionJob,
  fetchCloudConnections,
  fetchDataQualityChecks,
  fetchIngestionHistory,
  fetchIngestionReadiness,
  fetchMetricCoverage,
  fetchResourceLinkageReadiness,
  queueIngestionJob,
  queueTechnicalMetricBackfill,
  type BillingSourceMode,
  type CloudConnectionSummary,
  type DataQualityCheckItem,
  type IngestionJobHistoryItem,
  type IngestionReadinessConnectionSummary,
  type IngestionReadinessIssue,
  type IngestionOperationalReadiness,
  type IngestionMetricCoverageResponse,
  type IngestionSourceType,
  type ResourceLinkageReadinessResponse,
} from '../services/api';

const initialFocus: FocusFormState = {
  connectionId: '',
  mode: 'location',
  bucket: '',
  prefix: '',
  objectKey: '',
  namespace: '',
  region: '',
  version: '1.0',
  maxObjects: '100',
  replace: false,
};

export function useIngestionController() {
  const token = useAccessToken();
  const [jobs, setJobs] = useState<readonly IngestionJobHistoryItem[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [checks, setChecks] = useState<readonly DataQualityCheckItem[]>([]);
  const [connections, setConnections] = useState<readonly CloudConnectionSummary[]>([]);
  const [readinessOk, setReadinessOk] = useState(false);
  const [readinessGeneratedAt, setReadinessGeneratedAt] = useState<string | null>(null);
  const [readinessConnections, setReadinessConnections] = useState<readonly IngestionReadinessConnectionSummary[]>([]);
  const [readinessIssues, setReadinessIssues] = useState<readonly IngestionReadinessIssue[]>([]);
  const [operationalReadiness, setOperationalReadiness] = useState<IngestionOperationalReadiness | null>(null);
  const [resourceLinkage, setResourceLinkage] = useState<ResourceLinkageReadinessResponse['readiness'] | null>(null);
  const [metricCoverage, setMetricCoverage] = useState<IngestionMetricCoverageResponse['coverage'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [cloudConnectionId, setCloudConnectionId] = useState('');
  const [backfillConnectionId, setBackfillConnectionId] = useState('');
  const [backfillLookbackDays, setBackfillLookbackDays] = useState('90');
  const [backfillWindowHours, setBackfillWindowHours] = useState('24');
  const [focus, setFocus] = useState<FocusFormState>(initialFocus);
  const [billingSourceMode, setBillingSourceMode] = useState<BillingSourceMode>('AUTO');
  const [configuringBillingSource, setConfiguringBillingSource] = useState(false);
  const [configuringFocus, setConfiguringFocus] = useState(false);
  const [sourceType, setSourceType] = useState<IngestionSourceType>('TECHNICAL_METRIC');
  const [targetStart, setTargetStart] = useState(() => toDatetimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [targetEnd, setTargetEnd] = useState(() => toDatetimeLocal(new Date()));

  const loadData = useCallback(async (
    active: () => boolean,
    options: { readonly showLoading?: boolean } = {},
  ): Promise<void> => {
    const showLoading = options.showLoading ?? true;
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const [connectionResponse, historyResponse, qualityResponse, readinessResponse, linkageResponse] = await Promise.all([
        fetchCloudConnections(token),
        fetchIngestionHistory(token, undefined, includeArchived),
        fetchDataQualityChecks(token),
        fetchIngestionReadiness(token),
        fetchResourceLinkageReadiness(token),
      ]);
      if (!active()) return;

      setConnections(connectionResponse.connections);
      setJobs(historyResponse.jobs);
      setChecks(qualityResponse.checks);
      setReadinessOk(readinessResponse.readiness.ok);
      setReadinessGeneratedAt(readinessResponse.readiness.generatedAt);
      setReadinessConnections(readinessResponse.readiness.connections);
      setReadinessIssues(readinessResponse.readiness.issues);
      setOperationalReadiness(readinessResponse.readiness.operational ?? null);
      setResourceLinkage(linkageResponse.readiness);
      const defaultConnectionId = connectionResponse.connections[0]?.id ?? historyResponse.jobs[0]?.cloudConnectionId ?? '';
      if (defaultConnectionId !== '') {
        try {
          const coverageResponse = await fetchMetricCoverage(token, defaultConnectionId, { limit: 100 });
          if (active()) setMetricCoverage(coverageResponse.coverage);
        } catch {
          if (active()) setMetricCoverage(null);
        }
      } else if (active()) {
        setMetricCoverage(null);
      }
      setCloudConnectionId((current) => current === '' ? defaultConnectionId : current);
      setBackfillConnectionId((current) => current === '' ? defaultConnectionId : current);
      setFocus((current) => ({
        ...current,
        connectionId: current.connectionId === '' ? connectionResponse.connections[0]?.id ?? '' : current.connectionId,
      }));
    } catch (cause: unknown) {
      if (!active()) return;
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ingesta.');
    } finally {
      if (active() && showLoading) setLoading(false);
    }
  }, [includeArchived, token]);

  const refresh = useCallback(() => loadData(() => true, { showLoading: false }), [loadData]);

  const refreshJobs = useCallback(async (): Promise<void> => {
    try {
      const response = await fetchIngestionHistory(token, 100, includeArchived);
      setJobs((current) => areIngestionJobsEqual(current, response.jobs) ? current : response.jobs);
    } catch {
      // The operational panel keeps its last known state during a transient poll failure.
    }
  }, [includeArchived, token]);

  useEffect(() => {
    let active = true;
    void loadData(() => active);
    return () => { active = false; };
  }, [loadData]);

  useEffect(() => {
    const hasActiveJobs = jobs.some((job) => job.status === 'PENDING' || job.status === 'RUNNING'
      || (job.projectionStatus !== undefined && ['PENDING', 'RUNNING'].includes(job.projectionStatus)));
    if (!hasActiveJobs) return undefined;

    const pollIfActive = (): void => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      void refreshJobs();
    };
    const timer = window.setInterval(pollIfActive, 4_000);
    window.addEventListener('online', pollIfActive);
    document.addEventListener('visibilitychange', pollIfActive);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', pollIfActive);
      document.removeEventListener('visibilitychange', pollIfActive);
    };
  }, [jobs, refreshJobs]);

  const handleCancelJob = useCallback(async (jobId: string): Promise<void> => {
    setError(null);
    try {
      await cancelIngestionJob(token, jobId);
      setQueueMessage('Cancelación solicitada. El trabajo conserva su trazabilidad.');
      await refreshJobs();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cancelar el trabajo.');
    }
  }, [refreshJobs, token]);

  const handleArchiveJob = useCallback(async (jobId: string): Promise<void> => {
    setError(null);
    try {
      await archiveIngestionJob(token, jobId);
      setQueueMessage('Trabajo archivado. No se eliminó del registro histórico.');
      await refreshJobs();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo archivar el trabajo.');
    }
  }, [refreshJobs, token]);

  const handleQueueJob = useCallback(async (event: FormEvent<HTMLFormElement>) => {
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
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo encolar la ingesta.');
    } finally {
      setQueueing(false);
    }
  }, [cloudConnectionId, refresh, sourceType, targetEnd, targetStart, token]);

  const handleBackfill = useCallback(async (event: FormEvent<HTMLFormElement>) => {
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
      setQueueMessage(`Backfill tecnico encolado: ${response.backfill.createdJobs.length} jobs creados, ${response.backfill.skippedWindows.length} ventanas omitidas.`);
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo encolar el backfill tecnico.');
    } finally {
      setBackfilling(false);
    }
  }, [backfillConnectionId, backfillLookbackDays, backfillWindowHours, refresh, token]);

  const handleFocusChange = useCallback((patch: Partial<FocusFormState>): void => {
    setFocus((current) => ({ ...current, ...patch }));
  }, []);

  const selectedFocusProvider = connections.find((connection) => connection.id === focus.connectionId)?.providerCode.toLowerCase();

  const handleConfigureBillingSource = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfiguringBillingSource(true);
    setQueueMessage(null);
    setError(null);
    try {
      await configureBillingSource(token, focus.connectionId.trim(), billingSourceMode);
      setQueueMessage(`Fuente de facturación configurada: ${billingSourceMode}.`);
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo configurar la fuente de facturación.');
    } finally {
      setConfiguringBillingSource(false);
    }
  }, [billingSourceMode, focus.connectionId, refresh, token]);

  const handleConfigureFocus = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfiguringFocus(true);
    setQueueMessage(null);
    setError(null);
    try {
      await configureFocusSource(token, {
        cloudConnectionId: focus.connectionId.trim(),
        mode: focus.mode,
        replace: focus.replace,
        values: buildFocusValues(selectedFocusProvider, focus),
      });
      setQueueMessage('Fuente FOCUS configurada.');
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo configurar la fuente FOCUS.');
    } finally {
      setConfiguringFocus(false);
    }
  }, [focus, refresh, selectedFocusProvider, token]);

  return {
    jobs, checks, connections, readinessOk, readinessGeneratedAt, readinessConnections, readinessIssues, operationalReadiness, resourceLinkage, metricCoverage, includeArchived,
    loading, error, queueing, backfilling, queueMessage, cloudConnectionId, backfillConnectionId, backfillLookbackDays,
    backfillWindowHours, focus, billingSourceMode, configuringBillingSource, configuringFocus, sourceType, targetStart,
    targetEnd, selectedFocusProvider, setCloudConnectionId, setBackfillConnectionId, setBackfillLookbackDays,
    setBackfillWindowHours, setBillingSourceMode, setSourceType, setTargetStart, setTargetEnd, handleQueueJob,
    handleBackfill, handleFocusChange, handleConfigureBillingSource, handleConfigureFocus, handleCancelJob, handleArchiveJob, setIncludeArchived, refresh,
  };
}

function buildFocusValues(provider: string | undefined, input: FocusFormState): Readonly<Record<string, string>> {
  if (provider === 'aws') {
    return {
      bucket: input.bucket.trim(),
      ...(input.mode === 'location' ? { prefix: input.prefix.trim(), 'max-objects': input.maxObjects.trim() } : { key: input.objectKey.trim() }),
      ...(input.region.trim() !== '' ? { region: input.region.trim() } : {}),
      'focus-version': input.version.trim(),
    };
  }

  return {
    'namespace-name': input.namespace.trim(),
    'bucket-name': input.bucket.trim(),
    ...(input.mode === 'location' ? { prefix: input.prefix.trim(), 'max-objects': input.maxObjects.trim() } : { 'object-name': input.objectKey.trim() }),
    'focus-version': input.version.trim(),
  };
}

function toDatetimeLocal(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function areIngestionJobsEqual(
  current: readonly IngestionJobHistoryItem[],
  next: readonly IngestionJobHistoryItem[],
): boolean {
  if (current.length !== next.length) return false;
  return current.every((job, index) => {
    const candidate = next[index];
    return candidate !== undefined
      && job.id === candidate.id
      && job.status === candidate.status
      && job.updatedAt === candidate.updatedAt
      && job.errorMessage === candidate.errorMessage
      && job.projectionStatus === candidate.projectionStatus
      && job.projectionAttempts === candidate.projectionAttempts
      && job.projectionErrorMessage === candidate.projectionErrorMessage
      && job.projectionCompletedAt === candidate.projectionCompletedAt
      && JSON.stringify(job.progress ?? null) === JSON.stringify(candidate.progress ?? null)
      && JSON.stringify(job.resultSummary ?? null) === JSON.stringify(candidate.resultSummary ?? null);
  });
}
