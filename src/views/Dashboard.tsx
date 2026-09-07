import { CostHistoryUPlot } from '../components/CostHistoryUPlot';
import { ForecastScenarioPanel } from '../components/ForecastScenarioPanel';
import RecommendationGenerationAction from '../components/RecommendationGenerationAction';
import type { ApiRole } from '../services/api';
import { useDashboardController } from './dashboard/useDashboardController';
import { formatCompactNumber, formatCurrency, hasPlottableCostData } from './dashboard/dashboardPresentation';

export interface DashboardProps {
  readonly onOpenBudgets?: () => void;
  readonly apiRole?: ApiRole;
  readonly onOpenAgentSettings?: () => void;
}

export default function Dashboard({ onOpenBudgets, apiRole, onOpenAgentSettings }: DashboardProps) {
  const {
    loading,
    error,
    budgetError,
    usageInsights,
    savingsKpis,
    budgetPerformance,
    chartData,
    suggestions,
    dashboardBudget,
    budgetUsage,
    identifiedWaste,
    roi,
    openOpportunities,
    acceptanceRate,
    topUnitEconomics,
    missedSavingsAmount,
    forecastScenarios,
    reportingCurrency,
    setReportingCurrency,
    costHistory,
  } = useDashboardController();
  const currencyOptions = [...new Set([
    'USD',
    'COP',
    reportingCurrency,
    ...(costHistory?.totalsByCurrency ?? []).map((item) => item.currency),
  ])].sort();

  return (
    <div className="ui-page space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <header className="ui-page-header">
        <div>
          <p className="ui-kicker">Centro de control</p>
          <h2 className="ui-page-title mt-2">Decisiones cloud con evidencia</h2>
          <p className="ui-page-lead">Una lectura ejecutiva del gasto, el consumo y el ahorro que todavía puede capturarse.</p>
        </div>
        <span className="ui-status ui-status-accent shrink-0">Tenant activo · datos gobernados</span>
      </header>
      {error !== null && (
        <div className="ui-alert-danger px-4 py-3 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <button type="button" onClick={onOpenBudgets} className="ui-surface-raised relative overflow-hidden p-6 text-left transition hover:border-tak-yellow/40">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-white">account_balance_wallet</span>
          </div>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Gasto y presupuesto</p>
          <div className="flex items-end gap-2 mb-4">
            <h3 className="text-3xl font-black text-white">
              {loading ? '...' : budgetError !== null ? 'No disponible' : budgetPerformance === null ? 'Sin presupuesto' : formatCurrency(budgetPerformance.actualCost, budgetPerformance.budget.currency)}
            </h3>
            {dashboardBudget !== undefined && <span className="text-zinc-500 text-sm font-medium mb-1">/ {formatCurrency(dashboardBudget.amount, dashboardBudget.currency)}</span>}
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden" aria-label="Consumo del presupuesto">
            <div
              className={`h-full rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)] ${budgetUsage > 85 ? 'bg-red-500' : 'bg-tak-yellow'}`}
              style={{ width: `${budgetUsage}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            <p className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-green-500 font-bold">verified</span>
              {budgetError !== null ? 'Abra presupuestos para reintentar' : budgetPerformance === null ? 'Configure un límite mensual' : 'Datos FOCUS + analítica persistida'}
            </p>
            <p className="text-xs text-zinc-500">{budgetPerformance?.forecastCost === undefined ? 'Forecast no disponible' : `Forecast: ${formatCurrency(budgetPerformance.forecastCost, budgetPerformance.budget.currency)}`}</p>
          </div>
        </button>

        <div className="ui-surface flex items-center gap-5 p-6 lg:gap-6">
          <div className="size-12 lg:size-14 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
            <span className="material-symbols-outlined text-red-500 text-2xl lg:text-3xl">delete_sweep</span>
          </div>
          <div>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Oportunidades abiertas</h3>
            <p className="text-2xl lg:text-3xl font-bold text-white">
              {loading ? '...' : openOpportunities}
            </p>
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded uppercase mt-2 inline-block border border-red-500/20">
              {formatCurrency(identifiedWaste, savingsKpis?.currency ?? reportingCurrency)} ahorro estimado
            </span>
          </div>
        </div>

        <div className="ui-surface flex items-center gap-5 p-6 lg:gap-6 md:col-span-2 lg:col-span-1">
          <div className="size-12 lg:size-14 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
            <span className="material-symbols-outlined text-green-500 text-2xl lg:text-3xl">account_balance_wallet</span>
          </div>
          <div>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Adopcion / Ahorro verificado</h3>
            <p className="text-2xl lg:text-3xl font-bold text-white">{loading ? '...' : `${roi.toFixed(1)}%`}</p>
            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase mt-2 inline-block border border-green-500/20">
              {acceptanceRate.toFixed(0)}% aceptacion
            </span>
          </div>
        </div>
      </div>

      {missedSavingsAmount > 0 && (
        <div className="ui-callout ui-callout-accent flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="size-11 rounded-xl bg-tak-yellow/10 border border-tak-yellow/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tak-yellow">savings</span>
            </div>
            <div>
              <p className="text-sm lg:text-base font-black text-white">
                ¿Sabías que podrías haberte ahorrado {formatCurrency(missedSavingsAmount, savingsKpis?.currency ?? reportingCurrency)} si hubieras aplicado las oportunidades pendientes?
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

      {apiRole !== undefined && (
        <RecommendationGenerationAction
          role={apiRole}
          onCompleted={() => window.dispatchEvent(new CustomEvent('finops:recommendations-updated'))}
          onOpenAnalysis={onOpenAgentSettings}
        />
      )}

      <section className="ui-surface p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-tak-yellow">insights</span>
              Historico de consumo FOCUS
            </h3>
            <p className="text-zinc-500 text-sm">Datos reales hasta el ultimo reporte descargado</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-400">
              Moneda
              <select value={reportingCurrency} onChange={(event) => setReportingCurrency(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white">
                {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="h-[300px] w-full">
          {!hasPlottableCostData(chartData) ? (
            <div className="h-full w-full flex items-center justify-center text-sm font-bold text-zinc-500">
              {loading ? 'Cargando costos...' : 'Sin costos para esta cuenta'}
            </div>
          ) : (
            <CostHistoryUPlot points={chartData} currency={reportingCurrency} />
          )}
        </div>
        {costHistory !== null && costHistory.coverage.missingPeriods > 0 && (
          <p className="mt-3 text-xs font-medium text-amber-300">
            Hay {costHistory.coverage.missingPeriods} periodos sin costos reportados. Se muestran como cortes y no como cero.
          </p>
        )}
        {costHistory !== null && costHistory.coverage.conversionIssuePeriods > 0 && (
          <p className="mt-2 text-xs font-medium text-amber-300">
            Hay {costHistory.coverage.conversionIssuePeriods} periodos con moneda sin tasa de conversión. Se conservan los importes nativos y no se inventa un valor convertido.
          </p>
        )}
        {costHistory?.meta.dataAsOf !== undefined && costHistory.meta.dataAsOf !== null && (costHistory.meta.staleDays ?? 0) > 0 && (
          <p className="mt-2 text-xs font-medium text-amber-300">
            Datos disponibles hasta {new Date(costHistory.meta.dataAsOf).toLocaleDateString('es-CO', { timeZone: 'UTC' })}. La fuente está {costHistory.meta.staleDays} días atrasada; no se interpretan los días faltantes como consumo cero.
          </p>
        )}
      </section>

      <ForecastScenarioPanel scenarios={forecastScenarios} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="ui-surface p-5 transition-colors hover:border-zinc-700">
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
              <span className="text-tak-yellow font-black">{formatCurrency(suggestion.saving, suggestion.currency)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ui-surface p-5">
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
                    {point.unitCost === undefined ? '-' : formatCurrency(point.unitCost, point.currency)}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">por unidad</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ui-surface p-5">
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
