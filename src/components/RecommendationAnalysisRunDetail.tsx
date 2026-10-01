import type { RecommendationAnalysisRun } from '../services/api';
import {
  Metric,
  Notice,
} from './RecommendationAnalysisUi';
import {
  outcomeLabel,
  stageLabels,
  stages,
} from './recommendationAnalysisPresentation';

interface Props {
  readonly run: RecommendationAnalysisRun | null;
  readonly canManage: boolean;
  readonly working: boolean;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
  readonly onOpenRecommendation?: (recommendationId: string) => void;
}

export default function RecommendationAnalysisRunDetail({
  run,
  canManage,
  working,
  onCancel,
  onRetry,
  onOpenRecommendation,
}: Props) {
  if (run === null) {
    return <div className="ui-surface p-5 text-sm text-zinc-500">Selecciona una corrida para revisar su detalle.</div>;
  }

  const progress = Math.round(((stages.indexOf(run.stage) + 1) / stages.length) * 100);
  const isPublishing = run.stage === 'PERSISTENCE';
  const reviewDrafts = (run.candidateAudits ?? []).filter((audit) => audit.finalDisposition === 'REVIEW_DRAFT');
  return (
    <div className="ui-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">{outcomeLabel(run)}</p>
          <h3 className="mt-1 text-lg font-black text-white">{stageLabels[run.stage]}</h3>
          <p className="mt-1 text-xs text-zinc-500">Corrida {run.id}</p>
        </div>
        <div className="flex gap-2">
          {canManage && !isPublishing && (run.status === 'PENDING' || run.status === 'RUNNING') && (
            <button type="button" disabled={working || run.cancelRequestedAt !== undefined} onClick={onCancel} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 disabled:opacity-50">
              {run.cancelRequestedAt !== undefined ? 'Cancelación solicitada' : 'Cancelar'}
            </button>
          )}
          {canManage && run.status === 'FAILED' && (
            <button type="button" disabled={working} onClick={onRetry} className="rounded-lg bg-tak-yellow px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-50">Reintentar</button>
          )}
        </div>
      </div>
      {isPublishing && <Notice tone="warning">La corrida está publicando resultados; la cancelación ya no está disponible en este último paso.</Notice>}
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
        {reviewDrafts.length > 0 && <Metric label="Borradores (no publicadas)" value={String(reviewDrafts.length)} />}
      </div>
      {run.errorMessage !== undefined && <Notice tone={run.status === 'FAILED' ? 'error' : 'warning'}>{run.errorMessage}</Notice>}
      {(run.latencyMs !== undefined || run.stageTimings !== undefined) && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-400">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {run.latencyMs !== undefined && <span>Duración total: <strong className="text-zinc-200">{formatDuration(run.latencyMs)}</strong></span>}
            {Object.entries(run.stageTimings ?? {}).map(([stage, duration]) => (
              <span key={stage}>{stageLabels[stage as keyof typeof stageLabels] ?? stage}: <strong className="text-zinc-200">{formatDuration(duration)}</strong></span>
            ))}
          </div>
        </div>
      )}
      {run.candidateResults !== undefined && run.candidateResults.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-black text-white">Decisiones por candidato</h4>
          <div className="mt-2 space-y-2">
            {run.candidateResults.map((candidate) => (
              <article key={candidate.candidateId} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-zinc-200">{candidate.resourceId ?? candidate.candidateId}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-tak-yellow">{candidateOutcomeLabel(candidate.outcome)}</span>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-400">
                  {candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      )}
      {reviewDrafts.length > 0 && (
        <section className="mt-5" aria-labelledby="technical-review-drafts-title">
          <h4 id="technical-review-drafts-title" className="text-sm font-black text-white">Borradores de revisión técnica</h4>
          <Notice tone="warning">Son borradores provisionales para orientar la verificación. No son recomendaciones publicadas, no tienen ahorro cuantificado y no autorizan cambios en la nube.</Notice>
          <div className="mt-2 space-y-2">
            {reviewDrafts.map((audit) => {
              const draft = readDraft(audit.draft);
              return (
                <article key={`${audit.candidateId}-${audit.draftIndex}`} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h5 className="text-sm font-black text-zinc-100">{draft.title ?? `Revisión de ${audit.candidateId}`}</h5>
                    <span className="rounded-full border border-emerald-500/30 px-2 py-1 text-[10px] font-black uppercase text-emerald-200">
                      Auditoría aprobada · {audit.auditScore}/100
                    </span>
                  </div>
                  {draft.description !== undefined && <p className="mt-2 text-sm leading-relaxed text-zinc-300">{draft.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                    <span>Ahorro: <strong className="text-zinc-200">No cuantificado</strong></span>
                    <span>Requiere validación técnica y aprobación humana</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
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

function readDraft(value: unknown): { readonly title?: string; readonly description?: string } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const draft = value as Record<string, unknown>;
  return {
    ...(typeof draft['title'] === 'string' ? { title: draft['title'] } : {}),
    ...(typeof draft['description'] === 'string' ? { description: draft['description'] } : {}),
  };
}

function candidateOutcomeLabel(outcome: string): string {
  return outcome === 'REVIEW_DRAFT' ? 'Borrador de revisión' : outcome;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
}
