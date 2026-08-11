import type { SavingsMeasurement, SavingsMeasurementReadiness } from '../../services/api';
import { MetricCard } from './ResourceDetailDisplay';
import { formatDateTime } from './resourceDetailEvidence';

export function ManualExecutionPanel({
  status,
  savings,
  notes,
  loading,
  message,
  error,
  currency,
  onStatusChange,
  onSavingsChange,
  onNotesChange,
  onSubmit,
}: {
  readonly status: 'PLANNED' | 'EXECUTED' | 'PARTIAL' | 'CANCELLED';
  readonly savings: string;
  readonly notes: string;
  readonly loading: boolean;
  readonly message: string | null;
  readonly error: string | null;
  readonly currency: string;
  readonly onStatusChange: (value: 'PLANNED' | 'EXECUTED' | 'PARTIAL' | 'CANCELLED') => void;
  readonly onSavingsChange: (value: string) => void;
  readonly onNotesChange: (value: string) => void;
  readonly onSubmit: () => void;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 md:p-8">
      <p className="text-[10px] font-black text-tak-yellow uppercase tracking-[0.25em]">Ejecucion manual gobernada</p>
      <h4 className="mt-2 text-xl font-black text-white">Registrar resultado</h4>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as 'PLANNED' | 'EXECUTED' | 'PARTIAL' | 'CANCELLED')}
            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow/60"
          >
            <option value="EXECUTED">Ejecutada</option>
            <option value="PARTIAL">Parcial</option>
            <option value="PLANNED">Planificada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ahorro reportado por el usuario ({currency})</span>
          <input
            value={savings}
            onChange={(event) => onSavingsChange(event.target.value)}
            inputMode="decimal"
            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow/60"
          placeholder="Opcional; no es una verificacion"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notas / evidencia</span>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-100 outline-none focus:border-tak-yellow/60"
            placeholder="Describe que se hizo manualmente y como se validara el ahorro."
          />
        </label>
        {error !== null && <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-300">{error}</p>}
        {message !== null && <p className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-xs font-bold text-green-300">{message}</p>}
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-2xl bg-tak-yellow py-3 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-60"
        >
          {loading ? 'Guardando...' : 'Guardar ejecucion manual'}
        </button>
      </div>
    </div>
  );
}
export function SavingsMeasurementPanel({
  readiness,
  measurement,
  loading,
  actionLoading,
  error,
  canVerify,
  canCalculate,
  onCalculate,
  onVerify,
  onReject,
}: {
  readonly readiness: SavingsMeasurementReadiness | null;
  readonly measurement?: SavingsMeasurement;
  readonly loading: boolean;
  readonly actionLoading: boolean;
  readonly error: string | null;
  readonly canVerify: boolean;
  readonly canCalculate: boolean;
  readonly onCalculate: () => void;
  readonly onVerify: () => void;
  readonly onReject: () => void;
}) {
  const status = measurement?.status ?? readiness?.status ?? 'NO_EXECUTION';
  const statusLabel: Record<string, string> = {
    NO_EXECUTION: 'Sin ejecución medible',
    WAITING_FOR_DATA: 'Esperando datos posteriores',
    READY: 'Lista para calcular',
    CALCULATED: 'Calculada, pendiente de verificación humana',
    INSUFFICIENT_EVIDENCE: 'Evidencia insuficiente',
    VERIFIED: 'Ahorro verificado',
    REJECTED: 'Medición rechazada',
    FAILED: 'Error de medición',
  };
  const isIncrease = (measurement?.costIncreaseMonthlyAmount ?? 0) > 0;
  const tone = status === 'VERIFIED'
    ? 'border-green-500/30 bg-green-500/5'
    : status === 'INSUFFICIENT_EVIDENCE' || isIncrease
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-cyan-500/20 bg-cyan-500/5';

  return (
    <section className={`rounded-3xl border p-6 md:p-8 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Medición verificable del ahorro</p>
          <h4 className="mt-2 text-xl font-black text-white">Resultado después de ejecutar</h4>
        </div>
        <span className="rounded-full bg-zinc-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-200">{statusLabel[status] ?? status}</span>
      </div>
      {readiness !== null && readiness.reasons.length > 0 && (
        <ul className="mt-5 space-y-2 text-xs font-medium text-zinc-400">
          {readiness.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
        </ul>
      )}
      {measurement === undefined ? (
        <p className="mt-5 text-sm font-medium text-zinc-400">Registra una ejecución con fecha para preparar la comparación de costos.</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Ventana" value={`${measurement.windowDays} días · ${measurement.observationCoveredDays}/${measurement.windowDays} posteriores`} />
          <MetricCard label="Antes" value={measurement.baselineCost === undefined ? 'Sin datos' : `${measurement.currency} ${measurement.baselineCost.toFixed(2)}`} />
          <MetricCard label="Después" value={measurement.observationCost === undefined ? 'Sin datos' : `${measurement.currency} ${measurement.observationCost.toFixed(2)}`} />
          <MetricCard label={isIncrease ? 'Aumento observado' : 'Ahorro observado'} value={measurement.observedSavings === undefined ? 'Sin cálculo' : `${measurement.currency} ${Math.abs(measurement.observedSavings).toFixed(2)}`} />
          <MetricCard label={isIncrease ? 'Aumento mensual' : 'Ahorro mensual proyectado'} value={isIncrease ? `${measurement.currency} ${(measurement.costIncreaseMonthlyAmount ?? 0).toFixed(2)}` : measurement.projectedMonthlySavings === undefined ? 'Sin cálculo' : `${measurement.currency} ${measurement.projectedMonthlySavings.toFixed(2)}`} />
        </div>
      )}
      {measurement !== undefined && (
        <div className="mt-5 space-y-2 text-xs text-zinc-400">
          <p>Ejecución: {formatDateTime(measurement.executedAt)} · Base: {formatDateTime(measurement.baselineStart)} → {formatDateTime(measurement.baselineEnd)} · Posterior: {formatDateTime(measurement.observationStart)} → {formatDateTime(measurement.observationEnd)}</p>
          <p>Fuente: {measurement.billingSource} · Base de costo: {measurement.costBasis ?? 'no disponible'} · Cobertura: {(measurement.coverageRatio * 100).toFixed(0)}%</p>
          <p>Consumo: {measurement.baselineQuantity?.toFixed(2) ?? 'sin dato'} → {measurement.observationQuantity?.toFixed(2) ?? 'sin dato'} {measurement.consumedUnit ?? ''}</p>
          <p>Confianza: {measurement.confidenceLevel ?? 'no disponible'} · Validación técnica: {measurement.technicalValidationStatus}</p>
          <p>Método: {measurement.calculationMethod === 'UNIT_NORMALIZED' ? 'costo por unidad normalizado' : 'diferencia de costo'}{measurement.consumedUnit !== undefined ? ` · Unidad: ${measurement.consumedUnit}` : ''}</p>
          {measurement.quantityChangeRatio !== undefined && <p>Cambio de volumen: {(measurement.quantityChangeRatio * 100).toFixed(1)}%</p>}
          <p>Fórmula: costo diario base = costo base / días base; costo diario posterior = costo posterior / días posteriores; proyección mensual = diferencia diaria × 30,4375.</p>
          {measurement.reasons.length > 0 && <p className="text-amber-200">{measurement.reasons.join(' ')}</p>}
        </div>
      )}
      {error !== null && <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-300">{error}</p>}
      {canCalculate && measurementReadinessCanCalculate(status) && (
        <button onClick={onCalculate} disabled={actionLoading || loading} className="mt-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-200 disabled:opacity-50">
          {actionLoading ? 'Calculando...' : measurement === undefined ? 'Calcular ahorro' : 'Recalcular con datos disponibles'}
        </button>
      )}
      {measurement !== undefined && canVerify && (measurement.status === 'CALCULATED' || measurement.status === 'INSUFFICIENT_EVIDENCE') && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onVerify} disabled={actionLoading || loading || measurement.status !== 'CALCULATED'} className="rounded-2xl bg-green-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-950 disabled:opacity-50">
            {actionLoading ? 'Guardando...' : 'Verificar ahorro'}
          </button>
          <button onClick={onReject} disabled={actionLoading || loading} className="rounded-2xl border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-200 disabled:opacity-50">
            Rechazar medición
          </button>
        </div>
      )}
    </section>
  );
}

function measurementReadinessCanCalculate(status: string): boolean {
  return status === 'READY' || status === 'WAITING_FOR_DATA' || status === 'CALCULATED' || status === 'INSUFFICIENT_EVIDENCE';
}

