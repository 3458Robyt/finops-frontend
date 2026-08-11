import type { RecommendationFeedbackReason } from '../../services/api';
import { approvalReasons, rejectionReasons } from './resourceDetailPresentation';

export function DecisionModal({
  mode,
  reasonCode,
  note,
  loading,
  error,
  onReasonCodeChange,
  onNoteChange,
  onCancel,
  onSubmit,
}: {
  readonly mode: 'APPROVED' | 'REJECTED';
  readonly reasonCode: RecommendationFeedbackReason | '';
  readonly note: string;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onReasonCodeChange: (value: RecommendationFeedbackReason | '') => void;
  readonly onNoteChange: (value: string) => void;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
}) {
  const reasons = mode === 'APPROVED' ? approvalReasons : rejectionReasons;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="border-b border-zinc-800 px-6 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tak-yellow">Feedback para aprendizaje IA</p>
          <h4 className="mt-2 text-xl font-black text-white">
            {mode === 'APPROVED' ? 'Aprobar recomendacion' : 'Rechazar recomendacion'}
          </h4>
        </div>
        <div className="space-y-5 p-6">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Motivo estructurado</span>
            <select
              value={reasonCode}
              onChange={(event) => onReasonCodeChange(event.target.value as RecommendationFeedbackReason)}
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow/60"
            >
              {reasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {mode === 'REJECTED' ? 'Comentario obligatorio' : 'Comentario opcional'}
            </span>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder={mode === 'REJECTED'
                ? 'Explica brevemente por que no aplica o que falta.'
                : 'Agrega una nota para reforzar el aprendizaje.'}
              className="mt-2 min-h-28 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-100 outline-none focus:border-tak-yellow/60 placeholder:text-zinc-600"
            />
          </label>

          {error !== null && (
            <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-300">
              {error}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 p-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className={`rounded-2xl py-3 text-xs font-black uppercase tracking-widest text-zinc-950 transition disabled:opacity-60 ${
              mode === 'APPROVED' ? 'bg-green-500 hover:bg-green-400' : 'bg-red-400 hover:bg-red-300'
            }`}
          >
            {loading ? 'Guardando...' : mode === 'APPROVED' ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  );
}
