import { useEffect, useMemo, useState } from 'react';
import {
  fetchAdoptionKpis,
  fetchAnalyticsEfficiencyInsights,
  fetchAnalyticsForecast,
  fetchAnalyticsOpportunities,
  fetchAnalyticsUnitEconomics,
  fetchBudgetPerformance,
  fetchBudgets,
  fetchCosts,
  fetchRecommendations,
  fetchSavingsKpis,
  recomputeAnalytics,
  type AdoptionKpisResponse,
  type Budget,
  type BudgetPerformance,
  type CostsResponse,
  type Recommendation,
  type SavingsKpisResponse,
  type UsageInsight,
  type MonthlyUsagePoint,
  type CostOpportunity,
} from '../../services/api';
import {
  buildChartData,
  buildDashboardCostRange,
  buildSuggestions,
  roundCurrency,
  type ChartPoint,
  type Suggestion,
} from './dashboardPresentation';

function currentMonth(): string {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface DashboardControllerState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly budgetError: string | null;
  readonly costs: CostsResponse | null;
  readonly recommendations: readonly Recommendation[];
  readonly opportunities: readonly CostOpportunity[];
  readonly usageInsights: readonly UsageInsight[];
  readonly unitEconomics: readonly MonthlyUsagePoint[];
  readonly savingsKpis: SavingsKpisResponse['savings'] | null;
  readonly adoptionKpis: AdoptionKpisResponse['adoption'] | null;
  readonly budgets: readonly Budget[];
  readonly budgetPerformance: BudgetPerformance | null;
  readonly chartData: readonly ChartPoint[];
  readonly suggestions: readonly Suggestion[];
  readonly totalCost: number;
  readonly dashboardBudget: Budget | undefined;
  readonly budgetUsage: number;
  readonly identifiedWaste: number;
  readonly verifiedSavings: number;
  readonly roi: number;
  readonly openOpportunities: number;
  readonly acceptanceRate: number;
  readonly topUnitEconomics: readonly MonthlyUsagePoint[];
  readonly missedSavingsAmount: number;
}

export function useDashboardController(token: string): DashboardControllerState {
  const [costs, setCosts] = useState<CostsResponse | null>(null);
  const [recommendations, setRecommendations] = useState<readonly Recommendation[]>([]);
  const [opportunities, setOpportunities] = useState<readonly CostOpportunity[]>([]);
  const [usageInsights, setUsageInsights] = useState<readonly UsageInsight[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<readonly MonthlyUsagePoint[]>([]);
  const [savingsKpis, setSavingsKpis] = useState<SavingsKpisResponse['savings'] | null>(null);
  const [adoptionKpis, setAdoptionKpis] = useState<AdoptionKpisResponse['adoption'] | null>(null);
  const [budgets, setBudgets] = useState<readonly Budget[]>([]);
  const [budgetPerformance, setBudgetPerformance] = useState<BudgetPerformance | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const results = await Promise.allSettled([
        fetchCosts(token, buildDashboardCostRange()),
        fetchRecommendations(token),
        fetchAnalyticsOpportunities(token),
        fetchAnalyticsForecast(token),
        fetchAnalyticsEfficiencyInsights(token),
        fetchAnalyticsUnitEconomics(token),
        fetchSavingsKpis(token),
        fetchAdoptionKpis(token),
        fetchBudgets(token, { period: currentMonth() }),
      ]);
      if (!active) return;

      const value = <T,>(index: number): T | undefined => (
        results[index]?.status === 'fulfilled' ? results[index].value as T : undefined
      );
      const costResponse = value<CostsResponse>(0);
      const recommendationResponse = value<{ recommendations: readonly Recommendation[] }>(1);
      const opportunityResponse = value<{ opportunities: readonly CostOpportunity[] }>(2);
      const forecastResponse = value<{ forecasts: readonly unknown[] }>(3);
      const insightsResponse = value<{ insights: readonly UsageInsight[] }>(4);
      const unitEconomicsResponse = value<{ unitEconomics: readonly MonthlyUsagePoint[] }>(5);
      const savingsResponse = value<SavingsKpisResponse>(6);
      const adoptionResponse = value<AdoptionKpisResponse>(7);
      const budgetResponse = value<{ budgets: readonly Budget[] }>(8);

      if (costResponse !== undefined) setCosts(costResponse);
      if (recommendationResponse !== undefined) setRecommendations(recommendationResponse.recommendations);
      if (opportunityResponse !== undefined) setOpportunities(opportunityResponse.opportunities);
      if (insightsResponse !== undefined) setUsageInsights(insightsResponse.insights);
      if (unitEconomicsResponse !== undefined) setUnitEconomics(unitEconomicsResponse.unitEconomics);
      if (savingsResponse !== undefined) setSavingsKpis(savingsResponse.savings);
      if (adoptionResponse !== undefined) setAdoptionKpis(adoptionResponse.adoption);

      if (budgetResponse === undefined) {
        setBudgetError('El presupuesto no pudo actualizarse.');
      } else {
        setBudgets(budgetResponse.budgets);
        const tenantBudget = budgetResponse.budgets.find((budget) => budget.scope === 'TENANT');
        if (tenantBudget !== undefined) {
          try {
            const performance = await fetchBudgetPerformance(token, tenantBudget.id);
            if (active) setBudgetPerformance(performance.performance);
          } catch {
            if (active) {
              setBudgetPerformance(null);
              setBudgetError('El presupuesto no pudo actualizarse.');
            }
          }
        }
      }

      const failures = results.filter((result) => result.status === 'rejected');
      setError(failures.length === 0 ? null : `${failures.length} bloque(s) no pudieron actualizarse. Los demás datos siguen disponibles.`);
      if (opportunityResponse !== undefined && forecastResponse !== undefined
        && opportunityResponse.opportunities.length === 0 && forecastResponse.forecasts.length === 0) {
        try {
          const analyticsResponse = await recomputeAnalytics(token);
          if (active) {
            setOpportunities(analyticsResponse.anomalies);
            setUsageInsights(analyticsResponse.usageInsights);
          }
        } catch {
          // Existing persisted data stays visible.
        }
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [token]);

  const metrics = useMemo(() => costs?.metrics ?? [], [costs]);
  const totalCost = useMemo(
    () => roundCurrency(metrics.reduce((total, metric) => total + metric.amount, 0)),
    [metrics],
  );
  const dashboardBudget = budgets.find((budget) => budget.scope === 'TENANT');
  const budgetUsage = budgetPerformance?.consumedPercent ?? 0;
  const identifiedWaste = savingsKpis?.estimatedMonthlySavings ?? roundCurrency(totalCost * 0.14);
  const verifiedSavings = savingsKpis?.verifiedMonthlySavings ?? savingsKpis?.confirmedMonthlySavings ?? 0;
  const roi = totalCost > 0 ? roundCurrency((verifiedSavings / totalCost) * 100) : 0;

  return {
    loading,
    error,
    budgetError,
    costs,
    recommendations,
    opportunities,
    usageInsights,
    unitEconomics,
    savingsKpis,
    adoptionKpis,
    budgets,
    budgetPerformance,
    chartData: useMemo(() => buildChartData(metrics), [metrics]),
    suggestions: useMemo(() => buildSuggestions(metrics, recommendations), [metrics, recommendations]),
    totalCost,
    dashboardBudget,
    budgetUsage,
    identifiedWaste,
    verifiedSavings,
    roi,
    openOpportunities: opportunities.filter((opportunity) => opportunity.status === 'OPEN').length,
    acceptanceRate: adoptionKpis !== null ? adoptionKpis.acceptanceRate * 100 : 0,
    topUnitEconomics: unitEconomics.slice(0, 3),
    missedSavingsAmount: savingsKpis?.missedSavingsAmount ?? 0,
  };
}
