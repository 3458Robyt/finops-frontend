import { useEffect, useRef, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import {
  fetchRecommendationAnalysisPreview,
  fetchRecommendationAnalysisRun,
  fetchRecommendationAnalysisRuns,
  queueRecommendationAnalysis,
  type ApiRole,
  type RecommendationAnalysisPreview,
  type RecommendationAnalysisRun,
} from '../services/api';
import { outcomeLabel, stageLabels, statusLabels } from './recommendationAnalysisPresentation';

interface Props {
  readonly role: ApiRole;
  readonly onCompleted?: () => void;
  readonly onOpenAnalysis?: () => void;
}

const managerRoles = new Set<ApiRole>([
  'MASTER_ADMIN',
  'OPERATOR_ADMIN',
  'LEAD_TECHNICIAN',
  'ADMIN',
  'FINOPS_TECHNICIAN',
]);

/** Compact entry point for a governed, tenant-scoped recommendation run. */
export default function RecommendationGenerationAction({ role, onCompleted, onOpenAnalysis }: Props) {
  const token = useAccessToken();
  const [preview, setPreview] = useState<RecommendationAnalysisPreview | null>(null);
  const [run, setRun] = useState<RecommendationAnalysisRun | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const notifiedRun = useRef<string | null>(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;
  const canManage = managerRoles.has(role);
  const isActive = run?.status === 'PENDING' || run?.status === 'RUNNING';
  const activeRunId = isActive ? run?.id : undefined;

  useEffect(() => {
    if (!canManage) return undefined;
    const controller = new AbortController();
    setError(null);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);

    // La vista previa es informativa y puede consultar muchos datos. No debe
    // bloquear la lectura de corridas ni, sobre todo, el envío de la solicitud
    // POST que deja el análisis en cola.
    void fetchRecommendationAnalysisRuns(token, { signal: controller.signal })
      .then((runsResponse) => {
        if (!controller.signal.aborted) setRun(runsResponse.runs[0] ?? null);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(readError(requestError));
      });

    void fetchRecommendationAnalysisPreview(token, { signal: controller.signal })
      .then((previewResponse) => {
        if (!controller.signal.aborted) setPreview(previewResponse.preview);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setPreviewError(`La vista previa no está disponible todavía: ${readPreviewError(requestError)} Puedes iniciar el análisis; la compuerta volverá a validar la evidencia.`);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });

    return () => controller.abort();
  }, [canManage, token]);

  useEffect(() => {
    if (!canManage || activeRunId === undefined) return undefined;
    const runId = activeRunId;
    const controller = new AbortController();
    const poll = async (): Promise<void> => {
      try {
        const response = await fetchRecommendationAnalysisRun(token, runId, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setRun(response.run);
        if (response.run.status !== 'PENDING' && response.run.status !== 'RUNNING') {
          if (notifiedRun.current !== response.run.id) {
            notifiedRun.current = response.run.id;
            onCompletedRef.current?.();
          }
        }
      } catch (requestError: unknown) {
        if (!controller.signal.aborted) setError(readError(requestError));
      }
    };
    const interval = window.setInterval(() => void poll(), 3000);
    void poll();
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [activeRunId, canManage, token]);

  const handleQueue = async (): Promise<void> => {
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const response = await queueRecommendationAnalysis(token);
      setRun(response.run);
      setNotice(response.reused
        ? 'Ya existe un análisis equivalente; se está mostrando su progreso.'
        : 'Análisis en cola. Las recomendaciones solo se publicarán después de la auditoría.');
    } catch (requestError: unknown) {
      setError(readError(requestError));
    } finally {
      setWorking(false);
    }
  };

  if (!canManage) return null;

  return (
    <section className="ui-callout ui-callout-accent p-4 sm:p-5" aria-label="Generación gobernada de recomendaciones">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tak-yellow">Motor FinOps gobernado</p>
          <h2 className="mt-1 text-base font-black text-white sm:text-lg">Buscar nuevas oportunidades con evidencia</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
            Primero se calculan costos, consumo y métricas. La IA genera y un auditor independiente revisa cada resultado antes de publicarlo.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-zinc-400">
            <span>{previewLoading ? 'Consultando evidencia…' : `${preview?.candidatesFound ?? 0} oportunidades candidatas`}</span>
            {preview !== null && <span>{preview.resourcesEvaluated} recursos evaluados</span>}
            {preview !== null && preview.candidatesSkipped > 0 && <span>{preview.candidatesSkipped} sin evidencia suficiente</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void handleQueue()}
            disabled={working || isActive}
            className="ui-button ui-button-primary min-h-11 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            {isActive ? 'Análisis en curso' : 'Generar recomendaciones'}
          </button>
          {onOpenAnalysis !== undefined && (
            <button type="button" onClick={onOpenAnalysis} className="ui-button ui-button-secondary min-h-11 px-4 text-xs">
              Ver auditoría
            </button>
          )}
        </div>
      </div>
      {run !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-3 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-black ${isActive ? 'bg-amber-400/10 text-amber-300' : run.status === 'COMPLETED' || run.status === 'PARTIAL' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>
            {statusLabels[run.status]}
          </span>
          <span className="font-bold text-zinc-400">{stageLabels[run.stage]}</span>
          <span className="text-zinc-500">{outcomeLabel(run)}</span>
          {run.recommendationsPersisted > 0 && <span className="font-black text-tak-yellow">{run.recommendationsPersisted} publicadas</span>}
        </div>
      )}
      {notice !== null && <p className="mt-3 text-xs font-bold text-emerald-300">{notice}</p>}
      {previewError !== null && <p className="mt-3 text-xs font-bold text-amber-300">{previewError}</p>}
      {error !== null && <p className="mt-3 text-xs font-bold text-red-300">{error}</p>}
      {run?.status === 'FAILED' && run.errorMessage !== undefined && <p className="mt-3 text-xs font-bold text-amber-300">Detalle: {run.errorMessage}</p>}
    </section>
  );
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible iniciar el análisis gobernado.';
}

function readPreviewError(error: unknown): string {
  const message = readError(error);
  return message.includes('tardó demasiado')
    ? 'la consulta de evidencia está tardando más de lo esperado.'
    : message;
}
