import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAccessToken } from '../auth/authSession';
import type { FocusFormState } from '../components/ingestion/BillingSourcePanel';
import {
  configureBillingSource,
  configureFocusSource,
  fetchCloudConnections,
  fetchDataQualityChecks,
  fetchIngestionHistory,
  fetchIngestionReadiness,
  fetchResourceLinkageReadiness,
  queueIngestionJob,
  queueTechnicalMetricBackfill,
  type BillingSourceMode,
  type CloudConnectionSummary,
  type DataQualityCheckItem,
  type IngestionJobHistoryItem,
  type IngestionReadinessConnectionSummary,
  type IngestionReadinessIssue,
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
  const [focus, setFocus] = useState<FocusFormState>(initialFocus);
  const [billingSourceMode, setBillingSourceMode] = useState<BillingSourceMode>('AUTO');
  const [configuringBillingSource, setConfiguringBillingSource] = useState(false);
  const [configuringFocus, setConfiguringFocus] = useState(false);
  const [sourceType, setSourceType] = useState<IngestionSourceType>('TECHNICAL_METRIC');
  const [targetStart, setTargetStart] = useState(() => toDatetimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [targetEnd, setTargetEnd] = useState(() => toDatetimeLocal(new Date()));

  const loadData = useCallback(async (active: () => boolean): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [connectionResponse, historyResponse, qualityResponse, readinessResponse, linkageResponse] = await Promise.all([
        fetchCloudConnections(token),
        fetchIngestionHistory(token),
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
      setResourceLinkage(linkageResponse.readiness);
      const defaultConnectionId = connectionResponse.connections[0]?.id ?? historyResponse.jobs[0]?.cloudConnectionId ?? '';
      setCloudConnectionId((current) => current === '' ? defaultConnectionId : current);
      setBackfillConnectionId((current) => current === '' ? defaultConnectionId : current);
      setFocus((current) => ({
        ...current,
        connectionId: current.connectionId === '' ? connectionResponse.connections[0]?.id ?? '' : current.connectionId,
      }));
    } catch (cause: unknown) {
      if (!active()) return;
      setJobs([]);
      setChecks([]);
      setConnections([]);
      setReadinessOk(false);
      setReadinessGeneratedAt(null);
      setReadinessConnections([]);
      setReadinessIssues([]);
      setResourceLinkage(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ingesta.');
    } finally {
      if (active()) setLoading(false);
    }
  }, [token]);

  const refresh = useCallback(() => loadData(() => true), [loadData]);

  useEffect(() => {
    let active = true;
    void loadData(() => active);
    return () => { active = false; };
  }, [loadData]);

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
    jobs, checks, connections, readinessOk, readinessGeneratedAt, readinessConnections, readinessIssues, resourceLinkage,
    loading, error, queueing, backfilling, queueMessage, cloudConnectionId, backfillConnectionId, backfillLookbackDays,
    backfillWindowHours, focus, billingSourceMode, configuringBillingSource, configuringFocus, sourceType, targetStart,
    targetEnd, selectedFocusProvider, setCloudConnectionId, setBackfillConnectionId, setBackfillLookbackDays,
    setBackfillWindowHours, setBillingSourceMode, setSourceType, setTargetStart, setTargetEnd, handleQueueJob,
    handleBackfill, handleFocusChange, handleConfigureBillingSource, handleConfigureFocus, refresh,
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
