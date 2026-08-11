import { apiRequest } from './apiClient';
import type { RecommendationFeedbackReason, RecommendationDetailResponse, ExecutionPlanResponse, LatestExecutionPlanResponse, RecommendationDecisionResponse, ManualExecutionStatus, ManualExecutionResponse, RecommendationTimelineResponse, SavingsMeasurementReadinessResponse, SavingsMeasurementResponse, SavingsMeasurementsResponse } from './apiTypes';

export async function fetchRecommendationById(
  token: string,
  recommendationId: string,
): Promise<RecommendationDetailResponse> {
  return apiRequest<RecommendationDetailResponse>(`/recommendations/${encodeURIComponent(recommendationId)}`, {
    token,
  });
}

export async function generateRecommendationExecutionPlan(
  token: string,
  recommendationId: string,
): Promise<ExecutionPlanResponse> {
  return apiRequest<ExecutionPlanResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/execution-plan`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    },
  );
}

export async function fetchLatestRecommendationExecutionPlan(
  token: string,
  recommendationId: string,
): Promise<LatestExecutionPlanResponse> {
  return apiRequest<LatestExecutionPlanResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/execution-plans/latest`,
    {
      token,
    },
  );
}

export async function submitRecommendationDecision(
  token: string,
  recommendationId: string,
  input: {
    readonly executionPlanId: string;
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly reasonCode: RecommendationFeedbackReason;
    readonly reason?: string;
  },
): Promise<RecommendationDecisionResponse> {
  return apiRequest<RecommendationDecisionResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/decisions`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function submitManualExecution(
  token: string,
  recommendationId: string,
  input: {
    readonly executionPlanId?: string;
    readonly status: ManualExecutionStatus;
    readonly executedAt?: string;
    readonly reportedMonthlySavings?: number;
    readonly observedMonthlySavings?: number;
    readonly currency?: string;
    readonly notes?: string;
  },
): Promise<ManualExecutionResponse> {
  return apiRequest<ManualExecutionResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/manual-execution`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function fetchSavingsMeasurementReadiness(
  token: string,
  recommendationId: string,
): Promise<SavingsMeasurementReadinessResponse> {
  return apiRequest<SavingsMeasurementReadinessResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/savings-measurements/readiness`,
    { token },
  );
}

export async function createSavingsMeasurement(
  token: string,
  recommendationId: string,
  input: { readonly manualExecutionId: string; readonly windowDays?: 7 | 14 | 30 },
): Promise<SavingsMeasurementResponse> {
  return apiRequest<SavingsMeasurementResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/savings-measurements`,
    { method: 'POST', token, body: JSON.stringify(input) },
  );
}

export async function fetchSavingsMeasurements(
  token: string,
  recommendationId: string,
): Promise<SavingsMeasurementsResponse> {
  return apiRequest<SavingsMeasurementsResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/savings-measurements`,
    { token },
  );
}

export async function verifySavingsMeasurement(
  token: string,
  recommendationId: string,
  measurementId: string,
  note?: string,
): Promise<SavingsMeasurementResponse> {
  return apiRequest<SavingsMeasurementResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/savings-measurements/${encodeURIComponent(measurementId)}/verify`,
    { method: 'POST', token, body: JSON.stringify(note === undefined ? {} : { note }) },
  );
}

export async function rejectSavingsMeasurement(
  token: string,
  recommendationId: string,
  measurementId: string,
  reason: string,
): Promise<SavingsMeasurementResponse> {
  return apiRequest<SavingsMeasurementResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/savings-measurements/${encodeURIComponent(measurementId)}/reject`,
    { method: 'POST', token, body: JSON.stringify({ reason }) },
  );
}

export async function fetchRecommendationTimeline(
  token: string,
  recommendationId: string,
): Promise<RecommendationTimelineResponse> {
  return apiRequest<RecommendationTimelineResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/timeline`,
    { token },
  );
}
