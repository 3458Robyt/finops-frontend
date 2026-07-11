import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  fetchAdoptionKpis,
  fetchAnalyticsEfficiencyInsights,
  fetchAnalyticsForecast,
  fetchAnalyticsOpportunities,
  fetchAnalyticsUnitEconomics,
  fetchCosts,
  fetchRecommendations,
  fetchSavingsKpis,
  recomputeAnalytics,
  type AdoptionKpisResponse,
  type CostMetric,
  type CostOpportunity,
  type CostsResponse,
  type Recommendation,
  type SavingsKpisResponse,
  type UsageInsight,
  type MonthlyUsagePoint,
} from '../services/api';

interface DashboardProps {
  readonly token: string;
}

interface ChartPoint {
  readonly name: string;
  readonly asIs: number;
  readonly toBe: number;
}

interface Suggestion {
  readonly id: string;
  readonly service: string;
  readonly title: string;
  readonly description: string;
  readonly saving: number;
  readonly source: 'AI' | 'FOCUS';
  readonly usageLabel?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});
const dashboardCostWindowDays = 900;

export default function Dashboard({ token }: DashboardProps) {
  const [costs, setCosts] = useState<CostsResponse | null>(null);
  const [recommendations, setRecommendations] = useState<readonly Recommendation[]>([]);
  const [opportunities, setOpportunities] = useState<readonly CostOpportunity[]>([]);
  const [usageInsights, setUsageInsights] = useState<readonly UsageInsight[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<readonly MonthlyUsagePoint[]>([]);
  const [savingsKpis, setSavingsKpis] = useState<SavingsKpisResponse['savings'] | null>(null);
  const [adoptionKpis, setAdoptionKpis] = useState<AdoptionKpisResponse['adoption'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchCosts(token, buildDashboardCostRange()),
      fetchRecommendations(token),
      fetchAnalyticsOpportunities(token),
      fetchAnalyticsForecast(token),
      fetchAnalyticsEfficiencyInsights(token),
      fetchAnalyticsUnitEconomics(token),
      fetchSavingsKpis(token),
      fetchAdoptionKpis(token),
    ])
      .then(([costResponse, recommendationResponse, opportunityResponse, forecastResponse, insightsResponse, unitEconomicsResponse, savingsResponse, adoptionResponse]) => {
        if (active) {
          setCosts(costResponse);
          setRecommendations(recommendationResponse.recommendations);
          setOpportunities(opportunityResponse.opportunities);
          setUsageInsights(insightsResponse.insights);
          setUnitEconomics(unitEconomicsResponse.unitEconomics);
          setSavingsKpis(savingsResponse.savings);
          setAdoptionKpis(adoptionResponse.adoption);
        }

        if (opportunityResponse.opportunities.length === 0 && forecastResponse.forecasts.length === 0) {
          return recomputeAnalytics(token);
        }

        return null;
      })
      .then((analyticsResponse) => {
        if (active && analyticsResponse !== null) {
          setOpportunities(analyticsResponse.anomalies);
          setUsageInsights(analyticsResponse.usageInsights);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar costos');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const metrics = useMemo(
    () => costs?.metrics ?? [],
    [costs],
  );
  const totalCost = useMemo(
    () => roundCurrency(metrics.reduce((total, metric) => total + metric.amount, 0)),
    [metrics],
  );
  const chartData = useMemo(() => buildChartData(metrics), [metrics]);
  const suggestions = useMemo(
    () => buildSuggestions(metrics, recommendations),
    [metrics, recommendations],
  );
  const budget = Math.max(totalCost * 1.18, 100);
  const budgetUsage = budget > 0 ? Math.min((totalCost / budget) * 100, 100) : 0;
  const identifiedWaste = savingsKpis?.estimatedMonthlySavings ?? roundCurrency(totalCost * 0.14);
  const observedSavings = savingsKpis?.observedMonthlySavings ?? 0;
  const roi = totalCost > 0 ? roundCurrency((observedSavings / totalCost) * 100) : 0;
  const openOpportunities = opportunities.filter((opportunity) => opportunity.status === 'OPEN').length;
  const acceptanceRate = adoptionKpis !== null ? adoptionKpis.acceptanceRate * 100 : 0;
  const topUnitEconomics = unitEconomics.slice(0, 3);
  const missedSavingsAmount = savingsKpis?.missedSavingsAmount ?? 0;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      {error !== null && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-white">account_balance_wallet</span>
          </div>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Gasto vs Forecast</p>
          <div className="flex items-end gap-2 mb-4">
            <h3 className="text-3xl font-black text-white">
              {loading ? '...' : currencyFormatter.format(totalCost)}
            </h3>
            <span className="text-zinc-500 text-sm font-medium mb-1">/ {currencyFormatter.format(budget)}</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)] ${budgetUsage > 85 ? 'bg-red-500' : 'bg-tak-yellow'}`}
              style={{ width: `${budgetUsage}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            <p className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-green-500 font-bold">verified</span>
              Datos FOCUS + analitica persistida
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center gap-5 lg:gap-6">
          <div className="size-12 lg:size-14 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
            <span className="material-symbols-outlined text-red-500 text-2xl lg:text-3xl">delete_sweep</span>
          </div>
          <div>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Oportunidades abiertas</h3>
            <p className="text-2xl lg:text-3xl font-bold text-white">
              {loading ? '...' : openOpportunities}
            </p>
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded uppercase mt-2 inline-block border border-red-500/20">
              {currencyFormatter.format(identifiedWaste)} ahorro estimado
            </span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center gap-5 lg:gap-6 md:col-span-2 lg:col-span-1">
          <div className="size-12 lg:size-14 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
            <span className="material-symbols-outlined text-green-500 text-2xl lg:text-3xl">account_balance_wallet</span>
          </div>
          <div>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Adopcion / Ahorro real</h3>
            <p className="text-2xl lg:text-3xl font-bold text-white">{loading ? '...' : `${roi.toFixed(1)}%`}</p>
            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase mt-2 inline-block border border-green-500/20">
              {acceptanceRate.toFixed(0)}% aceptacion
            </span>
          </div>
        </div>
      </div>

      {missedSavingsAmount > 0 && (
        <div className="bg-tak-yellow/10 border border-tak-yellow/20 rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-11 rounded-xl bg-tak-yellow/10 border border-tak-yellow/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tak-yellow">savings</span>
            </div>
            <div>
              <p className="text-sm lg:text-base font-black text-white">
                ¿Sabías que podrías haberte ahorrado {currencyFormatter.format(missedSavingsAmount)} si hubieras aplicado las oportunidades pendientes?
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Calculado desde la fecha de generacion de cada recomendacion y su ahorro mensual estimado.
              </p>
            </div>
          </div>
          {savingsKpis?.topMissedSavingsRecommendation !== undefined && (
            <span className="text-[10px] font-black uppercase tracking-widest text-tak-yellow bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl">
              Mayor impacto: {savingsKpis.topMissedSavingsRecommendation.title}
            </span>
          )}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-tak-yellow">insights</span>
              Historico de consumo FOCUS
            </h3>
            <p className="text-zinc-500 text-sm">Datos reales hasta el ultimo reporte descargado</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-zinc-700"></span>
              <span className="text-xs font-bold text-zinc-400">Current AS-IS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tak-yellow"></span>
              <span className="text-xs font-bold text-zinc-400">Opt TO-BE</span>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          {chartData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-sm font-bold text-zinc-500">
              {loading ? 'Cargando costos...' : 'Sin costos para esta cuenta'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAsIs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3f3f46" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorToBe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}
                  formatter={(value) => currencyFormatter.format(Number(value))}
                />
                <Area type="monotone" dataKey="asIs" stroke="#52525b" strokeWidth={3} fillOpacity={1} fill="url(#colorAsIs)" />
                <Area type="monotone" dataKey="toBe" stroke="#FACC15" strokeWidth={3} fillOpacity={1} fill="url(#colorToBe)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="size-10 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-tak-yellow">
                <span className="material-symbols-outlined">memory</span>
              </div>
              <span className="bg-tak-yellow/10 text-tak-yellow text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">{suggestion.source}</span>
            </div>
            <h4 className="text-white font-bold mb-1">{suggestion.title}</h4>
            <p className="text-zinc-400 text-xs mb-4">{suggestion.description}</p>
            {suggestion.usageLabel !== undefined && (
              <p className="text-[11px] font-bold text-zinc-500 mb-4">
                Consumo FOCUS: {suggestion.usageLabel}
              </p>
            )}
            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl mb-4 border border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium">Ahorro Mensual</span>
              <span className="text-tak-yellow font-black">{currencyFormatter.format(suggestion.saving)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold">Consumo y eficiencia FOCUS</h3>
              <p className="text-zinc-500 text-xs">Costo, cantidad consumida y costo unitario facturado</p>
            </div>
            <span className="material-symbols-outlined text-tak-yellow">speed</span>
          </div>
          <div className="space-y-3">
            {topUnitEconomics.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500">Sin unidades de consumo disponibles para este rango.</p>
            ) : topUnitEconomics.map((point) => (
              <div key={`${point.groupKey}-${point.month}`} className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{point.groupKey}</p>
                  <p className="text-xs text-zinc-500">
                    {formatCompactNumber(point.consumedQuantity)} {point.consumedUnit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-tak-yellow">
                    {point.unitCost === undefined ? '-' : currencyFormatter.format(point.unitCost)}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">por unidad</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold">Insights de consumo</h3>
              <p className="text-zinc-500 text-xs">FOCUS no incluye CPU, memoria ni IOPS</p>
            </div>
            <span className="material-symbols-outlined text-tak-yellow">rule_settings</span>
          </div>
          <div className="space-y-3">
            {usageInsights.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500">Sin señales de consumo relevantes todavía.</p>
            ) : usageInsights.slice(0, 3).map((insight) => (
              <div key={insight.id} className="border-b border-zinc-800 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-white">{insight.title}</p>
                  <span className="rounded bg-zinc-950 px-2 py-1 text-[10px] font-black text-tak-yellow border border-zinc-800">
                    {insight.severity}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildChartData(metrics: readonly CostMetric[]): ChartPoint[] {
  const dailyTotals = new Map<string, { label: string; total: number }>();

  for (const metric of metrics) {
    const date = new Date(metric.timestamp);
    const key = date.toISOString().slice(0, 10);
    const existing = dailyTotals.get(key);

    dailyTotals.set(key, {
      label: existing?.label ?? date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
      total: (existing?.total ?? 0) + metric.amount,
    });
  }

  return [...dailyTotals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => ({
      name: value.label,
      asIs: roundCurrency(value.total),
      toBe: roundCurrency(value.total * 0.86),
    }));
}

function buildSuggestions(
  metrics: readonly CostMetric[],
  recommendations: readonly Recommendation[],
): Suggestion[] {
  const recommendationSuggestions = recommendations
    .slice(0, 6)
    .map((recommendation) => ({
      id: recommendation.id,
      service: recommendation.type,
      title: recommendation.title,
      description: recommendation.description,
      saving: roundCurrency(recommendation.estimatedMonthlySavings ?? 0),
      source: readRecommendationSource(recommendation),
    }));

  if (recommendationSuggestions.length > 0) {
    return recommendationSuggestions;
  }

  const serviceTotals = new Map<string, number>();
  const serviceUsage = new Map<string, { usage: number; usageUnit: string }>();

  for (const metric of metrics) {
    serviceTotals.set(metric.service, (serviceTotals.get(metric.service) ?? 0) + metric.amount);

    if (metric.usage !== undefined && metric.usageUnit !== undefined) {
      const existing = serviceUsage.get(metric.service);

      if (existing === undefined || existing.usageUnit === metric.usageUnit) {
        serviceUsage.set(metric.service, {
          usage: (existing?.usage ?? 0) + metric.usage,
          usageUnit: metric.usageUnit,
        });
      }
    }
  }

  return [...serviceTotals.entries()]
    .sort(([, leftCost], [, rightCost]) => rightCost - leftCost)
    .slice(0, 3)
    .map(([service, cost]) => ({
      id: service,
      service,
      title: `Insight FOCUS preliminar: ${shortenServiceName(service)}`,
      description: 'Servicio priorizado por gasto y consumo facturado. Requiere IA y validación técnica antes de tratarlo como recomendación.',
      saving: roundCurrency(cost * 0.12),
      source: 'FOCUS',
      usageLabel: formatUsageLabel(serviceUsage.get(service)),
    }));
}

function readRecommendationSource(recommendation: Recommendation): Suggestion['source'] {
  const source = readEvidenceString(recommendation.evidence, 'source')?.trim().toLowerCase();
  return source === 'nvidia-nim' ? 'AI' : 'FOCUS';
}

function readEvidenceString(value: unknown, key: string): string | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === 'string' ? property : undefined;
}

function shortenServiceName(service: string): string {
  return service
    .replace('Amazon ', '')
    .replace('Elastic Compute Cloud', 'EC2')
    .replace('Relational Database Service', 'RDS')
    .replace('Simple Storage Service', 'S3');
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatUsageLabel(value: { readonly usage: number; readonly usageUnit: string } | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return `${formatCompactNumber(value.usage)} ${value.usageUnit}`;
}

function buildDashboardCostRange(): { readonly startDate: string; readonly endDate: string } {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - dashboardCostWindowDays);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}
