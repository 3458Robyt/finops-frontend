import type { RecommendationTimelineEvent } from '../../services/api';
import { formatDateTime, shortenType } from './resourceDetailEvidence';

export function TimelinePanel({ events }: { readonly events: readonly RecommendationTimelineEvent[] }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 md:p-8">
      <p className="text-[10px] font-black text-tak-yellow uppercase tracking-[0.25em]">Trazabilidad</p>
      <h4 className="mt-2 text-xl font-black text-white">Timeline auditable</h4>
      <div className="mt-6 space-y-3">
        {events.length === 0 ? (
          <p className="text-sm font-bold text-zinc-500">Sin eventos registrados todavia.</p>
        ) : events.map((event) => {
          const tone = timelineTone(event);

          return (
          <div key={`${event.type}-${event.id}`} className={`rounded-2xl border p-4 ${tone.container}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-black ${tone.title}`}>{event.title}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">{timelineDescription(event)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${tone.badge}`}>
                {shortenType(event.type)}
              </span>
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">{formatDateTime(event.createdAt)}</p>
          </div>
          );
        })}
      </div>
    </div>
  );
}
function timelineTone(event: RecommendationTimelineEvent): {
  readonly container: string;
  readonly title: string;
  readonly badge: string;
} {
  const status = readTimelineStatus(event);

  if (status === 'ERROR') {
    return {
      container: 'border-red-500/20 bg-red-500/10',
      title: 'text-red-300',
      badge: 'bg-red-500/10 text-red-300',
    };
  }

  if (status === 'SKIPPED' || status === 'PENDING') {
    return {
      container: 'border-tak-yellow/20 bg-tak-yellow/5',
      title: 'text-tak-yellow',
      badge: 'bg-tak-yellow/10 text-tak-yellow',
    };
  }

  if (status === 'APPROVED' || event.type === 'DECISION_RECORDED' || event.type === 'MANUAL_EXECUTION_RECORDED') {
    return {
      container: 'border-green-500/20 bg-green-500/10',
      title: 'text-green-300',
      badge: 'bg-green-500/10 text-green-300',
    };
  }

  return {
    container: 'border-zinc-800 bg-zinc-900/50',
    title: 'text-zinc-100',
    badge: 'bg-zinc-800 text-tak-yellow',
  };
}

function timelineDescription(event: RecommendationTimelineEvent): string {
  const status = readTimelineStatus(event);

  if (event.type !== 'LEARNING_EVENT') {
    return event.description;
  }

  const descriptions: Record<string, string> = {
    PENDING: 'La decision ya fue guardada. El aprendizaje se procesara en segundo plano.',
    APPROVED: 'El auditor aprobo la memoria y el agente incorporo el aprendizaje.',
    REJECTED: 'El auditor IA descarto la memoria para evitar aprendizaje incorrecto.',
    SKIPPED: 'El auditor IA no respondio de forma confiable a tiempo. La decision humana sigue guardada.',
    ERROR: 'Error interno procesando el aprendizaje. La decision humana sigue guardada.',
  };

  return status !== undefined ? descriptions[status] ?? event.description : event.description;
}

function readTimelineStatus(event: RecommendationTimelineEvent): string | undefined {
  if (event.metadata === null || typeof event.metadata !== 'object' || Array.isArray(event.metadata)) {
    return undefined;
  }

  const status = (event.metadata as Record<string, unknown>)['status'];
  return typeof status === 'string' ? status : undefined;
}

