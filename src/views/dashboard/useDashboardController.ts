import { useEffect, useMemo, useState } from 'react';
import { useAccessToken } from '../../auth/authSession';
import { shareInFlightRequest } from '../../services/shareInFlightRequest';
import {
  fetchAdoptionKpis,
  fetchAnalyticsEfficiencyInsights,
  fetchAnalyticsForecastScenarios,
  fetchAnalyticsOpportunities,
  fetchAnalyticsUnitEconomics,
  fetchBudgetPerformance,
  fetchBudgets,
  fetchCostHistory,
  fetchRecommendations,
  fetchSavingsKpis,
  type AdoptionKpisResponse,
  type Budget,
  type BudgetPerformance,
  type CostHistoryResponse,
  type Recommendation,
  type SavingsKpisResponse,
  type UsageInsight,
  type MonthlyUsagePoint,
  type CostOpportunity,
  type CostForecastScenario,
} from '../../services/api';
import {
  buildChartData,
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
  readonly recommendations: readonly Recommendation[];
  readonly opportunities: readonly CostOpportunity[];
  readonly usageInsights: readonly UsageInsight[];
  readonly unitEconomics: readonly MonthlyUsagePoint[];
  readonly savingsKpis: SavingsKpisResponse['savings'] | null;
  readonly adoptionKpis: AdoptionKpisResponse['adoption'] | null;
  readonly budgets: readonly Budget[];
  readonly budgetPerformance: BudgetPerformance | null;
  readonly chartData: readonly ChartPoint[];
  readonly costHistory: CostHistoryResponse | null;
  readonly reportingCurrency: string;
  readonly suggestions: readonly Suggestion[];
  readonly totalCost: number;
  readonly dashboardBudget: Budget | undefined;
  readonly budgetUsage: number;
  readonly identifiedWaste: number;
  readonly verifiedSavings: number;
  readonly roi: number;
  readonly openOpportunities: number;
  readonly staleOpportunities: number;
  readonly acceptanceRate: number;
  readonly topUnitEconomics: readonly MonthlyUsagePoint[];
  readonly missedSavingsAmount: number;
  readonly forecastScenarios: readonly CostForecastScenario[];
}

export function useDashboardController(): DashboardControllerState {
  const token = useAccessToken();
  const [costHistory, setCostHistory] = useState<CostHistoryResponse | null>(null);
  const reportingCurrency = costHistory?.reportingCurrency ?? '';
  const [recommendations, setRecommendations] = useState<readonly Recommendation[]>([]);
  const [opportunities, setOpportunities] = useState<readonly CostOpportunity[]>([]);
  const [usageInsights, setUsageInsights] = useState<readonly UsageInsight[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<readonly MonthlyUsagePoint[]>([]);
  const [forecastScenarios, setForecastScenarios] = useState<readonly CostForecastScenario[]>([]);
  const [savingsKpis, setSavingsKpis] = useState<SavingsKpisResponse['savings'] | null>(null);
  const [adoptionKpis, setAdoptionKpis] = useState<AdoptionKpisResponse['adoption'] | null>(null);
  const [budgets, setBudgets] = useState<readonly Budget[]>([]);
  const [budgetPerformance, setBudgetPerformance] = useState<BudgetPerformance | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshVersion((version) => version + 1);
    window.addEventListener('finops:recommendations-updated', refresh);
    return () => window.removeEventListener('finops:recommendations-updated', refresh);
  }, []);

  useEffect(() => {
    let active = true;

    void shareInFlightRequest(`overview:${token}:${refreshVersion}`, () => Promise.allSettled([
        fetchRecommendations(token),
        fetchAnalyticsOpportunities(token),
        fetchAnalyticsForecastScenarios(token),
        fetchAnalyticsEfficiencyInsights(token),
        fetchAnalyticsUnitEconomics(token),
        fetchSavingsKpis(token),
        fetchAdoptionKpis(token),
        fetchBudgets(token, { period: currentMonth() }),
      ])).then(async (results) => {
      if (!active) return;

      const value = <T,>(index: number): T | undefined => (
        results[index]?.status === 'fulfilled' ? results[index].value as T : undefined
      );
      const recommendationResponse = value<{ recommendations: readonly Recommendation[] }>(0);
      const opportunityResponse = value<{ opportunities: readonly CostOpportunity[] }>(1);
      const scenarioResponse = value<{ scenarios: readonly CostForecastScenario[] }>(2);
      const insightsResponse = value<{ insights: readonly UsageInsight[] }>(3);
      const unitEconomicsResponse = value<{ unitEconomics: readonly MonthlyUsagePoint[] }>(4);
      const savingsResponse = value<SavingsKpisResponse>(5);
      const adoptionResponse = value<AdoptionKpisResponse>(6);
      const budgetResponse = value<{ budgets: readonly Budget[] }>(7);

      if (recommendationResponse !== undefined) setRecommendations(recommendationResponse.recommendations);
      if (opportunityResponse !== undefined) setOpportunities(opportunityResponse.opportunities);
      if (scenarioResponse !== undefined) setForecastScenarios(scenarioResponse.scenarios);
      if (insightsResponse !== undefined) setUsageInsights(insightsResponse.insights);
      if (unitEconomicsResponse !== undefined) setUnitEconomics(unitEconomicsResponse.unitEconomics);
      if (savingsResponse !== undefined) setSavingsKpis(savingsResponse.savings);
      if (adoptionResponse !== undefined) setAdoptionKpis(adoptionResponse.adoption);

      if (budgetResponse === undefined) {
        setBudgetError('El presupuesto no pudo actualizarse.');
      } else {
        setBudgetError(null);
        setBudgetPerformance(null);
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
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [refreshVersion, token]);

  useEffect(() => {
    let active = true;
    void shareInFlightRequest(`cost-history:${token}`, () => fetchCostHistory(token, {
      rangeMode: 'LATEST_AVAILABLE',
      lookbackDays: 90,
      granularity: 'day',
    })).then((response) => {
      if (!active) return;
      setCostHistory(response);
    }).catch(() => {
      if (active) {
        setError('El histórico de costos no pudo actualizarse. Los demás datos siguen disponibles.');
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  const totalCost = useMemo(
    () => roundCurrency(costHistory?.points.reduce((total, point) => total + (point.amount ?? 0), 0) ?? 0),
    [costHistory],
  );
  const dashboardBudget = budgets.find((budget) => budget.scope === 'TENANT');
  const budgetUsage = budgetPerformance?.consumedPercent ?? 0;
  const identifiedWaste = savingsKpis?.estimatedMonthlySavings ?? 0;
  const verifiedSavings = savingsKpis?.verifiedMonthlySavings ?? savingsKpis?.confirmedMonthlySavings ?? 0;
  const roi = totalCost > 0 && savingsKpis !== null && reportingCurrency !== '' && savingsKpis.currency === reportingCurrency
    ? roundCurrency((verifiedSavings / totalCost) * 100)
    : 0;

  return {
    loading,
    error,
    budgetError,
    recommendations,
    opportunities,
    usageInsights,
    unitEconomics,
    savingsKpis,
    adoptionKpis,
    budgets,
    budgetPerformance,
    chartData: useMemo(() => buildChartData(costHistory), [costHistory]),
    suggestions: useMemo(() => buildSuggestions(recommendations), [recommendations]),
    totalCost,
    dashboardBudget,
    budgetUsage,
    identifiedWaste,
    verifiedSavings,
    roi,
    openOpportunities: opportunities.filter((opportunity) => opportunity.status === 'OPEN' && opportunity.isStale !== true).length,
    staleOpportunities: opportunities.filter((opportunity) => opportunity.isStale === true).length,
    acceptanceRate: adoptionKpis !== null ? adoptionKpis.acceptanceRate * 100 : 0,
    topUnitEconomics: unitEconomics.slice(0, 3),
    missedSavingsAmount: savingsKpis?.missedSavingsAmount ?? 0,
    forecastScenarios,
    costHistory,
    reportingCurrency,
  };
}
