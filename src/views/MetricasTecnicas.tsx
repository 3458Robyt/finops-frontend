import { TechnicalMetricUPlot } from '../components/TechnicalMetricUPlot';
import { type TechnicalMetricBucket } from '../services/api';
import { KpiCard, MiniMetric, OpportunityCard, SelectField, StatCard } from './technical-metrics/TechnicalMetricsCards';
import { ResourceCostPanel, SamplesTable } from './technical-metrics/TechnicalMetricsDetailPanels';
import { type MetricGroupFilter, type RangeFilter } from './technical-metrics/technicalMetricsModel';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatRange,
  groupLabels,
  shortResource,
} from './technical-metrics/technicalMetricsPresentation';
import { useTechnicalMetricsController } from './technical-metrics/useTechnicalMetricsController';

export default function MetricasTecnicas({ token }: { readonly token: string }) {
  const {
    overview, coverage, samples, selectedResource, selectedGroup, range, bucket, drilldownWindow,
    loadingOverview, loadingMoreSeries, error, metricOptions, activeMetric, selectedMetricMeta, filteredKpis,
    visibleSeries, visibleSeriesMeta, visibleLoadingSeries, topResourceCost, selectedCoverageMetric,
    setSelectedResource, setSelectedGroup, setSelectedMetric, setRange, setBucket, setDrilldownWindow,
    handleDrilldown, loadNextSeriesPage,
  } = useTechnicalMetricsController(token);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Metricas de uso</h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">
            Analisis tecnico de CPU, memoria, red, disco y sistema. FOCUS se usa solo como contexto de costo
            cuando puede asociarse al recurso.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-400">
          Ultimo dato: <span className="font-bold text-white">{formatDateTime(overview?.latestSampledAt)}</span>
          {loadingOverview && overview !== null && <span className="ml-2 font-semibold text-tak-yellow" aria-live="polite">Actualizando…</span>}
        </div>
      </header>

      {error !== null && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="database" label="Muestras tecnicas" value={loadingOverview && overview === null ? '...' : formatNumber(overview?.sampleCount ?? 0)} helper={formatRange(overview)} />
        <StatCard icon="dns" label="Recursos detectados" value={loadingOverview && overview === null ? '...' : formatNumber(overview?.resourceCount ?? 0)} helper="Derivados de metricas reales" />
        <StatCard icon="monitoring" label="Metricas disponibles" value={loadingOverview && overview === null ? '...' : formatNumber(overview?.metricCount ?? 0)} helper={selectedMetricMeta?.metricName ?? 'Sin metrica seleccionada'} />
        <StatCard
          icon="payments"
          label="Costo asociado"
          value={topResourceCost === undefined ? 'Sin match exacto' : formatCurrency(topResourceCost.totalCost, topResourceCost.currency)}
          helper={topResourceCost === undefined ? 'No se inventa relacion de costo' : `Match ${topResourceCost.matchLevel}`}
        />
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
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
          {(coverage?.days ?? []).slice(-30).map((day) => (
            <span
              key={day.date}
              title={`${day.date}: ${day.sampleCount} muestras`}
              className={`h-3 w-6 rounded-full ${day.status === 'WITH_DATA' ? 'bg-tak-yellow' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SelectField label="Recurso" value={selectedResource} onChange={(value) => { setDrilldownWindow(null); setSelectedResource(value); }}>
            <option value="ALL">Todos los recursos</option>
            {(overview?.resources ?? []).map((resource) => (
              <option key={resource.externalResourceId} value={resource.externalResourceId}>
                {shortResource(resource.externalResourceId)}
              </option>
            ))}
          </SelectField>

          <SelectField label="Grupo" value={selectedGroup} onChange={(value) => { setDrilldownWindow(null); setSelectedGroup(value as MetricGroupFilter); }}>
            {Object.entries(groupLabels).map(([value, label]) => (
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
          </SelectField>

          <SelectField label="Granularidad" value={bucket} onChange={(value) => { setDrilldownWindow(null); setBucket(value as TechnicalMetricBucket); }}>
            <option value="auto">Auto</option>
            <option value="raw">Cruda</option>
            <option value="30m">30 min</option>
            <option value="hour">Hora</option>
            <option value="day">Dia</option>
          </SelectField>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Serie temporal</h3>
              <p className="text-xs text-zinc-500">
                {activeMetric ?? 'Sin metrica'} {selectedMetricMeta?.metricUnit !== undefined ? `(${selectedMetricMeta.metricUnit})` : ''}
              </p>
            </div>
            <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tak-yellow">
              {visibleLoadingSeries
                ? `${visibleSeriesMeta?.returnedPoints ?? visibleSeries.length}/${visibleSeriesMeta?.totalSamples ?? selectedCoverageMetric?.sampleCount ?? 0}`
                : `${visibleSeriesMeta?.totalSamples ?? selectedCoverageMetric?.sampleCount ?? visibleSeries.length} muestras crudas · ${visibleSeries.length} puntos`}
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

          <div className="h-[360px] w-full">
            <TechnicalMetricUPlot
              points={visibleSeries}
              unit={selectedMetricMeta?.metricUnit}
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

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
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
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-sm font-bold text-zinc-500 lg:col-span-5">
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
