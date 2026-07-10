import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import { TechnicalMetricUPlot } from '../components/TechnicalMetricUPlot';
import {
  fetchTechnicalMetricsCoverage,
  fetchTechnicalMetricSamples,
  fetchTechnicalMetricSeries,
  fetchTechnicalMetricsOverview,
  type ResourceMetricSampleItem,
  type TechnicalMetricBucket,
  type TechnicalMetricGroup,
  type TechnicalMetricKpi,
  type TechnicalMetricOpportunity,
  type TechnicalMetricCoverage,
  type TechnicalMetricSeriesPoint,
  type TechnicalMetricsOverview,
} from '../services/api';

type MetricGroupFilter = TechnicalMetricGroup | 'ALL';
type RangeFilter = 'available' | '24h' | '7d' | '30d';

interface SeriesMeta {
  readonly hasMore: boolean;
  readonly nextCursor?: string;
  readonly returnedPoints: number;
  readonly totalSamples: number;
  readonly queryMs: number;
  readonly bucket: Exclude<TechnicalMetricBucket, 'auto'>;
}

interface SeriesCacheEntry {
  readonly createdAt: number;
  readonly series: readonly TechnicalMetricSeriesPoint[];
  readonly meta: SeriesMeta;
}

interface DrilldownWindow {
  readonly startDate: string;
  readonly endDate: string;
}

const seriesPageSize = 1000;
const maxSeriesCacheEntries = 8;
const seriesCacheTtlMs = 2 * 60 * 1000;

const groupLabels: Readonly<Record<MetricGroupFilter, string>> = {
  ALL: 'Todas',
  CPU: 'CPU',
  MEMORY: 'Memoria',
  NETWORK: 'Red',
  DISK: 'Disco',
  SYSTEM: 'Sistema',
  OTHER: 'Otras',
};

const severityStyles: Readonly<Record<TechnicalMetricOpportunity['severity'], string>> = {
  INFO: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
  LOW: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  MEDIUM: 'border-tak-yellow/20 bg-tak-yellow/10 text-tak-yellow',
  HIGH: 'border-red-500/20 bg-red-500/10 text-red-200',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export default function MetricasTecnicas({ token }: { readonly token: string }) {
  const [overview, setOverview] = useState<TechnicalMetricsOverview | null>(null);
  const [coverage, setCoverage] = useState<TechnicalMetricCoverage | null>(null);
  const [series, setSeries] = useState<readonly TechnicalMetricSeriesPoint[]>([]);
  const [samples, setSamples] = useState<readonly ResourceMetricSampleItem[]>([]);
  const [selectedResource, setSelectedResource] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState<MetricGroupFilter>('ALL');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [range, setRange] = useState<RangeFilter>('available');
  const [bucket, setBucket] = useState<TechnicalMetricBucket>('auto');
  const [drilldownWindow, setDrilldownWindow] = useState<DrilldownWindow | null>(null);
  const [seriesMeta, setSeriesMeta] = useState<SeriesMeta | null>(null);
  const [seriesNextCursor, setSeriesNextCursor] = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingMoreSeries, setLoadingMoreSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seriesCacheRef = useRef(new Map<string, SeriesCacheEntry>());
  const seriesRequestGenerationRef = useRef(0);
  const nextSeriesControllerRef = useRef<AbortController | null>(null);
  const rangeParams = useMemo(
    () => buildRangeParams(range, coverage),
    [coverage, range],
  );

  useEffect(() => {
    seriesCacheRef.current.clear();
  }, [token]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoadingOverview(true);
        setError(null);
      }
    });

    Promise.all([
      fetchTechnicalMetricsOverview(token, {
        ...rangeParams,
        ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
      }),
      fetchTechnicalMetricsCoverage(token, {
        ...rangeParams,
        ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
      }),
      fetchTechnicalMetricSamples(token, 50),
    ])
      .then(([overviewResponse, coverageResponse, samplesResponse]) => {
        if (!active) {
          return;
        }

        setOverview(overviewResponse.overview);
        setCoverage(coverageResponse.coverage);
        setSamples(samplesResponse.samples);
      })
      .catch((cause: unknown) => {
        if (active) {
          setOverview(null);
          setCoverage(null);
          setSeries([]);
          setSamples([]);
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las metricas tecnicas.');
        }
      })
      .finally(() => {
        if (active) {
          setLoadingOverview(false);
        }
      });

    return () => {
      active = false;
    };
  }, [rangeParams, selectedResource, token]);

  const metricOptions = useMemo(() => {
    const metrics = overview?.metrics ?? [];
    return selectedGroup === 'ALL'
      ? metrics
      : metrics.filter((metric) => metric.group === selectedGroup);
  }, [overview?.metrics, selectedGroup]);

  const activeMetric = useMemo(() => {
    if (selectedMetric !== null && metricOptions.some((metric) => metric.metricName === selectedMetric)) {
      return selectedMetric;
    }

    return metricOptions[0]?.metricName ?? null;
  }, [metricOptions, selectedMetric]);

  useEffect(() => {
    seriesRequestGenerationRef.current += 1;
    nextSeriesControllerRef.current?.abort();
    nextSeriesControllerRef.current = null;
  }, [activeMetric, bucket, drilldownWindow, range, rangeParams, selectedResource, token]);

  const handleDrilldown = useCallback((window: DrilldownWindow) => {
    setDrilldownWindow(window);
  }, []);

  const loadNextSeriesPage = useCallback(async (): Promise<void> => {
    if (activeMetric === null || seriesNextCursor === null || loadingMoreSeries) {
      return;
    }

    const requestGeneration = seriesRequestGenerationRef.current;
    const controller = new AbortController();
    nextSeriesControllerRef.current?.abort();
    nextSeriesControllerRef.current = controller;
    setLoadingMoreSeries(true);
    try {
      const requestRange = drilldownWindow ?? rangeParams;
      const effectiveBucket = drilldownWindow === null
        ? resolveRequestBucket(bucket, range)
        : 'raw';
      const response = await fetchTechnicalMetricSeries(
        token,
        {
          ...requestRange,
          metricNames: [activeMetric],
          bucket: effectiveBucket,
          pageSize: seriesPageSize,
          cursor: seriesNextCursor,
          ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
        },
        { signal: controller.signal },
      );

      if (requestGeneration !== seriesRequestGenerationRef.current || controller.signal.aborted) {
        return;
      }

      setSeries((current) => [...current, ...response.series]);
      setSeriesMeta((current) => current === null ? {
        hasMore: response.meta.hasMore,
        nextCursor: response.meta.nextCursor,
        returnedPoints: response.series.length,
        totalSamples: response.meta.totalSamples,
        queryMs: response.meta.queryMs,
        bucket: response.meta.bucket,
      } : {
        ...current,
        hasMore: response.meta.hasMore,
        nextCursor: response.meta.nextCursor,
        returnedPoints: current.returnedPoints + response.series.length,
        totalSamples: current.totalSamples || response.meta.totalSamples,
        queryMs: current.queryMs + response.meta.queryMs,
      });
      setSeriesNextCursor(response.meta.nextCursor ?? null);
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return;
      }
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la siguiente pagina de metricas.');
    } finally {
      if (requestGeneration === seriesRequestGenerationRef.current) {
        setLoadingMoreSeries(false);
      }
    }
  }, [activeMetric, bucket, drilldownWindow, loadingMoreSeries, range, rangeParams, selectedResource, seriesNextCursor, token]);

  useEffect(() => {
    if (activeMetric === null) {
      return;
    }

    if (range === 'available' && (
      rangeParams.startDate === undefined ||
      rangeParams.endDate === undefined
    )) {
      return;
    }

    let active = true;
    const controller = new AbortController();
    const requestBucket = resolveRequestBucket(bucket, range);
    const requestRange = drilldownWindow ?? rangeParams;
    const effectiveBucket = drilldownWindow === null ? requestBucket : 'raw';
    const cacheKey = JSON.stringify({
      activeMetric,
      bucket: effectiveBucket,
      requestRange,
      selectedResource,
    });
    const cachedSeries = getSeriesCache(seriesCacheRef.current, cacheKey);
    if (cachedSeries !== null) {
      setSeries(cachedSeries.series);
      setSeriesMeta(cachedSeries.meta);
      setSeriesNextCursor(cachedSeries.meta.nextCursor ?? null);
      setLoadingSeries(false);
      return;
    }

    setLoadingSeries(true);
    setSeries([]);
    setSeriesMeta(null);
    setSeriesNextCursor(null);

    const loadSeries = async (): Promise<void> => {
      const response = await fetchTechnicalMetricSeries(
        token,
        {
          ...requestRange,
          metricNames: [activeMetric],
          bucket: effectiveBucket,
          pageSize: seriesPageSize,
          ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
        },
        { signal: controller.signal },
      );

      if (!active) {
        return;
      }

      const meta: SeriesMeta = {
        hasMore: response.meta.hasMore,
        nextCursor: response.meta.nextCursor,
        returnedPoints: response.series.length,
        totalSamples: response.meta.totalSamples,
        queryMs: response.meta.queryMs,
        bucket: response.meta.bucket,
      };
      setSeries(response.series);
      setSeriesMeta(meta);
      setSeriesNextCursor(response.meta.nextCursor ?? null);
      setSeriesCache(seriesCacheRef.current, cacheKey, {
        createdAt: Date.now(),
        series: response.series,
        meta,
      });
    };

    void loadSeries()
      .catch((cause: unknown) => {
        if (active) {
          setSeries([]);
          setSeriesMeta(null);
          if (cause instanceof DOMException && cause.name === 'AbortError') {
            return;
          }
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar la serie de metricas.');
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSeries(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeMetric, bucket, drilldownWindow, range, rangeParams, selectedResource, token]);

  const selectedMetricMeta = metricOptions.find((metric) => metric.metricName === activeMetric);
  const seriesUnavailable = range === 'available' && (
    rangeParams.startDate === undefined ||
    rangeParams.endDate === undefined
  );
  const visibleSeries = seriesUnavailable ? [] : series;
  const visibleSeriesMeta = seriesUnavailable ? null : seriesMeta;
  const visibleLoadingSeries = seriesUnavailable ? false : loadingSeries;
  const filteredKpis = useMemo(() => {
    const kpis = overview?.kpis ?? [];
    return selectedGroup === 'ALL' ? kpis : kpis.filter((kpi) => kpi.group === selectedGroup);
  }, [overview?.kpis, selectedGroup]);
  const topResourceCost = overview?.resources.find((resource) => resource.cost !== undefined)?.cost;
  const selectedCoverageMetric = coverage?.metrics.find((metric) => metric.metricName === activeMetric);

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
        </div>
      </header>

      {error !== null && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="database" label="Muestras tecnicas" value={loadingOverview ? '...' : formatNumber(overview?.sampleCount ?? 0)} helper={formatRange(overview)} />
        <StatCard icon="dns" label="Recursos detectados" value={loadingOverview ? '...' : formatNumber(overview?.resourceCount ?? 0)} helper="Derivados de metricas reales" />
        <StatCard icon="monitoring" label="Metricas disponibles" value={loadingOverview ? '...' : formatNumber(overview?.metricCount ?? 0)} helper={selectedMetricMeta?.metricName ?? 'Sin metrica seleccionada'} />
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

function StatCard({ icon, label, value, helper }: {
  readonly icon: string;
  readonly label: string;
  readonly value: string;
  readonly helper: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="material-symbols-outlined text-tak-yellow">{icon}</span>
        <span className="h-2 w-2 rounded-full bg-tak-yellow" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-500">{helper}</p>
    </div>
  );
}

function SelectField({ label, value, onChange, children }: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-tak-yellow"
      >
        {children}
      </select>
    </label>
  );
}

function KpiCard({ kpi }: { readonly kpi: TechnicalMetricKpi }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white">{kpi.label}</p>
        <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-black text-tak-yellow">
          {kpi.sampleCount}
        </span>
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[
            { name: 'Min', value: kpi.minimum },
            { name: 'Prom', value: kpi.average },
            { name: 'Pico', value: kpi.maximum },
            { name: 'Ult', value: kpi.latest },
          ]}>
            <Area type="monotone" dataKey="value" stroke="#FACC15" fill="#FACC15" fillOpacity={0.16} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MiniMetric label="Promedio" value={formatMetricValue(kpi.average, kpi.unit)} />
        <MiniMetric label="Pico" value={formatMetricValue(kpi.maximum, kpi.unit)} />
        <MiniMetric label="Ultimo" value={formatMetricValue(kpi.latest, kpi.unit)} />
        <MiniMetric label="Actualizado" value={formatShortDate(kpi.latestSampledAt)} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function OpportunityCard({ opportunity }: { readonly opportunity: TechnicalMetricOpportunity }) {
  return (
    <div className={`rounded-2xl border p-4 ${severityStyles[opportunity.severity]}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-black text-white">{opportunity.title}</p>
        <span className="rounded bg-zinc-950/70 px-2 py-1 text-[10px] font-black">{opportunity.severity}</span>
      </div>
      <p className="text-xs leading-relaxed text-zinc-300">{opportunity.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
        {opportunity.value !== undefined && (
          <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-300">
            {formatMetricValue(opportunity.value, opportunity.unit)}
          </span>
        )}
        {opportunity.cost !== undefined && (
          <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-tak-yellow">
            {formatCurrency(opportunity.cost, opportunity.currency ?? 'USD')}
          </span>
        )}
      </div>
    </div>
  );
}

function ResourceCostPanel({ overview }: { readonly overview: TechnicalMetricsOverview | null }) {
  const resources = overview?.resources ?? [];

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <h3 className="text-lg font-bold text-white">Recursos y costo asociado</h3>
        <p className="text-xs text-zinc-500">El costo solo se muestra cuando hay relacion exacta por recurso.</p>
      </div>
      <div className="max-h-[360px] overflow-auto custom-scrollbar">
        {resources.length === 0 ? (
          <EmptyState text="Sin recursos con metricas tecnicas" />
        ) : resources.map((resource) => (
          <div key={resource.externalResourceId} className="border-b border-zinc-800 p-4 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{resource.name ?? shortResource(resource.externalResourceId)}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{resource.provider} · {resource.serviceName ?? 'Servicio no normalizado'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-tak-yellow">
                  {resource.cost === undefined ? '-' : formatCurrency(resource.cost.totalCost, resource.cost.currency)}
                </p>
                <p className="text-[10px] font-black uppercase text-zinc-500">
                  {resource.cost?.matchLevel ?? 'NONE'}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {resource.metricNames.join(' · ')}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SamplesTable({ samples, loading }: {
  readonly samples: readonly ResourceMetricSampleItem[];
  readonly loading: boolean;
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <h3 className="text-lg font-bold text-white">Muestras recientes</h3>
        <p className="text-xs text-zinc-500">Detalle crudo para auditoria rapida.</p>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="bg-zinc-950/50">
              <Th>Momento</Th>
              <Th>Recurso</Th>
              <Th>Metrica</Th>
              <Th>Valor</Th>
              <Th>Granularidad</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow colSpan={5} text="Cargando muestras..." />
            ) : samples.length === 0 ? (
              <EmptyRow colSpan={5} text="Sin muestras tecnicas registradas" />
            ) : samples.map((sample) => (
              <tr key={sample.id} className="border-b border-zinc-800/50 transition-colors last:border-0 hover:bg-zinc-800/50">
                <td className="p-4 text-xs font-medium text-zinc-400">{formatDateTime(sample.sampledAt)}</td>
                <td className="p-4 text-xs text-zinc-300">{shortResource(sample.externalResourceId)}</td>
                <td className="p-4 text-sm font-bold text-white">{sample.metricName}</td>
                <td className="p-4 text-sm text-zinc-200">{formatMetricValue(sample.value, sample.metricUnit)}</td>
                <td className="p-4 text-xs text-zinc-400">{formatGranularity(sample.granularitySeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { readonly children: ReactNode }) {
  return (
    <th className="border-b border-zinc-800 p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
      {children}
    </th>
  );
}

function EmptyRow({ colSpan, text }: { readonly colSpan: number; readonly text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-6 text-center text-sm font-bold text-zinc-500">{text}</td>
    </tr>
  );
}

function EmptyState({ text }: { readonly text: string }) {
  return (
    <div className="flex h-full min-h-[160px] w-full items-center justify-center p-6 text-center text-sm font-bold text-zinc-500">
      {text}
    </div>
  );
}

function buildRangeParams(
  range: RangeFilter,
  coverage: TechnicalMetricCoverage | null,
): {
  readonly startDate?: string;
  readonly endDate?: string;
} {
  if (range === 'available') {
    return coverage?.minSampledAt !== undefined && coverage.maxSampledAt !== undefined
      ? { startDate: coverage.minSampledAt, endDate: coverage.maxSampledAt }
      : {};
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  const hours = range === '24h' ? 24 : range === '7d' ? 24 * 7 : 24 * 30;
  startDate.setUTCHours(startDate.getUTCHours() - hours);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function resolveRequestBucket(bucket: TechnicalMetricBucket, range: RangeFilter): TechnicalMetricBucket {
  if (bucket !== 'auto' || range === 'available') {
    return bucket;
  }

  return range === '24h' ? 'hour' : 'day';
}
function getSeriesCache(
  cache: Map<string, SeriesCacheEntry>,
  key: string,
): SeriesCacheEntry | null {
  const entry = cache.get(key);
  if (entry === undefined) {
    return null;
  }

  if (Date.now() - entry.createdAt > seriesCacheTtlMs) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function setSeriesCache(
  cache: Map<string, SeriesCacheEntry>,
  key: string,
  entry: SeriesCacheEntry,
): void {
  cache.set(key, entry);

  while (cache.size > maxSeriesCacheEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) {
      return;
    }
    cache.delete(oldestKey);
  }
}

function formatRange(overview: TechnicalMetricsOverview | null): string {
  if (overview?.minSampledAt === undefined || overview.maxSampledAt === undefined) {
    return 'Sin rango disponible';
  }

  return `${formatShortDate(overview.minSampledAt)} - ${formatShortDate(overview.maxSampledAt)}`;
}

function formatDateTime(value: string | undefined): string {
  if (value === undefined) {
    return 'Sin datos';
  }

  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}

function formatCurrency(value: number, currency: string): string {
  return currencyFormatter.format(value).replace('$', currency === 'USD' ? '$' : `${currency} `);
}

function formatMetricValue(value: number, unit: string | undefined): string {
  const formatted = Math.abs(value) >= 1000000
    ? new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
    : new Intl.NumberFormat('es-CO', { maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);

  return unit === undefined ? formatted : `${formatted} ${unit}`;
}

function formatGranularity(seconds: number): string {
  if (seconds % 3600 === 0) {
    return `${seconds / 3600} h`;
  }

  if (seconds % 60 === 0) {
    return `${seconds / 60} min`;
  }

  return `${seconds} s`;
}

function shortResource(value: string): string {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}
