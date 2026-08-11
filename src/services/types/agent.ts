// Agent context and instruction DTOs.
import type { Recommendation } from './recommendations';
export interface AiChatMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}
export interface AiContextSummary {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalCost: number;
  readonly currency: string;
  readonly metricCount: number;
}
export interface AiChatResponse {
  readonly success: true;
  readonly answer: string;
  readonly context: AiContextSummary;
}
export interface AiRecommendationGenerationResponse {
  readonly success: true;
  readonly persisted: boolean;
  readonly recommendations: readonly Recommendation[];
  readonly context: AiContextSummary;
}
export interface AgentInstructionRules {
  readonly objective: string;
  readonly tone: string;
  readonly recommendationPriorities: readonly string[];
  readonly evidenceRequirements: readonly string[];
  readonly riskPolicy: string;
  readonly forbiddenActions: readonly string[];
}
export interface AgentInstructionProfile {
  readonly id: string;
  readonly version: number;
  readonly status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED';
  readonly structuredRules: AgentInstructionRules;
  readonly freeformNotes?: string;
  readonly validationReport?: {
    readonly passed: boolean;
    readonly issues: readonly string[];
    readonly warnings: readonly string[];
  };
  readonly activatedAt?: string;
}
export interface TenantAgentRule {
  readonly id: string;
  readonly tenantId: string;
  readonly category: string;
  readonly ruleText: string;
  readonly priority: number;
  readonly status: 'ACTIVE' | 'DISABLED';
}
export interface AiContextTrace {
  readonly id: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly operation: 'CHAT' | 'RECOMMENDATION' | 'EXECUTION_PLAN' | 'AUDIT' | 'LEARNING';
  readonly model: string;
  readonly status: string;
  readonly profileVersion?: number;
  readonly promptTokenEstimate: number;
  readonly responseTokenEstimate?: number;
  readonly latencyMs?: number;
  readonly createdAt: string;
  readonly expiresAt: string;
}
export interface AgentProfileResponse {
  readonly success: true;
  readonly profile: AgentInstructionProfile;
}
export interface TenantRulesResponse {
  readonly success: true;
  readonly rules: readonly TenantAgentRule[];
}
export interface TenantRuleResponse {
  readonly success: true;
  readonly rule: TenantAgentRule;
}
export interface AiContextTracesResponse {
  readonly success: true;
  readonly traces: readonly AiContextTrace[];
}
export interface ContextBackfillResponse {
  readonly success: true;
  readonly summaries: {
    readonly runId: string;
    readonly summaryCount: number;
  };
}
