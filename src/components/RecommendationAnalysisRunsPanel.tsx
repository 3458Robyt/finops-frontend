import { useEffect, useMemo, useState } from 'react';
import { useAccessToken } from '../auth/authSession';

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
} from '../services/api';
import RecommendationAnalysisRunDetail from './RecommendationAnalysisRunDetail';
import {
  formatDate,
  formatDateTime,
  stageLabels,
  statusLabels,
} from './recommendationAnalysisPresentation';
import { Metric, Notice } from './RecommendationAnalysisUi';

interface Props {
  readonly role: ApiRole;
  readonly onOpenRecommendation?: (recommendationId: string) => void;
}

const managerRoles = new Set<ApiRole>([
  'MASTER_ADMIN',
  'OPERATOR_ADMIN',
  'LEAD_TECHNICIAN',
  'ADMIN',
  'FINOPS_TECHNICIAN',
]);

export default function RecommendationAnalysisRunsPanel({
  role,
  onOpenRecommendation,
}: Props) {
  const token = useAccessToken();
  const canManage = managerRoles.has(role);
  const [preview, setPreview] = useState<RecommendationAnalysisPreview | null>(null);
  const [runs, setRuns] = useState<readonly RecommendationAnalysisRun[]>([]);
  const [selected, setSelected] = useState<RecommendationAnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasActiveRun = useMemo(
    () => runs.some((run) => run.status === 'PENDING' || run.status === 'RUNNING'),
    [runs],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPreview(null);
    setPreviewError(null);

    // El readiness es útil para explicar el análisis, pero no debe impedir que
    // el historial se muestre ni convertir una consulta lenta en un bloqueo del
    // módulo. La corrida vuelve a validar toda la evidencia en el worker.
    void fetchRecommendationAnalysisRuns(token, { signal: controller.signal })
      .then((runsResponse) => {
        if (controller.signal.aborted) return;
        setRuns(runsResponse.runs);
        setSelected(runsResponse.runs[0] ?? null);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(readError(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    void fetchRecommendationAnalysisPreview(token, { signal: controller.signal })
      .then((previewResponse) => {
        if (!controller.signal.aborted) setPreview(previewResponse.preview);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
           setPreviewError(`La vista previa no está disponible todavía: ${readPreviewError(requestError)} La corrida puede iniciarse y volverá a validar la evidencia.`);
        }
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
      {previewError !== null && <Notice tone="warning">{previewError}</Notice>}
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
          <Notice tone="warning">
            {previewError !== null
              ? 'La vista previa no está disponible todavía. La corrida puede iniciarse y volverá a validar la evidencia en segundo plano.'
              : 'Consultando la evidencia disponible del tenant activo…'}
          </Notice>
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

        <RecommendationAnalysisRunDetail
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

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible completar la operación de análisis.';
}

function readPreviewError(error: unknown): string {
  const message = readError(error);
  return message.includes('tardó demasiado')
    ? 'la consulta de evidencia está tardando más de lo esperado.'
    : message;
}
