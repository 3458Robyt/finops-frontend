import { apiRequest } from './apiClient';
import type { AiChatMessage, AiChatResponse, AiRecommendationGenerationResponse, AgentInstructionRules, AgentLearningSummaryResponse, AgentProfileResponse, TenantRulesResponse, TenantRuleResponse, AiContextTracesResponse, ContextBackfillResponse, AgentQualityReportResponse } from './apiTypes';

export async function sendAiChatMessage(
  token: string,
  input: {
    readonly message: string;
    readonly history?: readonly AiChatMessage[];
  },
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function generateAiRecommendations(
  token: string,
  persist = false,
  externalResourceId?: string,
  cloudResourceId?: string,
): Promise<AiRecommendationGenerationResponse> {
  return apiRequest<AiRecommendationGenerationResponse>('/ai/recommendations/generate', {
    method: 'POST',
    token,
    body: JSON.stringify({
      persist,
      ...(externalResourceId !== undefined ? { externalResourceId } : {}),
      ...(cloudResourceId !== undefined ? { cloudResourceId } : {}),
    }),
  });
}

export async function fetchAiLearningSummary(token: string): Promise<AgentLearningSummaryResponse> {
  return apiRequest<AgentLearningSummaryResponse>('/ai/learning/summary', { token });
}

export async function deactivateAiLearningMemory(token: string, memoryId: string): Promise<AgentLearningSummaryResponse['learning']['memories'][number]> {
  const response = await apiRequest<{
    readonly success: true;
    readonly memory: AgentLearningSummaryResponse['learning']['memories'][number];
  }>(`/ai/learning/memories/${encodeURIComponent(memoryId)}/deactivate`, {
    method: 'PATCH',
    token,
  });
  return response.memory;
}

export async function fetchAgentProfile(token: string): Promise<AgentProfileResponse> {
  return apiRequest<AgentProfileResponse>('/agent/profile', { token });
}

export async function activateAgentProfile(
  token: string,
  input: {
    readonly structuredRules: AgentInstructionRules;
    readonly freeformNotes?: string;
  },
): Promise<AgentProfileResponse> {
  return apiRequest<AgentProfileResponse>('/agent/profile/activate', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function fetchTenantAgentRules(token: string): Promise<TenantRulesResponse> {
  return apiRequest<TenantRulesResponse>('/agent/tenant-rules', { token });
}

export async function createTenantAgentRule(
  token: string,
  input: {
    readonly category: string;
    readonly ruleText: string;
    readonly priority?: number;
  },
): Promise<TenantRuleResponse> {
  return apiRequest<TenantRuleResponse>('/agent/tenant-rules', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function disableTenantAgentRule(token: string, ruleId: string): Promise<TenantRuleResponse> {
  return apiRequest<TenantRuleResponse>(`/agent/tenant-rules/${encodeURIComponent(ruleId)}/disable`, {
    method: 'PATCH',
    token,
  });
}

export async function fetchAiContextTraces(token: string): Promise<AiContextTracesResponse> {
  return apiRequest<AiContextTracesResponse>('/agent/context-traces', { token });
}

export async function fetchAiQualityReport(token: string, days = 90): Promise<AgentQualityReportResponse> {
  return apiRequest<AgentQualityReportResponse>(`/agent/quality?days=${days}`, { token });
}

export async function backfillAgentContext(token: string): Promise<ContextBackfillResponse> {
  return apiRequest<ContextBackfillResponse>('/agent/context/backfill', {
    method: 'POST',
    token,
  });
}
