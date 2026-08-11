import type { AiAuditReport, Recommendation, RecommendationExecutionPlan } from '../../services/api';
import { Badge } from './ResourceDetailDisplay';
import {
  formatDateTime,
  formatNullableNumber,
  normalizeAuditReport,
  readLearningInfluence,
  shortenType,
  type CanonicalEvidenceSnapshot,
  type EvidenceRecord,
} from './resourceDetailEvidence';

export function CanonicalEvidencePanel({ snapshot, evidence }: { readonly snapshot: CanonicalEvidenceSnapshot; readonly evidence: EvidenceRecord }) {
  const audit = normalizeAuditReport(evidence.raw['aiAudit'], 0, 'REJECTED');
  const learning = readLearningInfluence(evidence.raw['aiLearning']);

  return (
    <section className="rounded-3xl border border-cyan-900/60 bg-cyan-950/10 p-6 md:p-8" data-testid="canonical-evidence-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Evidencia técnica verificable</p>
          <p className="mt-2 text-xs font-medium text-zinc-400">
            Periodo {formatDateTime(snapshot.periodStart)} — {formatDateTime(snapshot.periodEnd)}
          </p>
        </div>
        <Badge label={snapshot.availability.replaceAll('_', ' ')} tone="LOW" />
      </div>

      <div className="mt-5 space-y-4">
        {snapshot.resources.map((resource) => (
          <div key={resource.externalResourceId} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap justify-between gap-2 text-xs font-bold text-zinc-200">
              <span className="break-all">{resource.externalResourceId}</span>
              <span className="text-cyan-300">{resource.linkQuality === 'COST_AND_TECHNICAL' ? 'Costo y métrica enlazados' : 'Métrica sin costo enlazado'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {resource.metrics.slice(0, 4).map((metric) => (
                <span key={metric.evidenceRef ?? metric.metricName} className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-bold text-zinc-300">
                  {metric.metricName}: p95 {formatNullableNumber(metric.p95)} · {metric.sampleCount ?? 0} muestras / {metric.coverageDays ?? 0} días
                </span>
              ))}
            </div>
            {resource.ruleMatches.length > 0 && <p className="mt-3 text-xs text-green-300">Reglas: {resource.ruleMatches.join(', ')}</p>}
            {resource.blockers.length > 0 && <p className="mt-2 text-xs text-amber-300">Bloqueos: {resource.blockers.join(', ')}</p>}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 text-xs md:grid-cols-2">
        <p className="rounded-xl bg-zinc-900/70 p-3 text-zinc-300">Auditor IA: {audit.verdict} · puntuación {audit.score || 'no disponible'}</p>
        <p className="rounded-xl bg-zinc-900/70 p-3 text-zinc-300">Aprendizaje: {learning === null ? 'No se usaron memorias auditadas.' : `${learning.memoryIds} memorias y ${learning.caseIds} casos relevantes.`}</p>
      </div>
      <p className="mt-4 break-all text-[10px] font-medium text-zinc-500">Huella de evidencia: {snapshot.hash}</p>
    </section>
  );
}
export function ExecutionPlanPanel({
  plan,
  canDecide,
  decisionLoading,
  decisionError,
  decisionLearningStatus,
  status,
  onApprove,
  onReject,
}: {
  readonly plan: RecommendationExecutionPlan;
  readonly canDecide: boolean;
  readonly decisionLoading: boolean;
  readonly decisionError: string | null;
  readonly decisionLearningStatus: string | null;
  readonly status: Recommendation['status'];
  readonly onApprove: () => void;
  readonly onReject: () => void;
}) {
  const content = plan.content;
  const audit = normalizeAuditReport(plan.auditReport, plan.auditScore, plan.auditVerdict);

  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="bg-zinc-900/70 border-b border-zinc-800 px-6 py-5 md:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-tak-yellow uppercase tracking-[0.25em]">Plan de ejecucion auditado</p>
          <h4 className="text-lg md:text-2xl font-black text-white mt-1 tracking-tight">{content.summary}</h4>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-3">
            Plan guardado {formatDateTime(plan.createdAt)} • ID {plan.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label={`Auditoria ${plan.auditVerdict}`} />
          <Badge label={`Score ${plan.auditScore}/100`} />
          <Badge label={status.replace('_', ' ')} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
        <div className="xl:col-span-8 p-6 md:p-8 space-y-6">
          <div className="rounded-2xl border border-tak-yellow/20 bg-tak-yellow/5 p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-tak-yellow">verified_user</span>
              <p className="text-sm font-bold text-zinc-200 leading-relaxed">
                Este plan es una guia de ejecucion manual. La plataforma no ejecuta cambios automaticamente en la nube.
              </p>
            </div>
          </div>

          <ScopeList scope={content.scope} />
          <PlanSection icon="rule" title="Prerequisitos" items={content.prerequisites} />
          <PlanSection icon="format_list_numbered" title="Pasos tecnicos" items={content.steps} />
          <PlanSection icon="fact_check" title="Validaciones" items={content.validation} />
          <PlanSection icon="warning" title="Riesgos" items={content.risks} />
          <PlanSection icon="undo" title="Rollback" items={content.rollback} />
          <PlanSection icon="target" title="Criterios de exito" items={content.successCriteria} />
        </div>

        <div className="xl:col-span-4 border-t xl:border-t-0 xl:border-l border-zinc-800 p-6 md:p-8 bg-zinc-950/30 space-y-6">
          <AuditPanel audit={audit} />

          {plan.auditVerdict !== 'APPROVED' && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-300">
              El plan no supero la verificacion automatica. No se puede aprobar.
            </div>
          )}

          {status !== 'PENDING' && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-xs font-bold text-green-300">
              Esta recomendacion ya fue marcada como {status.replace('_', ' ')}.
            </div>
          )}

          {decisionLearningStatus !== null && (
            <p className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-xs font-bold text-green-300">
              {decisionLearningStatus}
            </p>
          )}

          {canDecide && (
            <div className="space-y-4">
              {decisionError !== null && (
                <p className="text-xs font-bold text-red-300">{decisionError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                <button
                  onClick={onApprove}
                  disabled={decisionLoading}
                  className="bg-green-500 hover:bg-green-400 disabled:opacity-60 py-3 rounded-2xl text-zinc-950 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  Aprobar plan
                </button>
                <button
                  onClick={onReject}
                  disabled={decisionLoading}
                  className="bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 py-3 rounded-2xl text-red-300 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] border border-red-500/20"
                >
                  Rechazar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScopeList({ scope }: { readonly scope: Readonly<Record<string, unknown>> }) {
  const entries = Object.entries(scope)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .slice(0, 6);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{shortenType(key)}</p>
          <p className="mt-1 text-sm font-bold text-zinc-100 break-words">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}

function PlanSection({ icon, title, items }: { readonly icon: string; readonly title: string; readonly items: readonly string[] }) {
  return (
    <section className="space-y-3">
      <h5 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
        <span className="material-symbols-outlined text-tak-yellow text-lg">{icon}</span>
        {title}
      </h5>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-start gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-4">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-black text-tak-yellow">
              {index + 1}
            </span>
            <p className="text-sm font-medium leading-relaxed text-zinc-300">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditPanel({ audit }: { readonly audit: AiAuditReport }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Verificacion IA</p>
          <p className="text-2xl font-black text-white">{audit.score}/100</p>
        </div>
        <span className={`material-symbols-outlined text-3xl ${audit.verdict === 'APPROVED' ? 'text-green-400' : 'text-red-300'}`}>
          {audit.verdict === 'APPROVED' ? 'verified' : 'gpp_maybe'}
        </span>
      </div>
      <div className="space-y-3">
        {audit.checks.map((check, index) => (
          <div key={`${check.name}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-base ${check.passed ? 'text-green-400' : 'text-red-300'}`}>
                {check.passed ? 'check_circle' : 'cancel'}
              </span>
              <p className="text-xs font-black uppercase tracking-wider text-zinc-200">{shortenType(check.name)}</p>
            </div>
            {check.notes !== '' && (
              <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">{check.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

