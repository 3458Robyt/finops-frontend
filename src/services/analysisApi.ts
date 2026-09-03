import { apiRequest } from './apiClient';
import type { RecommendationAnalysisRun, RecommendationAnalysisPreview } from './apiTypes';

export async function fetchRecommendationAnalysisPreview(
  token: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<{ readonly success: true; readonly preview: RecommendationAnalysisPreview }> {
  return apiRequest('/ai/analysis-runs/readiness', {
    token,
    // La vista previa consulta agregados y métricas técnicas; no debe heredar
    // el timeout corto de las lecturas simples. Sigue siendo opcional para que
    // no bloquee el botón de encolar el análisis.
    timeoutMs: 60_000,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function queueRecommendationAnalysis(
  token: string,
): Promise<{ readonly success: true; readonly reused: boolean; readonly run: RecommendationAnalysisRun }> {
  return apiRequest('/ai/analysis-runs', {
    method: 'POST',
    token,
    // La cola solo inserta/recupera una corrida; si tarda más, informar pronto
    // en lugar de dejar la interfaz en un estado ambiguo.
    timeoutMs: 10_000,
    body: JSON.stringify({}),
  });
}

export async function fetchRecommendationAnalysisRuns(
  token: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<{ readonly success: true; readonly runs: readonly RecommendationAnalysisRun[] }> {
  return apiRequest('/ai/analysis-runs', {
    token,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function fetchRecommendationAnalysisRun(
  token: string,
  runId: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<{ readonly success: true; readonly run: RecommendationAnalysisRun }> {
  return apiRequest(`/ai/analysis-runs/${encodeURIComponent(runId)}`, {
    token,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function cancelRecommendationAnalysis(
  token: string,
  runId: string,
): Promise<{ readonly success: true; readonly run: RecommendationAnalysisRun }> {
  return apiRequest(`/ai/analysis-runs/${encodeURIComponent(runId)}/cancel`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  });
}

export async function retryRecommendationAnalysis(
  token: string,
  runId: string,
): Promise<{ readonly success: true; readonly run: RecommendationAnalysisRun }> {
  return apiRequest(`/ai/analysis-runs/${encodeURIComponent(runId)}/retry`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  });
}
