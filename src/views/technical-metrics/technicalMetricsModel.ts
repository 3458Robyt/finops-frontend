import type {
  TechnicalMetricBucket,
  TechnicalMetricCoverage,
  TechnicalMetricGroup,
  TechnicalMetricSeriesPoint,
  MetricStatistic,
} from '../../services/api';

export type MetricGroupFilter = TechnicalMetricGroup | 'ALL';
export type RangeFilter = 'available' | '24h' | '7d' | '30d' | '90d';

export interface SeriesMeta {
  readonly hasMore: boolean;
  readonly nextCursor?: string;
  readonly returnedPoints: number;
  readonly totalSamples: number;
  readonly queryMs: number;
  readonly bucket: Exclude<TechnicalMetricBucket, 'auto'>;
  readonly statistic: MetricStatistic;
}

export interface SeriesCacheEntry {
  readonly createdAt: number;
  readonly series: readonly TechnicalMetricSeriesPoint[];
  readonly meta: SeriesMeta;
}

export interface DrilldownWindow {
  readonly startDate: string;
  readonly endDate: string;
}

export const seriesPageSize = 1000;
// Keep the browser cache bounded: metric series can be large, but revisiting a
// recently inspected metric should not trigger another expensive query.
const maxSeriesCacheEntries = 12;
const seriesCacheTtlMs = 5 * 60 * 1000;

export function buildRangeParams(
  range: RangeFilter,
  coverage: TechnicalMetricCoverage | null,
): { readonly startDate?: string; readonly endDate?: string } {
  if (range === 'available') {
    return coverage?.minSampledAt !== undefined && coverage.maxSampledAt !== undefined
      ? { startDate: coverage.minSampledAt, endDate: coverage.maxSampledAt }
      : {};
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  const hours = range === '24h' ? 24 : range === '7d' ? 24 * 7 : range === '30d' ? 24 * 30 : 24 * 90;
  startDate.setUTCHours(startDate.getUTCHours() - hours);

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

export function resolveRequestBucket(
  bucket: TechnicalMetricBucket,
  range: RangeFilter,
): TechnicalMetricBucket {
  if (bucket !== 'auto') return bucket;
  if (range === '24h') return '30m';
  if (range === '7d' || range === '30d') return 'hour';
  return 'day';
}

export function getSeriesCache(
  cache: Map<string, SeriesCacheEntry>,
  key: string,
): SeriesCacheEntry | null {
  const entry = cache.get(key);
  if (entry === undefined) return null;
  if (Date.now() - entry.createdAt > seriesCacheTtlMs) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

export function setSeriesCache(
  cache: Map<string, SeriesCacheEntry>,
  key: string,
  entry: SeriesCacheEntry,
): void {
  cache.set(key, entry);
  while (cache.size > maxSeriesCacheEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) return;
    cache.delete(oldestKey);
  }
}
