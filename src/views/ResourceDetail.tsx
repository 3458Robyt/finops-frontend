import { useMemo } from 'react';
import { type ApiRole } from '../services/api';
import { DecisionModal } from './resource-detail/DecisionModal';
import { CanonicalEvidencePanel, ExecutionPlanPanel } from './resource-detail/ExecutionPlanPanels';
import { ManualExecutionPanel, SavingsMeasurementPanel } from './resource-detail/ExecutionSavingsPanels';
import { TimelinePanel } from './resource-detail/RecommendationTimelinePanel';
import { Badge, DetailShell, EvidenceLine, MetricCard } from './resource-detail/ResourceDetailDisplay';
import { useResourceDetailController } from './resource-detail/useResourceDetailController';
import {
  buildUsageChart,
  calculateMissedSavings,
  formatEvidenceLevel,
  formatUsageEvidence,
  readCanonicalEvidenceSnapshot,
  readEvidence,
  shortenType,
} from './resource-detail/resourceDetailEvidence';
import { currencyFormatter, severityLabel } from './resource-detail/resourceDetailPresentation';

interface ResourceDetailProps {
  readonly recommendationId: string;
  readonly apiRole: ApiRole;
  readonly onBack: () => void;
}
function isOperationalRole(role: ApiRole): boolean {
  return role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN' || role === 'FINOPS_TECHNICIAN';
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
  const chart = useMemo(
    () => buildUsageChart(recommendation, evidence),
    [evidence, recommendation],
  );

  if (loading) {
    return (
      <DetailShell onBack={onBack}>
        <div className="p-10 text-center text-sm font-bold text-zinc-500">Cargando detalle de recomendacion...</div>
      </DetailShell>
    );
  }

  if (error !== null || recommendation === null) {
    return (
      <DetailShell onBack={onBack}>
        <div className="p-10 text-center">
          <p className="text-sm font-bold text-red-300">{error ?? 'Recomendacion no encontrada'}</p>
          <button onClick={onBack} className="mt-6 bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
            Volver
          </button>
        </div>
      </DetailShell>
    );
  }

  const source = evidence.source === 'nvidia-nim' ? 'NVIDIA NIM' : 'Seed / FOCUS';
  const currentCost = evidence.serviceCost ?? evidence.accountCost ?? recommendation.estimatedMonthlySavings ?? 0;
  const savings = recommendation.estimatedMonthlySavings ?? 0;
  const missedSavings = calculateMissedSavings(recommendation);
  const savingsRate = currentCost > 0 ? Math.min((savings / currentCost) * 100, 95) : 0;
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
            <div className="bg-zinc-950/30 border border-zinc-800 p-6 md:p-8 rounded-3xl">
              <span className="text-[10px] font-black text-tak-yellow uppercase tracking-[0.25em]">Recomendacion seleccionada</span>
              <h3 className="text-xl md:text-2xl font-black mt-2 text-white tracking-tight">{recommendation.title}</h3>
              <div className="flex flex-wrap gap-2 mt-5">
                <Badge label={severityLabel[recommendation.severity]} tone={recommendation.severity} />
                <Badge label={recommendation.status.replace('_', ' ')} />
                <Badge label={source} />
                <Badge label={recommendation.cloudAccountId} />
              </div>
            </div>

            <div className="bg-zinc-950/20 border border-zinc-800 rounded-3xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h4 className="font-black text-zinc-200 text-base md:text-lg uppercase tracking-tight">Evidencia de consumo</h4>
                  <p className="text-xs text-zinc-500 font-medium">{service}</p>
                </div>
                <div className="flex items-center gap-6 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-tak-yellow shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                    <span className="text-[10px] font-black text-zinc-300 uppercase">Costo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-zinc-600 border border-zinc-500/20"></div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase">Base</span>
                  </div>
                </div>
              </div>

              <div className="relative h-56 md:h-72 w-full">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 240" aria-label="Grafico de evidencia">
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="20" y2="20"></line>
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="90" y2="90"></line>
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="160" y2="160"></line>
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="230" y2="230"></line>
                  <defs>
                    <linearGradient id="detailCostGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#FACC15" stopOpacity="0.3"></stop>
                      <stop offset="100%" stopColor="#FACC15" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                  <path d={chart.baselinePath} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2"></path>
                  <path d={chart.costPath} fill="none" stroke="#FACC15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
                  <path d={`${chart.costPath} V240 H0 Z`} fill="url(#detailCostGradient)"></path>
                </svg>
                <div className="flex justify-between mt-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <span>Inicio periodo</span>
                  <span className="hidden md:block">{evidence.environment ?? 'tenant'}</span>
                  <span className="text-tak-yellow">Recomendacion actual</span>
                </div>
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
              <div className="bg-zinc-950/20 border border-zinc-800 p-6 md:p-7 rounded-3xl">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Costo observado</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {currencyFormatter.format(currentCost)}
                  <span className="text-xs font-medium text-zinc-500 ml-1 tracking-tight">{recommendation.currency}</span>
                </p>
              </div>
              <div className="bg-tak-yellow/5 border border-tak-yellow/20 p-6 md:p-7 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-tak-yellow/10 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                <p className="text-[10px] font-black text-tak-yellow uppercase tracking-widest mb-2">Potencial de ahorro</p>
                <p className="text-3xl md:text-4xl font-black text-tak-yellow tracking-tighter">
                  -{currencyFormatter.format(savings)}
                  <span className="text-sm font-medium opacity-60 ml-1">/mes</span>
                </p>
                {missedSavings > 0 && (
                  <p className="mt-3 text-xs font-bold leading-relaxed text-zinc-300">
                    ¿Sabías que podrías haberte ahorrado {currencyFormatter.format(missedSavings)} desde que esta oportunidad fue creada?
                  </p>
                )}
              </div>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col relative">
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
                  <EvidenceLine icon="payments" label="Ahorro estimado" value={`${savingsRate.toFixed(1)}% del costo observado`} />
                  {missedSavings > 0 && (
                    <EvidenceLine icon="savings" label="Ahorro no capturado" value={`${currencyFormatter.format(missedSavings)} acumulado desde la generacion de la recomendacion`} />
                  )}
                  <EvidenceLine icon="cloud" label="Servicio" value={service} />
                  {evidence.unitCost !== undefined && (
                    <EvidenceLine icon="price_check" label="Costo unitario FOCUS" value={currencyFormatter.format(evidence.unitCost)} />
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
                  className="w-full bg-tak-yellow hover:bg-yellow-400 disabled:opacity-60 disabled:hover:bg-tak-yellow py-4 rounded-2xl text-zinc-950 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_10px_30px_-10px_rgba(250,204,21,0.3)]"
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
              <button onClick={onBack} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 rounded-2xl text-zinc-400 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] border border-zinc-800">
                Volver a recomendaciones
              </button>
            </div>
          </div>
        </div>

        {(planError !== null || executionPlan !== null) && (
          <div className="mt-8">
            {planError !== null ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm font-bold text-red-300">
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
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Detalle conectado a Supabase</span>
        </div>
        <p className="text-[9px] md:text-[10px] text-zinc-600 font-black tracking-widest uppercase">FinOps Demo © {new Date().getFullYear()} • Powered by FinOps AI</p>
      </div>
    </DetailShell>
  );
}
