import { useCallback, useEffect, useState } from 'react';
import { useAccessToken } from '../../auth/authSession';
import {
  archiveMasterAdminIngestionJob,
  cancelMasterAdminIngestionJob,
  deleteMasterAdminPendingJobs,
  fetchMasterAdminIngestionJobs,
} from '../../services/masterAdminApi';
import type { MasterAdminIngestionJob, MasterAdminIngestionJobSummary } from '../../services/types/admin';
import type { IngestionJobStatus, IngestionSourceType } from '../../services/types/ingestion';

export interface MasterAdminIngestionJobsController {
  readonly jobs: readonly MasterAdminIngestionJob[];
  readonly summary: MasterAdminIngestionJobSummary;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly message: string | null;
  readonly error: string | null;
  readonly includeArchived: boolean;
  readonly tenantId: string;
  readonly status: IngestionJobStatus | '';
  readonly sourceType: IngestionSourceType | '';
  readonly hasMore: boolean;
  readonly setIncludeArchived: (value: boolean) => void;
  readonly setTenantId: (value: string) => void;
  readonly setStatus: (value: IngestionJobStatus | '') => void;
  readonly setSourceType: (value: IngestionSourceType | '') => void;
  readonly reload: () => Promise<void>;
  readonly purgePending: () => Promise<void>;
  readonly cancel: (jobId: string) => Promise<void>;
  readonly archive: (jobId: string) => Promise<void>;
}

const emptySummary: MasterAdminIngestionJobSummary = {
  total: 0,
  pending: 0,
  running: 0,
  success: 0,
  failed: 0,
  cancelled: 0,
  skipped: 0,
};

export function useMasterAdminIngestionJobsController(): MasterAdminIngestionJobsController {
  const token = useAccessToken();
  const [jobs, setJobs] = useState<readonly MasterAdminIngestionJob[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [status, setStatus] = useState<IngestionJobStatus | ''>('');
  const [sourceType, setSourceType] = useState<IngestionSourceType | ''>('');
  const [hasMore, setHasMore] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    const response = await fetchMasterAdminIngestionJobs(token, {
      ...(tenantId !== '' ? { tenantId } : {}),
      ...(status !== '' ? { status } : {}),
      ...(sourceType !== '' ? { sourceType } : {}),
      includeArchived,
      limit: 100,
    });
    setJobs(response.jobs);
    setSummary(response.summary);
    setHasMore(response.hasMore);
  }, [includeArchived, sourceType, status, tenantId, token]);

  useEffect(() => {
    setLoading(true);
    void reload().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los jobs globales')).finally(() => setLoading(false));
  }, [reload]);

  const runAction = useCallback(async (action: () => Promise<string | undefined>, successMessage: string, fallback: string): Promise<void> => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const actionMessage = await action();
      await reload();
      setMessage(actionMessage ?? successMessage);
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : fallback);
    } finally {
      setSaving(false);
    }
  }, [reload]);

  const purgePending = useCallback(async () => {
    await runAction(async () => {
      const response = await deleteMasterAdminPendingJobs(token);
      return `${response.result.deletedCount} jobs pendientes eliminados.`;
    }, 'Cola pendiente limpiada correctamente.', 'No fue posible eliminar los jobs pendientes');
  }, [runAction, token]);

  const cancel = useCallback(async (jobId: string) => {
    await runAction(() => cancelMasterAdminIngestionJob(token, jobId).then(() => undefined), 'Job cancelado o cancelación solicitada.', 'No fue posible cancelar el job');
  }, [runAction, token]);

  const archive = useCallback(async (jobId: string) => {
    await runAction(() => archiveMasterAdminIngestionJob(token, jobId).then(() => undefined), 'Job archivado.', 'No fue posible archivar el job');
  }, [runAction, token]);

  return { jobs, summary, loading, saving, message, error, includeArchived, tenantId, status, sourceType, hasMore, setIncludeArchived, setTenantId, setStatus, setSourceType, reload, purgePending, cancel, archive };
}
