import { useEffect, useMemo, useState } from 'react';
import {
  fetchAnalyticsEfficiencyInsights,
  fetchAnalyticsOpportunities,
  fetchRecommendations,
  recomputeAnalytics,
  type CostOpportunity,
  type Recommendation,
  type UsageInsight,
} from '../services/api';

interface ConsoleProps {
  readonly token: string;
  readonly onResourceSelect?: (id: string) => void;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const severityWeight: Record<Recommendation['severity'], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export default function Console({ token, onResourceSelect }: ConsoleProps) {
  const [recommendations, setRecommendations] = useState<readonly Recommendation[]>([]);
  const [opportunities, setOpportunities] = useState<readonly CostOpportunity[]>([]);
  const [usageInsights, setUsageInsights] = useState<readonly UsageInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchRecommendations(token),
      fetchAnalyticsOpportunities(token),
      fetchAnalyticsEfficiencyInsights(token),
    ])
      .then(([response, opportunityResponse, usageInsightResponse]) => {
        if (active) {
          setRecommendations(response.recommendations);
          setOpportunities(opportunityResponse.opportunities);
          setUsageInsights(usageInsightResponse.insights);
        }

        if (opportunityResponse.opportunities.length === 0) {
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
          setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar recomendaciones');
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

  const tableData = useMemo(
    () => [...recommendations]
      .sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity]),
    [recommendations],
  );
  const criticalOpportunityCount = opportunities.filter((row) => row.severity === 'HIGH' || row.severity === 'CRITICAL').length;
  const totalSavings = tableData.reduce((total, row) => total + (row.estimatedMonthlySavings ?? 0), 0);
  const computeCount = tableData.filter((row) => row.type.includes('COMPUTE')).length;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 relative">
      {error !== null && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Oportunidades Críticas</p>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tak-yellow text-3xl">warning</span>
            <h3 className="text-3xl font-black text-white">{loading ? '...' : criticalOpportunityCount}</h3>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Compute Priorizado</p>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-zinc-500 text-3xl">memory</span>
            <h3 className="text-3xl font-black text-white">{loading ? '...' : computeCount}</h3>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Ahorro Estimado</p>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-3xl">trending_up</span>
            <h3 className="text-3xl font-black text-white">{loading ? '...' : currencyFormatter.format(totalSavings)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">speed</span>
            Consumo y Eficiencia FOCUS
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Estas señales usan consumo facturado; CPU, memoria e IOPS requieren métricas técnicas separadas.</p>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Señal</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Severidad</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Consumo</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Costo unitario</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Lectura</th>
              </tr>
            </thead>
            <tbody>
              {usageInsights.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm font-bold text-zinc-500">Sin insights de consumo para este tenant</td>
                </tr>
              ) : usageInsights.slice(0, 6).map((insight) => (
                <tr key={insight.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                  <td className="p-4 text-sm font-medium text-white">{insight.title}</td>
                  <td className="p-4">
                    <span className="bg-tak-yellow/10 text-tak-yellow text-[10px] font-bold px-2 py-1 rounded uppercase">{insight.severity}</span>
                  </td>
                  <td className="p-4 text-sm text-zinc-300 font-bold">
                    {insight.consumedQuantity === undefined ? '-' : `${formatNumber(insight.consumedQuantity)} ${insight.consumedUnit ?? ''}`}
                  </td>
                  <td className="p-4 text-sm text-white font-black">
                    {insight.unitCost === undefined ? '-' : currencyFormatter.format(insight.unitCost)}
                  </td>
                  <td className="p-4 text-sm text-zinc-400 font-medium">{insight.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">monitoring</span>
            Oportunidades Detectadas
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Servicio</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Severidad</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Delta</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Explicacion</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-sm font-bold text-zinc-500">Sin oportunidades persistidas para este tenant</td>
                </tr>
              ) : opportunities.slice(0, 6).map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                  <td className="p-4 text-sm font-medium text-white">{opportunity.serviceName ?? opportunity.resourceId ?? 'Total'}</td>
                  <td className="p-4">
                    <span className="bg-red-500/10 text-red-300 text-[10px] font-bold px-2 py-1 rounded uppercase">{opportunity.severity}</span>
                  </td>
                  <td className="p-4 text-sm text-white font-black">
                    {currencyFormatter.format(opportunity.deltaAmount)} / {opportunity.deltaPercent.toFixed(1)}%
                  </td>
                  <td className="p-4 text-sm text-zinc-400 font-medium">{opportunity.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">table_chart</span>
            Recomendaciones Técnicas
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">ID Recurso</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Servicio</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Métrica</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Acción Sugerida</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 text-right">Ahorro Est.</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm font-bold text-zinc-500">Cargando recomendaciones...</td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm font-bold text-zinc-500">Sin recomendaciones pendientes para esta cuenta</td>
                </tr>
              ) : tableData.map((row) => {
                const evidence = readEvidence(row.evidence);

                return (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                    <td className="p-4 text-sm font-medium text-white">{row.id}</td>
                    <td className="p-4">
                      <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded uppercase">{row.type}</span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400 font-medium">{evidence.metric ?? row.severity}</td>
                    <td className="p-4 text-sm text-tak-yellow font-bold uppercase tracking-tight">{evidence.action ?? row.title}</td>
                    <td className="p-4 text-sm text-white font-black text-right">
                      {currencyFormatter.format(row.estimatedMonthlySavings ?? 0)}
                    </td>
                    <td className="p-4 flex justify-center">
                      <button
                        onClick={() => onResourceSelect?.(row.id)}
                        className="text-[10px] font-bold bg-tak-yellow/10 hover:bg-tak-yellow/20 text-tak-yellow uppercase tracking-widest transition-colors border border-tak-yellow/20 px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function readEvidence(value: unknown): {
  readonly environment?: string;
  readonly metric?: string;
  readonly action?: string;
} {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const environment = getStringProperty(value, 'environment')?.trim().toLowerCase();
  const metric = getStringProperty(value, 'metric');
  const action = getStringProperty(value, 'action');

  return {
    ...(environment !== undefined ? { environment } : {}),
    ...(metric !== undefined ? { metric } : {}),
    ...(action !== undefined ? { action } : {}),
  };
}

function getStringProperty(value: object, key: string): string | undefined {
  const record = value as Record<string, unknown>;
  const property = record[key];
  return typeof property === 'string' ? property : undefined;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}
