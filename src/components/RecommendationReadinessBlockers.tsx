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
};

export default function RecommendationReadinessBlockers({ blocked }: { readonly blocked: readonly BlockedCandidate[] }) {
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
      <p className="mt-1 text-xs text-zinc-400">{blocked.length} candidatos requieren evidencia o validaciones adicionales. No se enviarán a la IA mientras sigan bloqueados.</p>
      <ul className="mt-3 space-y-2">
        {reasons.map(([reason, count]) => (
          <li key={reason} className="flex items-start justify-between gap-3 text-xs">
            <span className="text-zinc-300">{reason}</span>
            <span className="shrink-0 font-black text-amber-200">{count} {count === 1 ? 'candidato' : 'candidatos'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatReason(reason: string): string {
  const prefix = /^Reglas determin[ií]sticas detectaron bloqueos:\s*/i;
  if (!prefix.test(reason)) return reason;
  const codes = reason.replace(prefix, '').replace(/[.]$/, '').split(',').map((code) => code.trim()).filter(Boolean);
  const labels = codes.map((code) => technicalBlockerLabels[code] ?? code.toLowerCase().replaceAll('_', ' '));
  return `Validación técnica: ${labels.join('; ')}.`;
}
