import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccessToken } from '../../auth/authSession';
import {
  fetchTechnicalMetricsCoverage,
  fetchTechnicalMetricSamples,
  fetchTechnicalMetricSeries,
  fetchTechnicalMetricsOverview,
  type MetricStatistic,
  type ResourceMetricSampleItem,
  type TechnicalMetricBucket,
  type TechnicalMetricCoverage,
  type TechnicalMetricSeriesPoint,
  type TechnicalMetricsOverview,
} from '../../services/api';
import {
  buildRangeParams,
  getSeriesCache,
  resolveRequestBucket,
  seriesPageSize,
  setSeriesCache,
  type DrilldownWindow,
  type MetricGroupFilter,
  type RangeFilter,
  type SeriesCacheEntry,
  type SeriesMeta,
} from './technicalMetricsModel';

export function useTechnicalMetricsController() {
  const token = useAccessToken();
  const [overview, setOverview] = useState<TechnicalMetricsOverview | null>(null);
  const [coverage, setCoverage] = useState<TechnicalMetricCoverage | null>(null);
  const [series, setSeries] = useState<readonly TechnicalMetricSeriesPoint[]>([]);
  const [samples, setSamples] = useState<readonly ResourceMetricSampleItem[]>([]);
  const [selectedResource, setSelectedResource] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState<MetricGroupFilter>('ALL');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [range, setRange] = useState<RangeFilter>('available');
  const [availableRange, setAvailableRange] = useState<{ readonly startDate?: string; readonly endDate?: string }>({});
  const [bucket, setBucket] = useState<TechnicalMetricBucket>('auto');
  const [selectedStatistic, setSelectedStatistic] = useState<MetricStatistic>('MEAN');
  const [drilldownWindow, setDrilldownWindow] = useState<DrilldownWindow | null>(null);
  const [seriesMeta, setSeriesMeta] = useState<SeriesMeta | null>(null);
  const [seriesNextCursor, setSeriesNextCursor] = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingMoreSeries, setLoadingMoreSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seriesCacheRef = useRef(new Map<string, SeriesCacheEntry>());
  const seriesCacheKeyRef = useRef<string | null>(null);
  const seriesRef = useRef<readonly TechnicalMetricSeriesPoint[]>([]);
  const seriesRequestGenerationRef = useRef(0);
  const nextSeriesControllerRef = useRef<AbortController | null>(null);
  const rangeParams = useMemo(
    () => range === 'available' ? availableRange : buildRangeParams(range, null),
    [availableRange, range],
  );

  useEffect(() => {
    seriesCacheRef.current.clear();
    seriesCacheKeyRef.current = null;
    seriesRef.current = [];
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const resourceFilter = selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {};
    const requestRange = range === 'available' ? {} : buildRangeParams(range, null);
    void fetchTechnicalMetricsCoverage(token, { ...requestRange, ...resourceFilter, statistic: selectedStatistic }, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setCoverage(response.coverage);
        if (range === 'available') {
          const nextRange = {
            ...(response.coverage.minSampledAt !== undefined ? { startDate: response.coverage.minSampledAt } : {}),
            ...(response.coverage.maxSampledAt !== undefined ? { endDate: response.coverage.maxSampledAt } : {}),
          };
          setAvailableRange((current) => current.startDate === nextRange.startDate && current.endDate === nextRange.endDate
            ? current
            : nextRange);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la cobertura de metricas.');
      });
    return () => controller.abort();
  }, [range, selectedResource, selectedStatistic, token]);

  useEffect(() => {
    if (range === 'available' && (rangeParams.startDate === undefined || rangeParams.endDate === undefined)) return;
    const controller = new AbortController();
    setLoadingOverview(true);
    setError(null);
    const resourceFilter = selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {};
    void fetchTechnicalMetricsOverview(token, { ...rangeParams, ...resourceFilter, statistic: selectedStatistic }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setOverview(response.overview);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el resumen de metricas.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingOverview(false); });
    return () => controller.abort();
  }, [range, rangeParams, selectedResource, selectedStatistic, token]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchTechnicalMetricSamples(token, 50, { signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setSamples(response.samples); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las muestras recientes.');
      });
    return () => controller.abort();
  }, [token]);

  const metricOptions = useMemo(() => {
    const metrics = overview?.metrics ?? [];
    return selectedGroup === 'ALL' ? metrics : metrics.filter((metric) => metric.group === selectedGroup);
  }, [overview?.metrics, selectedGroup]);

  const activeMetric = useMemo(() => {
    if (selectedMetric !== null && metricOptions.some((metric) => metric.metricName === selectedMetric)) {
      return selectedMetric;
    }
    return metricOptions[0]?.metricName ?? null;
  }, [metricOptions, selectedMetric]);

  const selectedMetricMeta = metricOptions.find((metric) => metric.metricName === activeMetric);
  const statisticOptions = useMemo(
    () => selectedMetricMeta?.availableStatistics ?? ['MEAN' as const],
    [selectedMetricMeta],
  );

  useEffect(() => {
    if (!statisticOptions.includes(selectedStatistic)) {
      setSelectedStatistic(statisticOptions[0] ?? 'MEAN');
    }
  }, [selectedStatistic, statisticOptions]);

  useEffect(() => {
    seriesRequestGenerationRef.current += 1;
    nextSeriesControllerRef.current?.abort();
    nextSeriesControllerRef.current = null;
  }, [activeMetric, bucket, drilldownWindow, range, rangeParams, selectedResource, selectedStatistic, token]);

  const handleDrilldown = useCallback((window: DrilldownWindow) => { setDrilldownWindow(window); }, []);

  const loadNextSeriesPage = useCallback(async (): Promise<void> => {
    if (activeMetric === null || seriesNextCursor === null || loadingMoreSeries) return;

    const requestGeneration = seriesRequestGenerationRef.current;
    const controller = new AbortController();
    nextSeriesControllerRef.current?.abort();
    nextSeriesControllerRef.current = controller;
    setLoadingMoreSeries(true);
    try {
      const requestRange = drilldownWindow ?? rangeParams;
      const effectiveBucket = drilldownWindow === null ? resolveRequestBucket(bucket, range) : 'raw';
      const response = await fetchTechnicalMetricSeries(token, {
        ...requestRange,
        metricNames: [activeMetric],
        bucket: effectiveBucket,
        pageSize: seriesPageSize,
        statistic: selectedStatistic,
        cursor: seriesNextCursor,
        ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
      }, { signal: controller.signal });

      if (requestGeneration !== seriesRequestGenerationRef.current || controller.signal.aborted) return;
      const mergedSeries = [...seriesRef.current, ...response.series];
      const mergedMeta = seriesMeta === null ? toSeriesMeta(response) : {
        ...seriesMeta,
        hasMore: response.meta.hasMore,
        nextCursor: response.meta.nextCursor,
        returnedPoints: seriesMeta.returnedPoints + response.series.length,
        totalSamples: seriesMeta.totalSamples || response.meta.totalSamples,
        queryMs: seriesMeta.queryMs + response.meta.queryMs,
      };
      seriesRef.current = mergedSeries;
      setSeries(mergedSeries);
      setSeriesMeta(mergedMeta);
      setSeriesNextCursor(response.meta.nextCursor ?? null);
      const cacheKey = seriesCacheKeyRef.current;
      if (cacheKey !== null) {
        setSeriesCache(seriesCacheRef.current, cacheKey, {
          createdAt: Date.now(),
          series: mergedSeries,
          meta: mergedMeta,
        });
      }
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la siguiente pagina de metricas.');
    } finally {
      if (requestGeneration === seriesRequestGenerationRef.current) setLoadingMoreSeries(false);
    }
  }, [activeMetric, bucket, drilldownWindow, loadingMoreSeries, range, rangeParams, selectedResource, selectedStatistic, seriesMeta, seriesNextCursor, token]);

  useEffect(() => {
    if (activeMetric === null) return;
    if (range === 'available' && (rangeParams.startDate === undefined || rangeParams.endDate === undefined)) return;

    let active = true;
    const controller = new AbortController();
    const requestRange = drilldownWindow ?? rangeParams;
    const effectiveBucket = drilldownWindow === null ? resolveRequestBucket(bucket, range) : 'raw';
    const cacheKey = JSON.stringify({ activeMetric, bucket: effectiveBucket, requestRange, selectedResource, selectedStatistic });
    seriesCacheKeyRef.current = cacheKey;
    const cachedSeries = getSeriesCache(seriesCacheRef.current, cacheKey);
    if (cachedSeries !== null) {
      seriesRef.current = cachedSeries.series;
      setSeries(cachedSeries.series);
      setSeriesMeta(cachedSeries.meta);
      setSeriesNextCursor(cachedSeries.meta.nextCursor ?? null);
      setLoadingSeries(false);
      return;
    }

    setLoadingSeries(true);
    setSeriesNextCursor(null);

    void fetchTechnicalMetricSeries(token, {
      ...requestRange,
      metricNames: [activeMetric],
      bucket: effectiveBucket,
      pageSize: seriesPageSize,
      statistic: selectedStatistic,
      ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
    }, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        const meta = toSeriesMeta(response);
        seriesRef.current = response.series;
        setSeries(response.series);
        setSeriesMeta(meta);
        setSeriesNextCursor(response.meta.nextCursor ?? null);
        setSeriesCache(seriesCacheRef.current, cacheKey, { createdAt: Date.now(), series: response.series, meta });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la serie de metricas.');
      })
      .finally(() => { if (active) setLoadingSeries(false); });

    return () => { active = false; controller.abort(); };
  }, [activeMetric, bucket, drilldownWindow, range, rangeParams, selectedResource, selectedStatistic, token]);
  const seriesUnavailable = range === 'available' && (rangeParams.startDate === undefined || rangeParams.endDate === undefined);
  const filteredKpis = useMemo(() => {
    const kpis = overview?.kpis ?? [];
    return selectedGroup === 'ALL' ? kpis : kpis.filter((kpi) => kpi.group === selectedGroup);
  }, [overview?.kpis, selectedGroup]);

  return {
    overview, coverage, samples, selectedResource, selectedGroup, range, bucket, selectedStatistic, statisticOptions, drilldownWindow,
    loadingOverview, loadingMoreSeries, error, metricOptions, activeMetric, selectedMetricMeta, filteredKpis,
    visibleSeries: seriesUnavailable ? [] : series,
    visibleSeriesMeta: seriesUnavailable ? null : seriesMeta,
    visibleLoadingSeries: seriesUnavailable ? false : loadingSeries,
    topResourceCost: overview?.resources.find((resource) => resource.cost !== undefined)?.cost,
    selectedCoverageMetric: coverage?.metrics.find((metric) => metric.metricName === activeMetric),
    setSelectedResource, setSelectedGroup, setSelectedMetric, setRange, setBucket, setSelectedStatistic, setDrilldownWindow,
    handleDrilldown, loadNextSeriesPage,
  };
}

function toSeriesMeta(response: Awaited<ReturnType<typeof fetchTechnicalMetricSeries>>): SeriesMeta {
  return {
    hasMore: response.meta.hasMore,
    nextCursor: response.meta.nextCursor,
    returnedPoints: response.series.length,
    totalSamples: response.meta.totalSamples,
    queryMs: response.meta.queryMs,
    bucket: response.meta.bucket,
    statistic: response.meta.statistic,
  };
}
