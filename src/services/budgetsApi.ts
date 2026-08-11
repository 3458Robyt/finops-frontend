import { apiRequest } from './apiClient';
import type { BudgetScope, BudgetHealth, Budget, BudgetPerformance, BudgetsResponse } from './apiTypes';

export async function fetchBudgets(token: string, filters: { readonly period?: string; readonly cloudAccountId?: string; readonly serviceName?: string } = {}): Promise<BudgetsResponse> {
  const params = new URLSearchParams();
  if (filters.period !== undefined) params.set('period', filters.period);
  if (filters.cloudAccountId !== undefined) params.set('cloudAccountId', filters.cloudAccountId);
  if (filters.serviceName !== undefined) params.set('serviceName', filters.serviceName);
  const query = params.size === 0 ? '' : `?${params.toString()}`;
  return apiRequest<BudgetsResponse>(`/budgets${query}`, { token });
}

export async function fetchBudgetPerformance(token: string, budgetId: string): Promise<{ readonly success: true; readonly performance: BudgetPerformance }> {
  return apiRequest(`/budgets/${encodeURIComponent(budgetId)}/performance`, { token });
}

export async function createBudget(token: string, input: { readonly scope: BudgetScope; readonly scopeKey?: string; readonly cloudAccountId?: string; readonly serviceName?: string; readonly period: string; readonly amount: number; readonly currency: string; readonly warningThreshold?: number; readonly criticalThreshold?: number; readonly exceededThreshold?: number }): Promise<{ readonly success: true; readonly budget: Budget }> {
  return apiRequest('/budgets', { method: 'POST', token, body: JSON.stringify(input) });
}

export async function archiveBudget(token: string, budgetId: string): Promise<{ readonly success: true; readonly budget: Budget }> {
  return apiRequest(`/budgets/${encodeURIComponent(budgetId)}/archive`, { method: 'POST', token });
}

export async function updateBudget(token: string, budgetId: string, input: { readonly amount?: number; readonly warningThreshold?: number; readonly criticalThreshold?: number; readonly exceededThreshold?: number }): Promise<{ readonly success: true; readonly budget: Budget }> {
  return apiRequest(`/budgets/${encodeURIComponent(budgetId)}`, { method: 'PATCH', token, body: JSON.stringify(input) });
}

export async function fetchBudgetAlerts(token: string, budgetId: string): Promise<{ readonly success: true; readonly alerts: readonly { readonly id: string; readonly level: BudgetHealth; readonly actualCost: number; readonly forecastCost?: number; readonly createdAt: string }[] }> {
  return apiRequest(`/budgets/${encodeURIComponent(budgetId)}/alerts`, { token });
}

export async function evaluateBudgets(token: string, budgetId?: string): Promise<{ readonly success: true; readonly result: { readonly evaluated: number } }> {
  return apiRequest('/budgets/evaluate', { method: 'POST', token, body: JSON.stringify(budgetId === undefined ? {} : { budgetId }) });
}
