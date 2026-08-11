import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccessToken } from '../../auth/authSession';
import {
  fetchTechnicalMetricsCoverage,
  fetchTechnicalMetricSamples,
  fetchTechnicalMetricSeries,
  fetchTechnicalMetricsOverview,
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
  const rangeParams = useMemo(() => buildRangeParams(range, coverage), [range, coverage]);

  useEffect(() => { seriesCacheRef.current.clear(); }, [token]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoadingOverview(true);
        setError(null);
      }
    });

    const resourceFilter = selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {};
    Promise.all([
      fetchTechnicalMetricsOverview(token, { ...rangeParams, ...resourceFilter }),
      fetchTechnicalMetricsCoverage(token, { ...rangeParams, ...resourceFilter }),
      fetchTechnicalMetricSamples(token, 50),
    ])
      .then(([overviewResponse, coverageResponse, samplesResponse]) => {
        if (!active) return;
        setOverview(overviewResponse.overview);
        setCoverage(coverageResponse.coverage);
        setSamples(samplesResponse.samples);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setOverview(null);
        setCoverage(null);
        setSeries([]);
        setSamples([]);
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las metricas tecnicas.');
      })
      .finally(() => { if (active) setLoadingOverview(false); });

    return () => { active = false; };
  }, [rangeParams, selectedResource, token]);

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

  useEffect(() => {
    seriesRequestGenerationRef.current += 1;
    nextSeriesControllerRef.current?.abort();
    nextSeriesControllerRef.current = null;
  }, [activeMetric, bucket, drilldownWindow, range, rangeParams, selectedResource, token]);

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
        cursor: seriesNextCursor,
        ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
      }, { signal: controller.signal });

      if (requestGeneration !== seriesRequestGenerationRef.current || controller.signal.aborted) return;
      setSeries((current) => [...current, ...response.series]);
      setSeriesMeta((current) => current === null ? toSeriesMeta(response) : {
        ...current,
        hasMore: response.meta.hasMore,
        nextCursor: response.meta.nextCursor,
        returnedPoints: current.returnedPoints + response.series.length,
        totalSamples: current.totalSamples || response.meta.totalSamples,
        queryMs: current.queryMs + response.meta.queryMs,
      });
      setSeriesNextCursor(response.meta.nextCursor ?? null);
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la siguiente pagina de metricas.');
    } finally {
      if (requestGeneration === seriesRequestGenerationRef.current) setLoadingMoreSeries(false);
    }
  }, [activeMetric, bucket, drilldownWindow, loadingMoreSeries, range, rangeParams, selectedResource, seriesNextCursor, token]);

  useEffect(() => {
    if (activeMetric === null) return;
    if (range === 'available' && (rangeParams.startDate === undefined || rangeParams.endDate === undefined)) return;

    let active = true;
    const controller = new AbortController();
    const requestRange = drilldownWindow ?? rangeParams;
    const effectiveBucket = drilldownWindow === null ? resolveRequestBucket(bucket, range) : 'raw';
    const cacheKey = JSON.stringify({ activeMetric, bucket: effectiveBucket, requestRange, selectedResource });
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

    void fetchTechnicalMetricSeries(token, {
      ...requestRange,
      metricNames: [activeMetric],
      bucket: effectiveBucket,
      pageSize: seriesPageSize,
      ...(selectedResource !== 'ALL' ? { externalResourceId: selectedResource } : {}),
    }, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        const meta = toSeriesMeta(response);
        setSeries(response.series);
        setSeriesMeta(meta);
        setSeriesNextCursor(response.meta.nextCursor ?? null);
        setSeriesCache(seriesCacheRef.current, cacheKey, { createdAt: Date.now(), series: response.series, meta });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setSeries([]);
        setSeriesMeta(null);
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la serie de metricas.');
      })
      .finally(() => { if (active) setLoadingSeries(false); });

    return () => { active = false; controller.abort(); };
  }, [activeMetric, bucket, drilldownWindow, range, rangeParams, selectedResource, token]);

  const selectedMetricMeta = metricOptions.find((metric) => metric.metricName === activeMetric);
  const seriesUnavailable = range === 'available' && (rangeParams.startDate === undefined || rangeParams.endDate === undefined);
  const filteredKpis = useMemo(() => {
    const kpis = overview?.kpis ?? [];
    return selectedGroup === 'ALL' ? kpis : kpis.filter((kpi) => kpi.group === selectedGroup);
  }, [overview?.kpis, selectedGroup]);

  return {
    overview, coverage, samples, selectedResource, selectedGroup, range, bucket, drilldownWindow,
    loadingOverview, loadingMoreSeries, error, metricOptions, activeMetric, selectedMetricMeta, filteredKpis,
    visibleSeries: seriesUnavailable ? [] : series,
    visibleSeriesMeta: seriesUnavailable ? null : seriesMeta,
    visibleLoadingSeries: seriesUnavailable ? false : loadingSeries,
    topResourceCost: overview?.resources.find((resource) => resource.cost !== undefined)?.cost,
    selectedCoverageMetric: coverage?.metrics.find((metric) => metric.metricName === activeMetric),
    setSelectedResource, setSelectedGroup, setSelectedMetric, setRange, setBucket, setDrilldownWindow,
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
  };
}
