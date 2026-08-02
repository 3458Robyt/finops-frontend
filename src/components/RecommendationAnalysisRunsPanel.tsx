import { useEffect, useMemo, useState } from 'react';

import {
  cancelRecommendationAnalysis,
  fetchRecommendationAnalysisPreview,
  fetchRecommendationAnalysisRun,
  fetchRecommendationAnalysisRuns,
  queueRecommendationAnalysis,
  retryRecommendationAnalysis,
  type ApiRole,
  type RecommendationAnalysisPreview,
  type RecommendationAnalysisRun,
  type RecommendationAnalysisStage,
  type RecommendationAnalysisStatus,
} from '../services/api';

interface Props {
  readonly token: string;
  readonly role: ApiRole;
  readonly onOpenRecommendation?: (recommendationId: string) => void;
}

const managerRoles = new Set<ApiRole>([
  'MASTER_ADMIN',
  'OPERATOR_ADMIN',
  'ADMIN',
  'FINOPS_TECHNICIAN',
]);

const stages: readonly RecommendationAnalysisStage[] = [
  'QUEUED',
  'SELECTING_DATA',
  'DETERMINISTIC_ANALYSIS',
  'EVIDENCE_GATE',
  'AI_GENERATION',
  'AI_AUDIT',
  'PERSISTENCE',
  'NOTIFICATION',
  'FINISHED',
];

const stageLabels: Record<RecommendationAnalysisStage, string> = {
  QUEUED: 'En cola',
  SELECTING_DATA: 'Seleccionando datos',
  DETERMINISTIC_ANALYSIS: 'Análisis determinístico',
  EVIDENCE_GATE: 'Validando evidencia',
  AI_GENERATION: 'Generación IA',
  AI_AUDIT: 'Auditoría independiente',
  PERSISTENCE: 'Publicando recomendaciones',
  NOTIFICATION: 'Creando notificación',
  FINISHED: 'Finalizada',
};

const statusLabels: Record<RecommendationAnalysisStatus, string> = {
  PENDING: 'Pendiente',
  RUNNING: 'En ejecución',
  COMPLETED: 'Completada',
  PARTIAL: 'Completada parcialmente',
  SKIPPED: 'Omitida',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
};

function outcomeLabel(run: RecommendationAnalysisRun): string {
  if (run.errorCode === 'INSUFFICIENT_EVIDENCE') return 'Evidencia insuficiente';
  if (run.errorCode === 'NO_NEW_OPPORTUNITIES') return 'Sin oportunidades nuevas';
  if (run.errorCode === 'AI_AUDIT_REJECTED') return 'Rechazada por el auditor';
  if (run.errorCode === 'ANALYSIS_PROVIDER_ERROR') return 'Proveedor IA no disponible';
  return statusLabels[run.status];
}

export default function RecommendationAnalysisRunsPanel({
  token,
  role,
  onOpenRecommendation,
}: Props) {
  const canManage = managerRoles.has(role);
  const [preview, setPreview] = useState<RecommendationAnalysisPreview | null>(null);
  const [runs, setRuns] = useState<readonly RecommendationAnalysisRun[]>([]);
  const [selected, setSelected] = useState<RecommendationAnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasActiveRun = useMemo(
    () => runs.some((run) => run.status === 'PENDING' || run.status === 'RUNNING'),
    [runs],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchRecommendationAnalysisPreview(token, { signal: controller.signal }),
      fetchRecommendationAnalysisRuns(token, { signal: controller.signal }),
    ])
      .then(([previewResponse, runsResponse]) => {
        setPreview(previewResponse.preview);
        setRuns(runsResponse.runs);
        setSelected(runsResponse.runs[0] ?? null);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(readError(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!hasActiveRun) return;
    const controller = new AbortController();
    const interval = window.setInterval(() => {
      void fetchRecommendationAnalysisRuns(token, { signal: controller.signal })
        .then(async (response) => {
          const selectedId = selected?.id;
          let selectedRun: RecommendationAnalysisRun | null = null;
          if (selectedId !== undefined) {
            const detail = await fetchRecommendationAnalysisRun(token, selectedId, {
              signal: controller.signal,
            });
            selectedRun = detail.run;
          }
          setRuns(response.runs);
          if (selectedRun !== null) setSelected(selectedRun);
        })
        .catch((requestError: unknown) => {
          if (!controller.signal.aborted) setError(readError(requestError));
        });
    }, 5000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [hasActiveRun, selected?.id, token]);

  const handleQueue = async () => {
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      const response = await queueRecommendationAnalysis(token);
      setRuns((current) => [response.run, ...current.filter((run) => run.id !== response.run.id)]);
      setSelected(response.run);
      setMessage(response.reused
        ? 'Ya había una corrida equivalente en curso; se muestra su progreso.'
        : 'La corrida quedó en cola y continuará en segundo plano.');
    } catch (requestError: unknown) {
      setError(readError(requestError));
    } finally {
      setWorking(false);
    }
  };

  const handleSelect = async (run: RecommendationAnalysisRun) => {
    setSelected(run);
    setError(null);
    try {
      const response = await fetchRecommendationAnalysisRun(token, run.id);
      setSelected(response.run);
    } catch (requestError: unknown) {
      setError(readError(requestError));
    }
  };

  const handleCancel = async () => {
    if (selected === null) return;
    setWorking(true);
    setError(null);
    try {
      const response = await cancelRecommendationAnalysis(token, selected.id);
      replaceRun(response.run);
      setMessage('La corrida pendiente fue cancelada.');
    } catch (requestError: unknown) {
      setError(readError(requestError));
    } finally {
      setWorking(false);
    }
  };

  const handleRetry = async () => {
    if (selected === null) return;
    setWorking(true);
    setError(null);
    try {
      const response = await retryRecommendationAnalysis(token, selected.id);
      setRuns((current) => [response.run, ...current]);
      setSelected(response.run);
      setMessage('El reintento quedó en cola.');
    } catch (requestError: unknown) {
      setError(readError(requestError));
    } finally {
      setWorking(false);
    }
  };

  const replaceRun = (run: RecommendationAnalysisRun) => {
    setRuns((current) => current.map((item) => (item.id === run.id ? run : item)));
    setSelected(run);
  };

  if (loading) {
    return <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 text-sm font-bold text-zinc-400">Preparando el análisis de datos disponibles...</p>;
  }

  return (
    <section className="space-y-4">
      {error !== null && <Notice tone="error">{error}</Notice>}
      {message !== null && <Notice tone="success">{message}</Notice>}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">Readiness previo</p>
            <h2 className="mt-1 text-xl font-black text-white">Análisis gobernado del tenant activo</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Primero se evalúan costos, consumo, inventario y métricas. La IA solo se usa cuando la evidencia permite una recomendación auditable.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => void handleQueue()}
              disabled={working || hasActiveRun}
              className="rounded-lg bg-tak-yellow px-5 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasActiveRun ? 'Análisis en curso' : 'Analizar datos disponibles'}
            </button>
          )}
        </div>
        {preview === null ? (
          <Notice tone="warning">No fue posible determinar un período analizable para el tenant activo.</Notice>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Período disponible" value={`${formatDate(preview.periodStart)} – ${formatDate(preview.periodEnd)}`} />
              <Metric label="Recursos evaluables" value={String(preview.resourcesEvaluated)} />
              <Metric label="Candidatos con evidencia" value={String(preview.candidatesFound)} />
              <Metric label="Descartados o aplazados" value={String(preview.candidatesSkipped)} />
            </div>
            <p className="mt-4 text-sm font-bold text-zinc-300">{preview.readinessReport.summary}</p>
            {preview.candidatesFound === 0 && (
              <Notice tone="warning">
                No hay datos suficientes para llamar a la IA. La corrida registrará los motivos sin generar recomendaciones.
              </Notice>
            )}
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="text-sm font-black text-white">Historial de corridas</h3>
          <div className="mt-3 space-y-2">
            {runs.length === 0 ? (
              <p className="text-sm text-zinc-500">Todavía no se han ejecutado análisis para este tenant.</p>
            ) : runs.map((run) => (
              <button
                type="button"
                key={run.id}
                onClick={() => void handleSelect(run)}
                className={`w-full rounded-lg border p-3 text-left ${
                  selected?.id === run.id ? 'border-tak-yellow bg-tak-yellow/5' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-white">{statusLabels[run.status]}</span>
                  <span className="text-[10px] font-bold text-zinc-500">{formatDateTime(run.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{stageLabels[run.stage]}</p>
              </button>
            ))}
          </div>
        </div>

        <RunDetail
          run={selected}
          canManage={canManage}
          working={working}
          onCancel={() => void handleCancel()}
          onRetry={() => void handleRetry()}
          onOpenRecommendation={onOpenRecommendation}
        />
      </div>
    </section>
  );
}

function RunDetail({
  run,
  canManage,
  working,
  onCancel,
  onRetry,
  onOpenRecommendation,
}: {
  readonly run: RecommendationAnalysisRun | null;
  readonly canManage: boolean;
  readonly working: boolean;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
  readonly onOpenRecommendation?: (recommendationId: string) => void;
}) {
  if (run === null) {
    return <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-500">Selecciona una corrida para revisar su detalle.</div>;
  }
  const progress = Math.round(((stages.indexOf(run.stage) + 1) / stages.length) * 100);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">{outcomeLabel(run)}</p>
          <h3 className="mt-1 text-lg font-black text-white">{stageLabels[run.stage]}</h3>
          <p className="mt-1 text-xs text-zinc-500">Corrida {run.id}</p>
        </div>
        <div className="flex gap-2">
          {canManage && run.status === 'PENDING' && (
            <button type="button" disabled={working} onClick={onCancel} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 disabled:opacity-50">Cancelar</button>
          )}
          {canManage && run.status === 'FAILED' && (
            <button type="button" disabled={working} onClick={onRetry} className="rounded-lg bg-tak-yellow px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-50">Reintentar</button>
          )}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-tak-yellow transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Recursos evaluados" value={String(run.resourcesEvaluated)} />
        <Metric label="Candidatos" value={String(run.candidatesFound)} />
        <Metric label="Descartados o aplazados" value={String(run.candidatesSkipped)} />
        <Metric label="Generadas" value={String(run.recommendationsGenerated)} />
        <Metric label="Rechazadas por auditor" value={String(run.recommendationsRejected)} />
        <Metric label="Publicadas" value={String(run.recommendationsPersisted)} />
      </div>
      {run.errorMessage !== undefined && (
        <Notice tone={run.status === 'FAILED' ? 'error' : 'warning'}>{run.errorMessage}</Notice>
      )}
      {run.candidateResults !== undefined && run.candidateResults.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-black text-white">Decisiones por candidato</h4>
          <div className="mt-2 space-y-2">
            {run.candidateResults.map((candidate) => (
              <article key={candidate.candidateId} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-zinc-200">{candidate.resourceId ?? candidate.candidateId}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-tak-yellow">{candidate.outcome}</span>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-400">
                  {candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      )}
      {run.recommendations.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-black text-white">Recomendaciones publicadas</h4>
          <div className="mt-2 space-y-2">
            {run.recommendations.map((recommendation) => (
              <button
                type="button"
                key={recommendation.recommendationId}
                disabled={onOpenRecommendation === undefined}
                onClick={() => onOpenRecommendation?.(recommendation.recommendationId)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-left text-sm font-bold text-zinc-200 hover:border-tak-yellow disabled:cursor-default"
              >
                <span>{recommendation.title}</span>
                <span className="material-symbols-outlined text-base text-tak-yellow">open_in_new</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function Notice({ tone, children }: { readonly tone: 'success' | 'warning' | 'error'; readonly children: React.ReactNode }) {
  const colors = tone === 'error'
    ? 'border-red-500/30 bg-red-500/10 text-red-200'
    : tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${colors}`}>{children}</p>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible completar la operación de análisis.';
}
