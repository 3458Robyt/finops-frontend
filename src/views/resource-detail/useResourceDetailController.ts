import { useEffect, useState } from 'react';
import {
  createSavingsMeasurement,
  fetchLatestRecommendationExecutionPlan,
  fetchRecommendationById,
  fetchRecommendationTimeline,
  fetchSavingsMeasurementReadiness,
  fetchSavingsMeasurements,
  generateRecommendationExecutionPlan,
  rejectSavingsMeasurement,
  submitManualExecution,
  submitRecommendationDecision,
  verifySavingsMeasurement,
  type RecommendationFeedbackReason,
} from '../../services/api';

const defaultApprovalReason: RecommendationFeedbackReason = 'APPROVED_HIGH_CONFIDENCE';
const defaultRejectionReason: RecommendationFeedbackReason = 'REJECTED_INSUFFICIENT_EVIDENCE';

export function useResourceDetailController(token: string, recommendationId: string) {
  const [recommendation, setRecommendation] = useState<Awaited<ReturnType<typeof fetchRecommendationById>>['recommendation'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executionPlan, setExecutionPlan] = useState<Awaited<ReturnType<typeof fetchLatestRecommendationExecutionPlan>>['executionPlan']>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planLookupLoading, setPlanLookupLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionLearningStatus, setDecisionLearningStatus] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionReasonCode, setDecisionReasonCode] = useState<RecommendationFeedbackReason | ''>('');
  const [decisionMode, setDecisionMode] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof fetchRecommendationTimeline>>['timeline']>([]);
  const [manualStatus, setManualStatus] = useState<'PLANNED' | 'EXECUTED' | 'PARTIAL' | 'CANCELLED'>('EXECUTED');
  const [manualSavings, setManualSavings] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [measurementReadiness, setMeasurementReadiness] = useState<Awaited<ReturnType<typeof fetchSavingsMeasurementReadiness>>['readiness'] | null>(null);
  const [measurements, setMeasurements] = useState<Awaited<ReturnType<typeof fetchSavingsMeasurements>>['measurements']>([]);
  const [measurementLoading, setMeasurementLoading] = useState(false);
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [measurementActionLoading, setMeasurementActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setRecommendation(null);
    setLoading(true);
    setError(null);
    setExecutionPlan(null);
    setPlanError(null);
    setDecisionError(null);
    setDecisionLearningStatus(null);
    setDecisionNote('');
    setDecisionReasonCode('');
    setDecisionMode(null);
    setMeasurementReadiness(null);
    setMeasurements([]);
    setMeasurementError(null);
    setPlanLookupLoading(true);

    fetchRecommendationById(token, recommendationId)
      .then((response) => {
        if (active) setRecommendation(response.recommendation);
        return fetchLatestRecommendationExecutionPlan(token, recommendationId);
      })
      .then((response) => {
        if (active) setExecutionPlan(response.executionPlan);
        return Promise.all([
          fetchRecommendationTimeline(token, recommendationId),
          fetchSavingsMeasurementReadiness(token, recommendationId),
          fetchSavingsMeasurements(token, recommendationId),
        ]);
      })
      .then(([timelineResponse, readinessResponse, measurementsResponse]) => {
        if (!active) return;
        setTimeline(timelineResponse.timeline);
        setMeasurementReadiness(readinessResponse.readiness);
        setMeasurements(measurementsResponse.measurements);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar el detalle');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setPlanLookupLoading(false);
      });
    return () => { active = false; };
  }, [recommendationId, token]);

  const handleReviewPlan = async (): Promise<void> => {
    if (recommendation === null) return;
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

  const openDecisionModal = (decision: 'APPROVED' | 'REJECTED'): void => {
    setDecisionMode(decision);
    setDecisionError(null);
    setDecisionLearningStatus(null);
    setDecisionNote('');
    setDecisionReasonCode(decision === 'APPROVED' ? defaultApprovalReason : defaultRejectionReason);
  };

  const handleDecision = async (): Promise<void> => {
    if (recommendation === null || executionPlan === null || decisionMode === null) return;
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
      setTimeline((await fetchRecommendationTimeline(token, recommendation.id)).timeline);
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

  const refreshSavingsMeasurements = async (): Promise<void> => {
    if (recommendation === null) return;
    const [readinessResponse, measurementsResponse, timelineResponse] = await Promise.all([
      fetchSavingsMeasurementReadiness(token, recommendation.id),
      fetchSavingsMeasurements(token, recommendation.id),
      fetchRecommendationTimeline(token, recommendation.id),
    ]);
    setMeasurementReadiness(readinessResponse.readiness);
    setMeasurements(measurementsResponse.measurements);
    setTimeline(timelineResponse.timeline);
  };

  const handleManualExecution = async (): Promise<void> => {
    if (recommendation === null || executionPlan === null) return;
    const parsedSavings = manualSavings.trim() === '' ? undefined : Number.parseFloat(manualSavings);
    if (parsedSavings !== undefined && (!Number.isFinite(parsedSavings) || parsedSavings < 0)) {
      setManualError('El ahorro reportado debe ser un numero mayor o igual a cero.');
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
        ...(parsedSavings !== undefined ? { reportedMonthlySavings: parsedSavings } : {}),
        currency: recommendation.currency,
        ...(manualNotes.trim() !== '' ? { notes: manualNotes.trim() } : {}),
      });
      if (response.recommendation !== null) setRecommendation(response.recommendation);
      if (response.execution.status === 'EXECUTED' || response.execution.status === 'PARTIAL') {
        setMeasurementLoading(true);
        try {
          await createSavingsMeasurement(token, recommendation.id, { manualExecutionId: response.execution.id, windowDays: 7 });
        } catch (requestError) {
          setMeasurementError(requestError instanceof Error ? requestError.message : 'No fue posible preparar la medicion');
        } finally {
          setMeasurementLoading(false);
        }
      }
      await refreshSavingsMeasurements();
      setManualMessage('Ejecucion registrada. El ahorro se calculara cuando exista una ventana posterior comparable.');
      setManualSavings('');
      setManualNotes('');
    } catch (requestError) {
      setManualError(requestError instanceof Error ? requestError.message : 'No fue posible registrar la ejecucion manual');
    } finally {
      setManualLoading(false);
    }
  };

  const handleVerifyMeasurement = async (): Promise<void> => {
    if (recommendation === null || measurements[0] === undefined) return;
    setMeasurementActionLoading(true);
    setMeasurementError(null);
    try {
      await verifySavingsMeasurement(token, recommendation.id, measurements[0].id);
      await refreshSavingsMeasurements();
    } catch (requestError) {
      setMeasurementError(requestError instanceof Error ? requestError.message : 'No fue posible verificar la medicion');
    } finally { setMeasurementActionLoading(false); }
  };

  const handleCalculateMeasurement = async (): Promise<void> => {
    if (recommendation === null) return;
    const manualExecutionId = measurements[0]?.manualExecutionId ?? measurementReadiness?.manualExecutionId;
    if (manualExecutionId === undefined) return;
    const readinessWindow = measurementReadiness?.windowDays;
    const windowDays: 7 | 14 | 30 = measurements[0]?.windowDays === 14 || measurements[0]?.windowDays === 30
      ? measurements[0].windowDays : readinessWindow === 14 ? 14 : readinessWindow === 30 ? 30 : 7;
    setMeasurementActionLoading(true);
    setMeasurementError(null);
    try {
      await createSavingsMeasurement(token, recommendation.id, { manualExecutionId, windowDays });
      await refreshSavingsMeasurements();
    } catch (requestError) {
      setMeasurementError(requestError instanceof Error ? requestError.message : 'No fue posible calcular la medicion');
    } finally { setMeasurementActionLoading(false); }
  };

  const handleRejectMeasurement = async (): Promise<void> => {
    if (recommendation === null || measurements[0] === undefined) return;
    const reason = window.prompt('Indica por que se rechaza la medicion:', 'La evidencia no es suficiente para confirmar el ahorro.');
    if (reason === null || reason.trim() === '') return;
    setMeasurementActionLoading(true);
    setMeasurementError(null);
    try {
      await rejectSavingsMeasurement(token, recommendation.id, measurements[0].id, reason.trim());
      await refreshSavingsMeasurements();
    } catch (requestError) {
      setMeasurementError(requestError instanceof Error ? requestError.message : 'No fue posible rechazar la medicion');
    } finally { setMeasurementActionLoading(false); }
  };

  return {
    recommendation, loading, error, executionPlan, planLoading, planLookupLoading, planError,
    decisionLoading, decisionError, decisionLearningStatus, decisionNote, decisionReasonCode, decisionMode,
    timeline, manualStatus, manualSavings, manualNotes, manualLoading, manualMessage, manualError,
    measurementReadiness, measurements, measurementLoading, measurementError, measurementActionLoading,
    setDecisionNote, setDecisionReasonCode, setDecisionMode, setDecisionError,
    setManualStatus, setManualSavings, setManualNotes,
    handleReviewPlan, openDecisionModal, handleDecision, handleManualExecution,
    handleVerifyMeasurement, handleCalculateMeasurement, handleRejectMeasurement,
  };
}
