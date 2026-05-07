import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchLatestRecommendationExecutionPlan,
  fetchRecommendationById,
  fetchRecommendationTimeline,
  generateRecommendationExecutionPlan,
  submitManualExecution,
  submitRecommendationDecision,
  type AppRole,
  type AiAuditReport,
  type Recommendation,
  type RecommendationExecutionPlan,
  type RecommendationFeedbackReason,
  type RecommendationSeverity,
  type RecommendationTimelineEvent,
} from '../services/api';

interface ResourceDetailProps {
  readonly recommendationId: string;
  readonly token: string;
  readonly currentRole: AppRole;
  readonly onBack: () => void;
}

interface EvidenceRecord {
  readonly source?: string;
  readonly environment?: string;
  readonly service?: string;
  readonly metric?: string;
  readonly action?: string;
  readonly accountCost?: number;
  readonly serviceCost?: number;
  readonly metricCount?: number;
  readonly evidenceLevel?: string;
  readonly focusLimitation?: string;
  readonly requiresTechnicalValidation?: boolean;
  readonly consumedQuantity?: number;
  readonly consumedUnit?: string;
  readonly unitCost?: number;
  readonly deltaConsumptionPercent?: number;
  readonly deltaCostPercent?: number;
  readonly schedulingPotential?: string;
  readonly utilizationCheckRequired?: boolean;
  readonly lifecyclePolicyRequired?: boolean;
  readonly raw: Readonly<Record<string, unknown>>;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const severityLabel: Record<RecommendationSeverity, string> = {
  CRITICAL: 'Critica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

const approvalReasons: ReadonlyArray<{
  readonly value: RecommendationFeedbackReason;
  readonly label: string;
}> = [
  { value: 'APPROVED_HIGH_CONFIDENCE', label: 'Evidencia suficiente y accion viable' },
  { value: 'APPROVED_LOW_RISK_QUICK_WIN', label: 'Accion simple, bajo riesgo y beneficio claro' },
];

const rejectionReasons: ReadonlyArray<{
  readonly value: RecommendationFeedbackReason;
  readonly label: string;
}> = [
  { value: 'REJECTED_INSUFFICIENT_EVIDENCE', label: 'Faltan metricas o evidencia tecnica' },
  { value: 'REJECTED_SAVINGS_UNREALISTIC', label: 'Ahorro estimado no creible' },
  { value: 'REJECTED_OPERATIONAL_RISK', label: 'Riesgo operativo mayor al beneficio' },
  { value: 'REJECTED_BUSINESS_EXCEPTION', label: 'Existe una excepcion de negocio' },
  { value: 'REJECTED_ALREADY_HANDLED', label: 'Ya fue implementada o esta en curso' },
  { value: 'REJECTED_WRONG_SCOPE', label: 'Cuenta, servicio, ambiente o recurso incorrecto' },
  { value: 'REJECTED_NOT_ACTIONABLE', label: 'Recomendacion demasiado generica' },
];

export default function ResourceDetail({ recommendationId, token, currentRole, onBack }: ResourceDetailProps) {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executionPlan, setExecutionPlan] = useState<RecommendationExecutionPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planLookupLoading, setPlanLookupLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionLearningStatus, setDecisionLearningStatus] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionReasonCode, setDecisionReasonCode] = useState<RecommendationFeedbackReason | ''>('');
  const [decisionMode, setDecisionMode] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [timeline, setTimeline] = useState<readonly RecommendationTimelineEvent[]>([]);
  const [manualStatus, setManualStatus] = useState<'PLANNED' | 'EXECUTED' | 'PARTIAL' | 'CANCELLED'>('EXECUTED');
  const [manualSavings, setManualSavings] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setExecutionPlan(null);
    setPlanError(null);
    setDecisionError(null);
    setDecisionLearningStatus(null);
    setDecisionNote('');
    setDecisionReasonCode('');
    setDecisionMode(null);
    setPlanLookupLoading(true);

    fetchRecommendationById(token, recommendationId)
      .then((response) => {
        if (active) {
          setRecommendation(response.recommendation);
        }
        return fetchLatestRecommendationExecutionPlan(token, recommendationId);
      })
      .then((response) => {
        if (active) {
          setExecutionPlan(response.executionPlan);
        }
        return fetchRecommendationTimeline(token, recommendationId);
      })
      .then((response) => {
        if (active) {
          setTimeline(response.timeline);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar el detalle');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setPlanLookupLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [recommendationId, token]);

  const evidence = useMemo(
    () => readEvidence(recommendation?.evidence),
    [recommendation],
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
  const savingsRate = currentCost > 0 ? Math.min((savings / currentCost) * 100, 95) : 0;
  const service = evidence.service ?? evidence.metric ?? shortenType(recommendation.type);
  const canDecide = currentRole === 'admin' &&
    executionPlan?.auditVerdict === 'APPROVED' &&
    executionPlan.recommendationId === recommendation.id &&
    recommendation.status === 'PENDING';
  const canRegisterManualExecution = currentRole === 'admin' &&
    executionPlan?.recommendationId === recommendation.id &&
    (recommendation.status === 'APPROVED' || recommendation.status === 'MANUAL_COMPLETED');

  const handleReviewPlan = async () => {
    setPlanError(null);
    setDecisionError(null);
    setPlanLoading(true);

    try {
      const response = await generateRecommendationExecutionPlan(token, recommendation.id);
      setExecutionPlan(response.executionPlan);
    } catch (requestError) {
      setPlanError(requestError instanceof Error ? requestError.message : 'No fue posible generar el plan auditado');
    } finally {
      setPlanLoading(false);
    }
  };

  const openDecisionModal = (decision: 'APPROVED' | 'REJECTED') => {
    setDecisionMode(decision);
    setDecisionError(null);
    setDecisionLearningStatus(null);
    setDecisionNote('');
    setDecisionReasonCode(decision === 'APPROVED'
      ? approvalReasons[0]?.value ?? ''
      : rejectionReasons[0]?.value ?? '');
  };

  const handleDecision = async () => {
    if (executionPlan === null) {
      return;
    }

    if (decisionMode === null) {
      return;
    }

    const reason = decisionNote.trim();

    if (decisionReasonCode === '') {
      setDecisionError('Debes seleccionar un motivo estructurado.');
      return;
    }

    if (decisionMode === 'REJECTED' && reason === '') {
      setDecisionError('Debes indicar el motivo del rechazo.');
      return;
    }

    setDecisionLoading(true);
    setDecisionError(null);

    try {
      const response = await submitRecommendationDecision(token, recommendation.id, {
        executionPlanId: executionPlan.id,
        decision: decisionMode,
        reasonCode: decisionReasonCode,
        ...(reason !== '' ? { reason } : {}),
      });
      setRecommendation(response.recommendation);
      const timelineResponse = await fetchRecommendationTimeline(token, recommendation.id);
      setTimeline(timelineResponse.timeline);
      setDecisionLearningStatus('Decision guardada. Aprendizaje en cola.');
      setDecisionMode(null);
      window.setTimeout(() => {
        void fetchRecommendationTimeline(token, recommendation.id)
          .then((refreshResponse) => setTimeline(refreshResponse.timeline))
          .catch(() => undefined);
      }, 3500);
    } catch (requestError) {
      setDecisionError(requestError instanceof Error ? requestError.message : 'No fue posible registrar la decision');
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleManualExecution = async () => {
    if (executionPlan === null) {
      return;
    }

    const parsedSavings = manualSavings.trim() === '' ? undefined : Number.parseFloat(manualSavings);

    if (parsedSavings !== undefined && (!Number.isFinite(parsedSavings) || parsedSavings < 0)) {
      setManualError('El ahorro observado debe ser un numero mayor o igual a cero.');
      return;
    }

    setManualLoading(true);
    setManualError(null);
    setManualMessage(null);

    try {
      const response = await submitManualExecution(token, recommendation.id, {
        executionPlanId: executionPlan.id,
        status: manualStatus,
        executedAt: new Date().toISOString(),
        ...(parsedSavings !== undefined ? { observedMonthlySavings: parsedSavings } : {}),
        currency: recommendation.currency,
        ...(manualNotes.trim() !== '' ? { notes: manualNotes.trim() } : {}),
      });

      if (response.recommendation !== null) {
        setRecommendation(response.recommendation);
      }

      const timelineResponse = await fetchRecommendationTimeline(token, recommendation.id);
      setTimeline(timelineResponse.timeline);
      setManualMessage('Ejecucion manual registrada y KPI actualizado.');
      setManualSavings('');
      setManualNotes('');
    } catch (requestError) {
      setManualError(requestError instanceof Error ? requestError.message : 'No fue posible registrar la ejecucion manual');
    } finally {
      setManualLoading(false);
    }
  };

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
              <button
                onClick={handleReviewPlan}
                disabled={planLoading || planLookupLoading}
                className="w-full bg-tak-yellow hover:bg-yellow-400 disabled:opacity-60 disabled:hover:bg-tak-yellow py-4 rounded-2xl text-zinc-950 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_10px_30px_-10px_rgba(250,204,21,0.3)]"
              >
                <span className="material-symbols-outlined font-black">bolt</span>
                {planLoading
                  ? 'Generando plan auditado...'
                  : planLookupLoading
                    ? 'Buscando plan guardado...'
                    : executionPlan === null
                      ? 'Revisar plan de ejecucion'
                      : 'Regenerar plan auditado'}
              </button>
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

function DetailShell({ children, onBack }: { readonly children: ReactNode; readonly onBack: () => void }) {
  return (
    <div className="animate-in fade-in duration-500 w-full max-w-5xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-[0_40px_100px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-5 md:px-10 md:py-7 border-b border-zinc-800/50 bg-zinc-950/20">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="size-10 md:size-12 rounded-2xl bg-tak-yellow/10 flex items-center justify-center border border-tak-yellow/20 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
            <span className="material-symbols-outlined text-tak-yellow text-2xl md:text-3xl">insights</span>
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-black tracking-tight text-white uppercase italic">Detalle de Recomendacion</h2>
            <p className="text-[10px] md:text-xs text-zinc-500 font-bold tracking-widest uppercase">FinOps Console • Cloud Optimizer</p>
          </div>
        </div>
        <button onClick={onBack} className="size-10 md:size-12 flex items-center justify-center rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white border border-zinc-700/50 active:scale-95">
          <span className="material-symbols-outlined font-bold">close</span>
        </button>
      </div>
      {children}
    </div>
  );
}

function Badge({ label, tone }: { readonly label: string; readonly tone?: RecommendationSeverity }) {
  const color = tone === 'CRITICAL' || tone === 'HIGH'
    ? 'bg-red-500/10 text-red-300 border-red-500/20'
    : tone === 'MEDIUM'
      ? 'bg-tak-yellow/10 text-tak-yellow border-tak-yellow/20'
      : 'bg-zinc-800 text-zinc-300 border-zinc-700';

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
      {label}
    </span>
  );
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="bg-zinc-950/20 border border-zinc-800 p-5 rounded-2xl min-w-0">
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm font-bold text-zinc-100 break-words">{value}</p>
    </div>
  );
}

function EvidenceLine({ icon, label, value }: { readonly icon: string; readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
      <span className="material-symbols-outlined text-tak-yellow text-xl">{icon}</span>
      <p className="text-xs md:text-sm text-zinc-400 font-medium">
        {value}
        <span className="block text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{label}</span>
      </p>
    </div>
  );
}

function ExecutionPlanPanel({
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

          {canDecide && (
            <div className="space-y-4">
              {decisionError !== null && (
                <p className="text-xs font-bold text-red-300">{decisionError}</p>
              )}
              {decisionLearningStatus !== null && (
                <p className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-xs font-bold text-green-300">
                  {decisionLearningStatus}
                </p>
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

function ManualExecutionPanel({
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
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ahorro observado mensual ({currency})</span>
          <input
            value={savings}
            onChange={(event) => onSavingsChange(event.target.value)}
            inputMode="decimal"
            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow/60"
            placeholder="0.00"
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

function TimelinePanel({ events }: { readonly events: readonly RecommendationTimelineEvent[] }) {
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

function DecisionModal({
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

function normalizeAuditReport(
  value: unknown,
  score: number,
  verdict: RecommendationExecutionPlan['auditVerdict'],
): AiAuditReport {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Partial<AiAuditReport>;

    return {
      verdict: record.verdict ?? verdict,
      score: typeof record.score === 'number' ? record.score : score,
      checks: Array.isArray(record.checks) ? record.checks : [],
      blockingIssues: Array.isArray(record.blockingIssues) ? record.blockingIssues : [],
      requiredChanges: Array.isArray(record.requiredChanges) ? record.requiredChanges : [],
    };
  }

  return {
    verdict,
    score,
    checks: [],
    blockingIssues: [],
    requiredChanges: [],
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function readEvidence(value: unknown): EvidenceRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { raw: {} };
  }

  const raw = value as Record<string, unknown>;

  return {
    source: readString(raw, 'source'),
    environment: readString(raw, 'environment'),
    service: readString(raw, 'service') ?? readStringArray(raw, 'services')?.join(', '),
    metric: readString(raw, 'metric'),
    action: readString(raw, 'action'),
    accountCost: readNumber(raw, 'accountCost'),
    serviceCost: readNumber(raw, 'serviceCost'),
    metricCount: readNumber(raw, 'metricCount'),
    evidenceLevel: readString(raw, 'evidenceLevel'),
    focusLimitation: readString(raw, 'focusLimitation'),
    requiresTechnicalValidation: readBoolean(raw, 'requiresTechnicalValidation'),
    consumedQuantity: readNumber(raw, 'consumedQuantity'),
    consumedUnit: readString(raw, 'consumedUnit'),
    unitCost: readNumber(raw, 'unitCost'),
    deltaConsumptionPercent: readNumber(raw, 'deltaConsumptionPercent'),
    deltaCostPercent: readNumber(raw, 'deltaCostPercent'),
    schedulingPotential: readString(raw, 'schedulingPotential'),
    utilizationCheckRequired: readBoolean(raw, 'utilizationCheckRequired'),
    lifecyclePolicyRequired: readBoolean(raw, 'lifecyclePolicyRequired'),
    raw,
  };
}

function formatEvidenceLevel(value: string | undefined): string {
  switch (value) {
    case 'COST_USAGE_AND_TECHNICAL':
      return 'Costo + consumo + metrica tecnica';
    case 'COST_AND_USAGE':
      return 'Costo + consumo FOCUS';
    case 'COST_ONLY':
      return 'Solo costo';
    default:
      return 'No especificado';
  }
}

function formatUsageEvidence(evidence: EvidenceRecord): string {
  if (evidence.consumedQuantity === undefined || evidence.consumedUnit === undefined) {
    return 'No disponible';
  }

  return `${formatNumber(evidence.consumedQuantity)} ${evidence.consumedUnit}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function buildUsageChart(recommendation: Recommendation | null, evidence: EvidenceRecord): {
  readonly baselinePath: string;
  readonly costPath: string;
} {
  const cost = evidence.serviceCost ?? evidence.accountCost ?? recommendation?.estimatedMonthlySavings ?? 1;
  const severityBoost = recommendation?.severity === 'CRITICAL'
    ? 36
    : recommendation?.severity === 'HIGH'
      ? 28
      : recommendation?.severity === 'MEDIUM'
        ? 18
        : 10;
  const base = Math.max(35, Math.min(180, cost * 1.4 + severityBoost));
  const points = Array.from({ length: 11 }, (_, index) => {
    const x = index * 80;
    const variance = Math.sin(index * 1.7 + base) * 16;
    const y = Math.max(24, Math.min(224, 230 - base - variance));
    return `${x},${Math.round(y)}`;
  });
  const baseline = Array.from({ length: 11 }, (_, index) => {
    const x = index * 80;
    const y = Math.max(40, Math.min(230, 205 - severityBoost / 2 + Math.cos(index) * 8));
    return `${x},${Math.round(y)}`;
  });

  return {
    costPath: `M${points.join(' L')}`,
    baselinePath: `M${baseline.join(' L')}`,
  };
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function readStringArray(record: Readonly<Record<string, unknown>>, key: string): string[] | undefined {
  const value = record[key];

  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

function readNumber(record: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const value = record[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readBoolean(record: Readonly<Record<string, unknown>>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function shortenType(type: string): string {
  return type
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
