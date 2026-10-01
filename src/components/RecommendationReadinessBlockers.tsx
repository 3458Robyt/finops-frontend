import type { RecommendationAnalysisPreview } from '../services/api';

type BlockedCandidate = RecommendationAnalysisPreview['readinessReport']['blocked'][number];

const technicalBlockerLabels: Readonly<Record<string, string>> = {
  INSUFFICIENT_TECHNICAL_COVERAGE: 'cobertura técnica insuficiente',
  MISSING_CPU_METRIC: 'falta una métrica de CPU',
  CPU_METRIC_UNIT_NOT_PERCENTAGE: 'la unidad de CPU no confirma un porcentaje',
  CPU_SATURATION_RISK: 'hay riesgo de saturación de CPU',
  MISSING_MEMORY_METRIC: 'falta una métrica de memoria',
  MEMORY_METRIC_UNIT_NOT_PERCENTAGE: 'la unidad de memoria no confirma un porcentaje',
  MEMORY_SATURATION_RISK: 'hay riesgo de saturación de memoria',
  NETWORK_SATURATION_RISK: 'hay riesgo de saturación de red',
  DISK_SATURATION_RISK: 'hay riesgo de saturación de disco',
  IOPS_SATURATION_RISK: 'hay riesgo de saturación de IOPS',
  UNSUPPORTED_RESOURCE_TYPE: 'no existe una regla técnica para este tipo de recurso',
  AMBIGUOUS_CPU_STREAM: 'hay más de una serie de CPU posible',
  AMBIGUOUS_MEMORY_STREAM: 'hay más de una serie de memoria posible',
  EVIDENCE_QUERY_LIMIT_REACHED: 'el análisis recibió un catálogo técnico incompleto',
};

export default function RecommendationReadinessBlockers({
  blocked,
  reviewCandidateCount = 0,
}: {
  readonly blocked: readonly BlockedCandidate[];
  readonly reviewCandidateCount?: number;
}) {
  const reasonCounts = new Map<string, number>();
  for (const candidate of blocked) {
    const reasons = candidate.reasons.length > 0 ? candidate.reasons : ['No se recibió un motivo detallado del análisis.'];
    for (const reason of new Set(reasons.map(formatReason))) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  const reasons = [...reasonCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (reasons.length === 0) return null;

  return (
    <section
      aria-label="Motivos de exclusión de recomendaciones"
      data-testid="readiness-blocker-summary"
      className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
    >
      <h3 className="text-xs font-black uppercase tracking-wider text-amber-200">Por qué no pasan a generación</h3>
      <p className="mt-1 text-xs text-zinc-400">{blocked.length} candidatos no superan la compuerta para recomendaciones publicables.</p>
      {reviewCandidateCount > 0 && <p className="mt-2 text-xs font-bold text-amber-100">Se priorizarán hasta {reviewCandidateCount} {reviewCandidateCount === 1 ? 'borrador informativo' : 'borradores informativos'} para revisión técnica; no cuantifican ahorro ni autorizan cambios.</p>}
      <ul className="mt-3 space-y-2">
        {reasons.map(([reason, count]) => (
          <li key={reason} className="flex items-start justify-between gap-3 text-xs">
            <span className="text-zinc-300">{reason}</span>
            <span className="shrink-0 font-black text-amber-200">{count} {count === 1 ? 'candidato' : 'candidatos'}</span>
          </li>
        ))}
      </ul>
      {blocked.some((candidate) => candidate.resourceId !== undefined) && (
        <div className="mt-4 space-y-2 border-t border-amber-500/20 pt-3">
          <p className="text-xs font-bold text-amber-100">Diagnóstico por recurso</p>
          {blocked.filter((candidate) => candidate.resourceId !== undefined).map((candidate) => (
            <details key={candidate.id} className="rounded-lg border border-zinc-700 bg-zinc-950/40 p-3 text-xs text-zinc-300">
              <summary className="cursor-pointer font-semibold text-white">
                {candidate.resourceName ?? candidate.resourceId}
                {candidate.resourceName !== undefined && <span className="ml-2 text-zinc-500">{shortId(candidate.resourceId!)}</span>}
              </summary>
              {candidate.evidencePeriod !== undefined && (
                <p className="mt-2 text-zinc-400">Costo: {date(candidate.evidencePeriod.costStart)} – {date(candidate.evidencePeriod.costEnd)}. Última métrica: {candidate.evidencePeriod.lastMetricAt === undefined ? 'sin muestras enlazadas' : date(candidate.evidencePeriod.lastMetricAt)}.</p>
              )}
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {candidate.reasons.map((reason) => <li key={reason}>{formatReason(reason)}</li>)}
              </ul>
              {(candidate.evidenceIssues?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-1">
                  {candidate.evidenceIssues?.map((issue) => <p key={issue.code} className="text-amber-100"><strong>Siguiente paso:</strong> {issue.action}</p>)}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function shortId(value: string): string {
  return value.length > 32 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

function date(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('es-CO');
}

function formatReason(reason: string): string {
  const prefix = /^Reglas determin[ií]sticas detectaron bloqueos:\s*/i;
  if (!prefix.test(reason)) return reason;
  const codes = reason.replace(prefix, '').replace(/[.]$/, '').split(',').map((code) => code.trim()).filter(Boolean);
  const labels = codes.map((code) => technicalBlockerLabels[code] ?? code.toLowerCase().replaceAll('_', ' '));
  return `Validación técnica: ${labels.join('; ')}.`;
}
