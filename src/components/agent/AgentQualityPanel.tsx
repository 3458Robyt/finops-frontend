import type { AgentQualityDimensionMetric, AgentQualityReport } from '../../services/api';
import { AgentMetric, SectionHeader } from './AgentSettingsUi';

interface AgentQualityPanelProps {
  readonly report: AgentQualityReport | null;
}

export function AgentQualityPanel({ report }: AgentQualityPanelProps) {
  if (report === null) return null;
  const totals = report.totals;
  return (
    <section className="ui-surface p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <SectionHeader title="Calibración de recomendaciones" eyebrow="Calidad basada en evidencia" icon="fact_check" />
        <p className="max-w-xl text-xs leading-relaxed text-zinc-500">
          Ventana: {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}. La aprobación humana es un indicador de calidad, no una precisión absoluta del modelo.
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AgentMetric title="Tasa de revisión" value={formatPercent(totals.reviewRate)} helper={`${totals.reviewed} de ${totals.generated} recomendaciones`} icon="rate_review" />
        <AgentMetric title="Aprobación humana" value={formatPercent(totals.approvalRate)} helper={`${totals.approved} aprobadas / ${totals.rejected} rechazadas`} icon="thumb_up" />
        <AgentMetric title="Ahorro verificado" value={formatMoney(totals.verifiedSavings)} helper={`Estimado: ${formatMoney(totals.estimatedSavings)}`} icon="verified" />
        <AgentMetric title="P95 latencia IA" value={formatMilliseconds(report.traces.p95LatencyMs)} helper={`${report.traces.totalTokens.toLocaleString('es-CO')} tokens estimados`} icon="speed" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <QualityStat label="Abstenciones / validación" value={totals.abstained} helper="No se presenta como cambio ejecutable" />
        <QualityStat label="Evidencia insuficiente" value={totals.insufficientEvidence} helper="Requiere datos o revisión adicional" />
        <QualityStat label="Error estimado vs verificado" value={formatPercent(totals.estimatedVsVerifiedErrorPercent)} helper="Solo mediciones VERIFIED pareadas" />
      </div>
      <QualityTable dimensions={report.dimensions} />
      <div className="ui-surface-raised mt-4 space-y-1 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="font-black uppercase tracking-widest text-zinc-400">Lectura responsable</p>
        {report.notes.map((note) => <p key={note}>• {note}</p>)}
        <p>Coste de tokens: {report.traces.costEstimateAvailable ? formatMoney(report.traces.estimatedCostUsd) : 'no configurado; agrega precios por millón de tokens en el entorno.'}</p>
      </div>
    </section>
  );
}

function QualityTable({ dimensions }: { readonly dimensions: readonly AgentQualityDimensionMetric[] }) {
  return (
    <div className="ui-surface-raised mt-5 overflow-x-auto">
      <div className="border-b border-zinc-800 px-4 py-3"><SectionHeader title="Desglose por tipo, regla y proveedor" eyebrow="Muestra de la ventana seleccionada" icon="table_chart" /></div>
      {dimensions.length === 0 ? <p className="px-4 py-5 text-sm font-bold text-zinc-500">No hay recomendaciones en esta ventana.</p> : (
        <table className="min-w-full text-left text-xs">
          <thead className="bg-zinc-950/70 text-[10px] font-black uppercase tracking-widest text-zinc-500"><tr><th className="px-4 py-3">Dimensión</th><th className="px-4 py-3">Generadas</th><th className="px-4 py-3">Revisión</th><th className="px-4 py-3">Aprobación</th><th className="px-4 py-3">Verificadas</th><th className="px-4 py-3">Error ahorro</th></tr></thead>
          <tbody>{dimensions.slice(0, 30).map((item) => <tr key={`${item.dimension}-${item.key}`} className="border-t border-zinc-800 text-zinc-300"><td className="px-4 py-3"><span className="font-black text-zinc-500">{dimensionLabel(item.dimension)}</span><span className="ml-2 font-bold text-white">{item.key}</span></td><td className="px-4 py-3">{item.generated}</td><td className="px-4 py-3">{formatPercent(item.reviewRate)}</td><td className="px-4 py-3">{formatPercent(item.approvalRate)}</td><td className="px-4 py-3">{item.verified}</td><td className="px-4 py-3">{formatPercent(item.estimatedVsVerifiedErrorPercent)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

function QualityStat({ label, value, helper }: { readonly label: string; readonly value: string | number; readonly helper: string }) {
  return <div className="ui-surface-raised p-4"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{helper}</p></div>;
}

function dimensionLabel(dimension: AgentQualityDimensionMetric['dimension']): string {
  return { TYPE: 'Tipo', RULE: 'Regla', PROVIDER: 'Proveedor' }[dimension];
}

function formatPercent(value: number | null): string { return value === null ? '—' : `${value.toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`; }
function formatMilliseconds(value: number | null): string { return value === null ? '—' : `${value.toLocaleString('es-CO')} ms`; }
function formatMoney(value: number | null): string { return value === null ? '—' : `USD ${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`; }
function formatDate(value: string): string { return new Date(value).toLocaleDateString('es-CO'); }
