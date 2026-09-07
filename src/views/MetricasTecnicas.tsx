import { useMemo } from 'react';
import { TechnicalMetricUPlot } from '../components/TechnicalMetricUPlot';
import { type TechnicalMetricBucket } from '../services/api';
import { KpiCard, MiniMetric, OpportunityCard, SelectField, StatCard } from './technical-metrics/TechnicalMetricsCards';
import { ResourceCostPanel, SamplesTable } from './technical-metrics/TechnicalMetricsDetailPanels';
import { type MetricGroupFilter, type RangeFilter } from './technical-metrics/technicalMetricsModel';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  groupLabels,
  resourceLegendLabel,
  resourceOptionLabel,
} from './technical-metrics/technicalMetricsPresentation';
import { useTechnicalMetricsController } from './technical-metrics/useTechnicalMetricsController';

function formatStatisticLabel(statistic: string): string {
  const labels: Record<string, string> = {
    MEAN: 'Promedio (mean)',
    MIN: 'Mínimo (min)',
    MAX: 'Máximo (max)',
    P50: 'Percentil 50 (p50)',
    P90: 'Percentil 90 (p90)',
    P95: 'Percentil 95 (p95)',
    P99: 'Percentil 99 (p99)',
    SUM: 'Suma (sum)',
    COUNT: 'Conteo (count)',
    RATE: 'Tasa (rate)',
    LATEST: 'Último valor (latest)',
  };
  return labels[statistic] ?? statistic;
}

export default function MetricasTecnicas() {
  const {
    overview, coverage, samples, selectedResource, selectedGroup, range, bucket, selectedStatistic, statisticOptions, drilldownWindow,
    loadingOverview, loadingMoreSeries, error, metricOptions, activeMetric, selectedMetricMeta, filteredKpis,
    visibleSeries, visibleSeriesMeta, visibleLoadingSeries, topResourceCost, selectedCoverageMetric,
    setSelectedResource, setSelectedGroup, setSelectedMetric, setRange, setBucket, setSelectedStatistic, setDrilldownWindow,
    handleDrilldown, loadNextSeriesPage,
  } = useTechnicalMetricsController();
  const canonicalResourceLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const resource of overview?.resources ?? []) {
      const label = resourceLegendLabel(resource);
      labels.set(resource.externalResourceId, label);
      if (resource.cloudResourceId !== undefined) {
        labels.set(resource.cloudResourceId, label);
      }
    }
    return labels;
  }, [overview?.resources]);
  const visibleGroupOptions = Object.entries(groupLabels).filter(([value]) => (
    value === 'ALL' || (overview?.metrics ?? []).some((metric) => metric.group === value)
  ));

  return (
    <div className="ui-page space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <header className="ui-page-header flex-col lg:flex-row lg:items-end">
        <div>
          <p className="ui-kicker">Observabilidad operativa</p>
          <h2 className="ui-page-title mt-2">Métricas de uso</h2>
          <p className="ui-page-lead">
            Analisis tecnico de CPU, memoria, red, disco y sistema. FOCUS se usa solo como contexto de costo
            cuando puede asociarse al recurso.
          </p>
        </div>
        <div className="ui-callout ui-callout-accent shrink-0 px-4 py-3 text-xs text-zinc-400">
          Ultimo dato: <span className="font-bold text-white">{formatDateTime(overview?.latestSampledAt)}</span>
          {loadingOverview && overview !== null && <span className="ml-2 font-semibold text-tak-yellow" aria-live="polite">Actualizando…</span>}
        </div>
      </header>

      {error !== null && (
        <div className="ui-alert-danger p-4 text-sm font-medium">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="database" label={`Muestras ${formatStatisticLabel(selectedStatistic)}`} value={loadingOverview && overview === null ? '...' : formatNumber(overview?.sampleCount ?? 0)} helper="Solo la estadística seleccionada; el total global incluye todas." />
        <StatCard icon="dns" label="Recursos detectados" value={loadingOverview && overview === null ? '...' : formatNumber(overview?.resourceCount ?? 0)} helper="Derivados de metricas reales" />
        <StatCard icon="monitoring" label="Metricas disponibles" value={loadingOverview && overview === null ? '...' : formatNumber(overview?.metricCount ?? 0)} helper={selectedMetricMeta?.metricName ?? 'Sin metrica seleccionada'} />
        <StatCard
          icon="payments"
          label="Costo asociado"
          value={topResourceCost === undefined ? 'Sin match exacto' : formatCurrency(topResourceCost.totalCost, topResourceCost.currency)}
          helper={topResourceCost === undefined ? 'No se inventa relacion de costo' : `Match ${topResourceCost.matchLevel}`}
        />
      </section>

      <section className="ui-surface p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Cobertura de datos</h3>
            <p className="text-xs text-zinc-500">
              Diferencia muestras totales, muestras de la metrica seleccionada y dias realmente cubiertos.
            </p>
          </div>
          <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {coverage === null ? 'Sin cobertura' : `${coverage.daysWithData}/${coverage.expectedDays} dias`}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <MiniMetric label="Muestras rango" value={formatNumber(coverage?.totalSamples ?? 0)} />
          <MiniMetric label="Cobertura rango" value={`${formatNumber(coverage?.coveragePercent ?? 0)}%`} />
          <MiniMetric label="Muestras metrica" value={formatNumber(selectedCoverageMetric?.sampleCount ?? 0)} />
          <MiniMetric label="Dias metrica" value={`${selectedCoverageMetric?.daysWithData ?? 0}/${selectedCoverageMetric?.expectedDays ?? coverage?.expectedDays ?? 0}`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1">
          {(coverage?.days ?? []).map((day) => (
            <span
              key={day.date}
              title={`${day.date}: ${day.sampleCount} muestras`}
              className={`h-3 min-w-2 flex-1 rounded-full ${day.status === 'WITH_DATA' ? 'bg-tak-yellow' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
      </section>

      <section className="ui-surface p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SelectField label="Recurso" value={selectedResource} onChange={(value) => { setDrilldownWindow(null); setSelectedResource(value); }}>
            <option value="ALL">Todos los recursos</option>
            {(overview?.resources ?? []).map((resource) => (
              <option key={resource.cloudResourceId ?? resource.externalResourceId} value={resource.externalResourceId}>
                {resourceOptionLabel(resource)}
              </option>
            ))}
          </SelectField>

          <SelectField label="Grupo" value={selectedGroup} onChange={(value) => { setDrilldownWindow(null); setSelectedGroup(value as MetricGroupFilter); }}>
            {visibleGroupOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>

          <SelectField label="Metrica" value={activeMetric ?? ''} onChange={(value) => { setDrilldownWindow(null); setSelectedMetric(value); }}>
            {metricOptions.map((metric) => (
              <option key={metric.metricName} value={metric.metricName}>
                {metric.metricName}
              </option>
            ))}
          </SelectField>

          <SelectField label="Rango" value={range} onChange={(value) => { setDrilldownWindow(null); setRange(value as RangeFilter); }}>
            <option value="available">Disponible</option>
            <option value="24h">Ultimas 24 h</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="90d">Ultimos 90 dias</option>
          </SelectField>

          <SelectField label="Granularidad" value={bucket} onChange={(value) => { setDrilldownWindow(null); setBucket(value as TechnicalMetricBucket); }}>
            <option value="auto">Auto</option>
            <option value="raw">Cruda</option>
            <option value="30m">30 min</option>
            <option value="hour">Hora</option>
            <option value="day">Dia</option>
          </SelectField>

          <SelectField label="Estadistica" value={selectedStatistic} onChange={(value) => { setDrilldownWindow(null); setSelectedStatistic(value as typeof selectedStatistic); }}>
            {statisticOptions.map((statistic) => (
              <option key={statistic} value={statistic}>{formatStatisticLabel(statistic)}</option>
            ))}
          </SelectField>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
        <div className="ui-surface p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Serie temporal</h3>
              <p className="text-xs text-zinc-500">
                {activeMetric ?? 'Sin metrica'} · {formatStatisticLabel(selectedStatistic)} {selectedMetricMeta?.metricUnit !== undefined ? `(${selectedMetricMeta.metricUnit})` : ''}
              </p>
            </div>
            <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tak-yellow">
              {visibleLoadingSeries
                ? `${visibleSeriesMeta?.returnedPoints ?? visibleSeries.length}/${visibleSeriesMeta?.totalSamples ?? selectedCoverageMetric?.sampleCount ?? 0}`
                : `${visibleSeriesMeta?.totalSamples ?? selectedCoverageMetric?.sampleCount ?? visibleSeries.length} muestras fuente · ${visibleSeries.length} puntos ${visibleSeriesMeta?.bucket === 'raw' ? 'crudos' : 'agregados'}`}
            </span>
          </div>

          {drilldownWindow !== null && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-tak-yellow/20 bg-tak-yellow/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-tak-yellow">
                Drilldown raw: {formatDateTime(drilldownWindow.startDate)} - {formatDateTime(drilldownWindow.endDate)}
              </p>
              <button
                type="button"
                onClick={() => setDrilldownWindow(null)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-xs font-black text-white transition hover:border-tak-yellow"
              >
                Volver al rango
              </button>
            </div>
          )}

          <div className="w-full">
            <TechnicalMetricUPlot
              points={visibleSeries}
              unit={selectedMetricMeta?.metricUnit}
              statistic={selectedStatistic}
              resourceLabels={canonicalResourceLabels}
              loading={visibleLoadingSeries || loadingOverview}
              separateResources={selectedResource === 'ALL'}
              onSelectRange={handleDrilldown}
            />
          </div>
          {visibleSeriesMeta?.hasMore && visibleSeriesMeta.nextCursor !== undefined && (
            <button
              type="button"
              onClick={() => void loadNextSeriesPage()}
              disabled={loadingMoreSeries}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:border-tak-yellow hover:text-tak-yellow disabled:cursor-wait disabled:opacity-60"
            >
              {loadingMoreSeries ? 'Cargando puntos exactos...' : 'Cargar siguientes puntos exactos'}
            </button>
          )}
        </div>

        <div data-testid="technical-metric-opportunities" className="ui-surface p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Oportunidades tecnicas</h3>
              <p className="text-xs text-zinc-500">Priorizadas por evidencia de uso y costo cuando exista.</p>
            </div>
            <span className="material-symbols-outlined text-tak-yellow">rule_settings</span>
          </div>
          <div className="space-y-3">
            {(overview?.opportunities ?? []).length === 0 ? (
              <p className="text-sm font-medium text-zinc-500">Sin oportunidades tecnicas para estos filtros.</p>
            ) : (overview?.opportunities ?? []).map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {filteredKpis.length === 0 ? (
          <div className="ui-surface p-6 text-sm font-bold text-zinc-500 lg:col-span-5">
            Sin KPIs para el grupo seleccionado.
          </div>
        ) : filteredKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ResourceCostPanel overview={overview} />
        <SamplesTable samples={samples} loading={loadingOverview} />
      </section>
    </div>
  );
}
