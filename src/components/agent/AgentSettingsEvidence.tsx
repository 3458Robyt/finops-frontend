import type { AgentLearningSummaryResponse, AiContextTrace } from '../../services/api';
import { AgentMetric, SectionHeader } from './AgentSettingsUi';

const operationLabels: Record<AiContextTrace['operation'], string> = {
  CHAT: 'Chat',
  RECOMMENDATION: 'Recomendaciones',
  EXECUTION_PLAN: 'Plan',
  AUDIT: 'Auditoria',
  LEARNING: 'Aprendizaje',
};

interface AgentSettingsEvidenceProps {
  readonly traces: readonly AiContextTrace[];
  readonly learningSummary: AgentLearningSummaryResponse['learning'] | null;
  readonly outboundDeliveryCount: number;
}

export function AgentSettingsEvidence({ traces, learningSummary, outboundDeliveryCount }: AgentSettingsEvidenceProps) {
  const latestTrace = traces[0];
  const errorTraceCount = traces.filter((trace) => trace.status !== 'SUCCESS').length;
  const totalTraceTokens = traces.reduce((total, trace) => total + trace.promptTokenEstimate + (trace.responseTokenEstimate ?? 0), 0);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AgentMetric title="Trazas registradas" value={traces.length} helper={`${errorTraceCount} con alerta`} icon="query_stats" />
        <AgentMetric title="Tokens estimados" value={totalTraceTokens} helper="Prompt + respuesta" icon="data_usage" />
        <AgentMetric title="Entregas externas" value={outboundDeliveryCount} helper="Ultimos eventos" icon="outgoing_mail" />
        <AgentMetric title="Ultima operacion" value={latestTrace !== undefined ? operationLabels[latestTrace.operation] : 'Sin uso'} helper={latestTrace !== undefined ? new Date(latestTrace.createdAt).toLocaleDateString('es-CO') : 'Pendiente'} icon="schedule" />
      </div>
      <TraceTable traces={traces} />
      <LearningSummaryPanel summary={learningSummary} />
    </section>
  );
}

function TraceTable({ traces }: { readonly traces: readonly AiContextTrace[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
      <div className="border-b border-zinc-800 px-5 py-4"><SectionHeader title="Trazas de contexto IA" eyebrow="Observabilidad" icon="manage_search" /></div>
      <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-zinc-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 md:grid"><span>Operacion</span><span>Modelo</span><span>Estado</span><span>Tokens</span><span>Fecha</span></div>
      {traces.length === 0 ? <p className="px-4 py-6 text-sm font-bold text-zinc-500">Aun no hay trazas de contexto.</p> : traces.map((trace) => (
        <div key={trace.id} className="grid gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-300 last:border-b-0 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] md:gap-3">
          <span className="font-bold text-white">{operationLabels[trace.operation]}</span><span className="truncate">{trace.model}</span>
          <span className={trace.status === 'SUCCESS' ? 'text-emerald-300' : 'text-red-300'}>{trace.status}</span>
          <span>{trace.promptTokenEstimate + (trace.responseTokenEstimate ?? 0)}</span><span>{new Date(trace.createdAt).toLocaleDateString('es-CO')}</span>
        </div>
      ))}
    </section>
  );
}

function LearningSummaryPanel({ summary }: { readonly summary: AgentLearningSummaryResponse['learning'] | null }) {
  if (summary === null) return null;
  const { stats } = summary;
  const feedbackTotal = stats.feedbackApproved + stats.feedbackRejected;
  const approvalRate = feedbackTotal === 0 ? null : Math.round((stats.feedbackApproved / feedbackTotal) * 100);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><SectionHeader title="Aprendizaje basado en decisiones" eyebrow="Feedback humano + auditor IA" icon="model_training" /><p className="max-w-md text-xs leading-relaxed text-zinc-500">La aprobación humana y la aprobación del auditor son métricas distintas. Una memoria solo se incorpora después de superar la auditoría.</p></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AgentMetric title="Feedback aprobado" value={stats.feedbackApproved} helper={approvalRate === null ? 'Sin decisiones' : `${approvalRate}% de las decisiones`} icon="thumb_up" />
        <AgentMetric title="Feedback rechazado" value={stats.feedbackRejected} helper={`${stats.totalEvents} eventos registrados`} icon="thumb_down" />
        <AgentMetric title="Aprendizaje en cola" value={stats.learningPending} helper={`${stats.learningApproved} eventos auditados`} icon="hourglass_top" />
        <AgentMetric title="Memorias activas" value={stats.activeMemories} helper={`${stats.globalMemories} globales`} icon="memory" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold"><LearningStatus label="Auditor aprobado" value={stats.learningApproved} tone="success" /><LearningStatus label="Auditor rechazó" value={stats.learningRejected} tone="danger" /><LearningStatus label="Omitido temporalmente" value={stats.learningSkipped} tone="warning" /><LearningStatus label="Error interno" value={stats.learningError} tone="danger" /></div>
    </section>
  );
}

function LearningStatus({ label, value, tone }: { readonly label: string; readonly value: number; readonly tone: 'success' | 'warning' | 'danger' }) {
  const classes = { success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200', danger: 'border-red-500/30 bg-red-500/10 text-red-200' }[tone];
  return <span className={`rounded-full border px-3 py-2 ${classes}`}>{label}: {value}</span>;
}
