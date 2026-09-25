import { useMemo } from 'react';
import { type ApiRole } from '../services/api';
import { DecisionModal } from './resource-detail/DecisionModal';
import { CanonicalEvidencePanel, ExecutionPlanPanel } from './resource-detail/ExecutionPlanPanels';
import { ManualExecutionPanel, SavingsMeasurementPanel } from './resource-detail/ExecutionSavingsPanels';
import { TimelinePanel } from './resource-detail/RecommendationTimelinePanel';
import { Badge, DetailShell, EvidenceLine, MetricCard } from './resource-detail/ResourceDetailDisplay';
import { useResourceDetailController } from './resource-detail/useResourceDetailController';
import {
  calculateMissedSavings,
  formatEvidenceLevel,
  formatUsageEvidence,
  readCanonicalEvidenceSnapshot,
  readEvidence,
  shortenType,
} from './resource-detail/resourceDetailEvidence';
import { formatCurrency, severityLabel } from './resource-detail/resourceDetailPresentation';

interface ResourceDetailProps {
  readonly recommendationId: string;
  readonly apiRole: ApiRole;
  readonly onBack: () => void;
}
function isOperationalRole(role: ApiRole): boolean {
  return role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN' || role === 'LEAD_TECHNICIAN' || role === 'FINOPS_TECHNICIAN';
}

function canApproveRecommendation(role: ApiRole): boolean {
  return isOperationalRole(role) || role === 'CLIENT_APPROVER';
}

export default function ResourceDetail({ recommendationId, apiRole, onBack }: ResourceDetailProps) {
  const {
    recommendation, loading, error, executionPlan, planLoading, planLookupLoading, planError,
    decisionLoading, decisionError, decisionLearningStatus, decisionNote, decisionReasonCode, decisionMode,
    timeline, manualStatus, manualSavings, manualNotes, manualLoading, manualMessage, manualError,
    measurementReadiness, measurements, measurementLoading, measurementError, measurementActionLoading,
    setDecisionNote, setDecisionReasonCode, setDecisionMode, setDecisionError,
    setManualStatus, setManualSavings, setManualNotes,
    handleReviewPlan, openDecisionModal, handleDecision, handleManualExecution,
    handleVerifyMeasurement, handleCalculateMeasurement, handleRejectMeasurement,
  } = useResourceDetailController(recommendationId);

  const evidence = useMemo(
    () => readEvidence(recommendation?.evidence),
    [recommendation],
  );
  const canonicalEvidence = useMemo(
    () => readCanonicalEvidenceSnapshot(evidence.raw['recommendationEvidenceSnapshot']),
    [evidence],
  );
  if (loading) {
    return (
      <DetailShell onBack={onBack}>
        <div className="ui-state-screen min-h-[50vh] text-sm font-bold">Cargando detalle de recomendación…</div>
      </DetailShell>
    );
  }

  if (error !== null || recommendation === null) {
    return (
      <DetailShell onBack={onBack}>
        <div className="ui-state-screen min-h-[50vh] p-10 text-center">
          <p className="text-sm font-bold text-red-300">{error ?? 'Recomendacion no encontrada'}</p>
          <button onClick={onBack} className="mt-6 bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
            Volver
          </button>
        </div>
      </DetailShell>
    );
  }

  const source = evidence.source === 'nvidia-nim'
    ? 'NVIDIA NIM (histórico)'
    : evidence.source === 'openai-compatible'
      ? 'IA compatible · GPT-5.6 Luna'
      : 'Seed / FOCUS';
  const currentCost = evidence.observedCost ?? evidence.serviceCost ?? evidence.accountCost;
  const savings = recommendation.estimatedMonthlySavings;
  const potentialSavings = evidence.potentialMonthlySavings;
  const currency = recommendation.currency;
  const missedSavings = calculateMissedSavings(recommendation);
  const savingsRate = currentCost !== undefined && currentCost > 0 && savings !== undefined
    ? Math.min((savings / currentCost) * 100, 100)
    : undefined;
  const service = evidence.service ?? evidence.metric ?? shortenType(recommendation.type);
  const canGenerateExecutionPlan = isOperationalRole(apiRole);
  const canDecide = canApproveRecommendation(apiRole) &&
    executionPlan?.auditVerdict === 'APPROVED' &&
    executionPlan.recommendationId === recommendation.id &&
    recommendation.status === 'PENDING';
  const canRegisterManualExecution = canGenerateExecutionPlan &&
    executionPlan?.recommendationId === recommendation.id &&
    (recommendation.status === 'APPROVED' || recommendation.status === 'MANUAL_COMPLETED');

  return (
    <DetailShell onBack={onBack}>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          <div className="lg:col-span-7 space-y-8">
            <div className="ui-surface-raised p-6 md:p-8">
              <span className="text-[10px] font-black text-tak-yellow uppercase tracking-[0.25em]">Recomendacion seleccionada</span>
              <h3 className="text-xl md:text-2xl font-black mt-2 text-white tracking-tight">{recommendation.title}</h3>
              <div className="flex flex-wrap gap-2 mt-5">
                <Badge label={severityLabel[recommendation.severity]} tone={recommendation.severity} />
                <Badge label={recommendation.status.replace('_', ' ')} />
                <Badge label={source} />
                <Badge label={recommendation.cloudAccountId} />
              </div>
            </div>

            <div className="ui-surface-raised p-6 md:p-8">
              <h4 className="font-black text-zinc-200 text-base md:text-lg uppercase tracking-tight">Evidencia factual</h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Esta oportunidad usa datos agregados del período. No se muestra una serie temporal porque el detalle no contiene puntos crudos verificables.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><span className="text-zinc-500">Servicio</span><p className="mt-1 font-bold text-zinc-200">{service}</p></div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><span className="text-zinc-500">Período</span><p className="mt-1 font-bold text-zinc-200">{evidence.environment ?? 'Snapshot agregado'}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <MetricCard label="Cuenta cloud" value={recommendation.cloudAccountId} />
              <MetricCard label="Tipo de accion" value={recommendation.type} />
              <MetricCard label="Ambiente" value={evidence.environment ?? 'No especificado'} />
              <MetricCard label="Metricas relacionadas" value={String(evidence.metricCount ?? 'No disponible')} />
              <MetricCard label="Nivel de evidencia" value={formatEvidenceLevel(evidence.evidenceLevel)} />
              <MetricCard label="Consumo FOCUS" value={formatUsageEvidence(evidence)} />
            </div>

            {canonicalEvidence !== undefined && <CanonicalEvidencePanel snapshot={canonicalEvidence} evidence={evidence} />}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-5">
              <div className="ui-surface-raised p-6 md:p-7">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Costo observado</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {currentCost === undefined ? 'No disponible' : formatCurrency(currentCost, currency)}
                  {currentCost !== undefined && <span className="text-xs font-medium text-zinc-500 ml-1 tracking-tight">{currency}</span>}
                </p>
              </div>
              <div className="ui-callout ui-callout-accent relative overflow-hidden p-6 md:p-7">
                <div className="absolute top-0 right-0 w-24 h-24 bg-tak-yellow/10 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                 <p className="text-[10px] font-black text-tak-yellow uppercase tracking-widest mb-2">{savings === undefined ? 'Potencial por validar' : 'Ahorro estimado'}</p>
                 <p className="text-3xl md:text-4xl font-black text-tak-yellow tracking-tighter">
                   {savings === undefined
                     ? potentialSavings === undefined ? 'No cuantificado' : `${formatCurrency(potentialSavings, currency)}*`
                     : formatCurrency(savings, currency)}
                   {savings !== undefined && <span className="text-sm font-medium opacity-60 ml-1">/mes</span>}
                 </p>
                 {evidence.savingsStatus === 'UNVERIFIED_LEGACY' && <p className="mt-2 text-[11px] text-amber-200">El importe histórico no tiene un cálculo verificable; se excluye de los ahorros y no debe interpretarse como impacto económico.</p>}
                 {savings === undefined && potentialSavings !== undefined && <p className="mt-2 text-[11px] text-zinc-400">* Potencial financiero sujeto a validación; no es ahorro realizado.</p>}
                {missedSavings > 0 && (
                  <p className="mt-3 text-xs font-bold leading-relaxed text-zinc-300">
                    ¿Sabías que podrías haberte ahorrado {formatCurrency(missedSavings, currency)} desde que esta oportunidad fue creada?
                  </p>
                )}
              </div>
            </div>

            <div className="ui-surface-raised relative flex flex-1 flex-col overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tak-yellow/0 via-tak-yellow/50 to-tak-yellow/0"></div>
              <div className="bg-zinc-900/50 px-6 py-4 flex items-center gap-3 border-b border-zinc-800">
                <span className="material-symbols-outlined text-tak-yellow text-2xl">auto_awesome</span>
                <h4 className="text-xs font-black uppercase tracking-[0.15em] text-white italic">Analisis Inteligente TAK</h4>
              </div>
              <div className="p-6 md:p-8 space-y-6 flex-1">
                <p className="text-sm md:text-base leading-relaxed text-zinc-300 font-medium">
                  {recommendation.description}
                </p>

                <div className="space-y-4">
                  <EvidenceLine icon="payments" label="Ahorro estimado" value={savingsRate === undefined ? 'No cuantificado o pendiente de validación' : `${savingsRate.toFixed(1)}% del costo observado`} />
                  {evidence.confidence !== undefined && <EvidenceLine icon="verified" label="Confianza del análisis" value={`${(evidence.confidence * 100).toFixed(0)}%`} />}
                  {missedSavings > 0 && (
                    <EvidenceLine icon="savings" label="Ahorro no capturado" value={`${formatCurrency(missedSavings, currency)} acumulado desde la generacion de la recomendacion`} />
                  )}
                  <EvidenceLine icon="cloud" label="Servicio" value={service} />
                  {evidence.unitCost !== undefined && (
                    <EvidenceLine icon="price_check" label="Costo unitario FOCUS" value={formatCurrency(evidence.unitCost, currency)} />
                  )}
                  {evidence.deltaConsumptionPercent !== undefined && (
                    <EvidenceLine icon="trending_up" label="Variacion de consumo" value={`${evidence.deltaConsumptionPercent.toFixed(1)}%`} />
                  )}
                  {evidence.focusLimitation !== undefined && (
                    <EvidenceLine icon="info" label="Limite de FOCUS" value={evidence.focusLimitation} />
                  )}
                  {evidence.requiresTechnicalValidation === true && (
                    <EvidenceLine icon="fact_check" label="Validacion tecnica pendiente" value="Confirmar CPU, memoria, IOPS o throughput en la capa de metricas tecnicas antes de ejecutar cambios." />
                  )}
                  {evidence.schedulingPotential !== undefined && (
                    <EvidenceLine icon="schedule" label="Ventana de optimizacion" value={evidence.schedulingPotential} />
                  )}
                  {evidence.utilizationCheckRequired === true && (
                    <EvidenceLine icon="speed" label="Validacion requerida" value="Revisar utilizacion CPU/RAM antes de ejecutar rightsizing" />
                  )}
                  {evidence.lifecyclePolicyRequired === true && (
                    <EvidenceLine icon="inventory_2" label="Validacion requerida" value="Configurar reglas de ciclo de vida y retencion" />
                  )}
                </div>

                <div className="pt-6 border-t border-zinc-800 mt-auto">
                  <p className="text-[10px] font-black text-tak-yellow mb-3 uppercase tracking-widest italic">Accion recomendada:</p>
                  <p className="text-sm md:text-base text-zinc-100 font-bold leading-relaxed">
                    {evidence.action ?? recommendation.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {executionPlan === null && canGenerateExecutionPlan && (
                <button
                  onClick={handleReviewPlan}
                  disabled={planLoading || planLookupLoading}
                  className="ui-button ui-button-primary w-full py-4 text-sm uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined font-black">bolt</span>
                  {planLoading ? 'Generando plan auditado...' : planLookupLoading ? 'Buscando plan guardado...' : 'Revisar plan de ejecucion'}
                </button>
              )}
              {executionPlan === null && !canGenerateExecutionPlan && !planLookupLoading && (
                <p className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs font-bold text-zinc-400">
                  Un técnico FinOps o administrador puede generar el plan. Cuando esté aprobado, podrás consultarlo aquí.
                </p>
              )}
              <button onClick={onBack} className="ui-button ui-button-secondary w-full py-4 text-xs uppercase tracking-widest">
                Volver a recomendaciones
              </button>
            </div>
          </div>
        </div>

        {(planError !== null || executionPlan !== null) && (
          <div className="mt-8">
            {planError !== null ? (
              <div role="alert" aria-live="assertive" className="ui-alert-danger whitespace-pre-line p-6 text-sm font-bold">
                {planError}
              </div>
            ) : executionPlan !== null ? (
              <ExecutionPlanPanel
                plan={executionPlan}
                canDecide={canDecide}
                decisionLoading={decisionLoading}
                decisionError={decisionError}
                decisionLearningStatus={decisionLearningStatus}
                status={recommendation.status}
                onApprove={() => openDecisionModal('APPROVED')}
                onReject={() => openDecisionModal('REJECTED')}
              />
            ) : null}
          </div>
        )}

        {(canRegisterManualExecution || timeline.length > 0) && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {canRegisterManualExecution && (
              <ManualExecutionPanel
                status={manualStatus}
                savings={manualSavings}
                notes={manualNotes}
                loading={manualLoading}
                message={manualMessage}
                error={manualError}
                currency={recommendation.currency}
                onStatusChange={setManualStatus}
                onSavingsChange={setManualSavings}
                onNotesChange={setManualNotes}
                onSubmit={() => void handleManualExecution()}
              />
            )}
            <TimelinePanel events={timeline} />
          </div>
        )}
        {(measurementReadiness !== null || measurements.length > 0) && (
          <div className="mt-8">
            <SavingsMeasurementPanel
              readiness={measurementReadiness}
              measurement={measurements[0]}
              loading={measurementLoading}
              actionLoading={measurementActionLoading}
              error={measurementError}
              canVerify={canApproveRecommendation(apiRole)}
              canCalculate={canRegisterManualExecution}
              onCalculate={() => void handleCalculateMeasurement()}
              onVerify={() => void handleVerifyMeasurement()}
              onReject={() => void handleRejectMeasurement()}
            />
          </div>
        )}
      </div>

      {decisionMode !== null && (
        <DecisionModal
          mode={decisionMode}
          reasonCode={decisionReasonCode}
          note={decisionNote}
          loading={decisionLoading}
          error={decisionError}
          onReasonCodeChange={setDecisionReasonCode}
          onNoteChange={setDecisionNote}
          onCancel={() => {
            if (!decisionLoading) {
              setDecisionMode(null);
              setDecisionError(null);
            }
          }}
          onSubmit={() => void handleDecision()}
        />
      )}

      <div className="px-6 py-4 md:px-10 md:py-6 bg-zinc-950/80 border-t border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex items-center gap-3">
          <div className="size-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
           <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Detalle conectado a la base de datos activa</span>
        </div>
        <p className="text-[9px] md:text-[10px] text-zinc-600 font-black tracking-widest uppercase">FinOps Demo © {new Date().getFullYear()} • Powered by FinOps AI</p>
      </div>
    </DetailShell>
  );
}
