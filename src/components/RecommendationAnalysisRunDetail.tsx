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
      {run.errorMessage !== undefined && <Notice tone={run.status === 'FAILED' ? 'error' : 'warning'}>{run.errorMessage}</Notice>}
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
