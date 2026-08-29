import uPlot, { type AlignedData, type Options } from 'uplot';
import type { TechnicalMetricSeriesPoint } from '../services/api';
import type { TechnicalMetricLegendItem } from './TechnicalMetricLegend';

export interface TechnicalMetricChartModel {
  readonly data: AlignedData;
  readonly series: NonNullable<Options['series']>;
  readonly seriesSignature: string;
  readonly legendItems: readonly TechnicalMetricLegendItem[];
}

export function toUPlotChart(
  points: readonly TechnicalMetricSeriesPoint[],
  separateResources: boolean,
  unit: string | undefined,
  statistic: string | undefined,
  resourceLabels: ReadonlyMap<string, string> | undefined,
): TechnicalMetricChartModel {
  if (!separateResources) {
    const showEnvelope = shouldShowEnvelope(points, statistic);
    const valueColor = '#FACC15';
    const envelopeItems = showEnvelope ? [
      { key: 'minimum', label: 'Mínimo del intervalo', fullLabel: 'Mínimo del intervalo', color: '#22c55e' },
      { key: 'maximum', label: 'Máximo del intervalo', fullLabel: 'Máximo del intervalo', color: '#38bdf8' },
    ] : [];
    const statisticLabel = formatStatisticLabel(statistic);
    return {
      data: [
        points.map((point) => new Date(point.bucketStart).getTime() / 1000),
        points.map((point) => point.value),
        ...(showEnvelope ? [
          points.map((point) => point.min),
          points.map((point) => point.max),
        ] : []),
      ] as AlignedData,
      series: [
        {},
        seriesOption(statisticLabel, valueColor, unit, 2),
        ...(showEnvelope ? [
          seriesOption('Mínimo del intervalo', '#22c55e', unit, 1, [4, 4]),
          seriesOption('Máximo del intervalo', '#38bdf8', unit, 1, [4, 4]),
        ] : []),
      ],
      seriesSignature: `aggregate:${statistic ?? 'MEAN'}:${showEnvelope ? 'envelope' : 'native'}`,
      legendItems: [
        { key: 'value', label: statisticLabel, fullLabel: statisticLabel, color: valueColor },
        ...envelopeItems,
      ],
    };
  }

  const streams = new Map<string, { readonly point: TechnicalMetricSeriesPoint; readonly values: Map<number, number> }>();
  const timestamps = [...new Set(points.map((point) => new Date(point.bucketStart).getTime() / 1000))].sort((a, b) => a - b);
  for (const point of points) {
    const streamId = streamIdentity(point);
    const stream = streams.get(streamId);
    const streamValues = stream?.values ?? new Map<number, number>();
    streamValues.set(new Date(point.bucketStart).getTime() / 1000, point.value);
    if (stream === undefined) streams.set(streamId, { point, values: streamValues });
  }
  const streamIds = [...streams.keys()].sort();
  const labelsByStream = new Map(streamIds.map((streamId) => {
    const point = streams.get(streamId)?.point;
    return [streamId, point === undefined ? 'Flujo' : streamLabel(point, resourceLabels)] as const;
  }));

  const legendItems = streamIds.map((streamId, index) => {
    const point = streams.get(streamId)?.point;
    const label = labelsByStream.get(streamId) ?? 'Flujo';
    return {
      key: streamId,
      label,
      fullLabel: point === undefined ? label : `${label}\nID: ${point.externalResourceId}`,
      color: resourceColor(index),
    } satisfies TechnicalMetricLegendItem;
  });

  return {
    data: [
      timestamps,
      ...streamIds.map((streamId) => timestamps.map((timestamp) => streams.get(streamId)?.values.get(timestamp) ?? null)),
    ] as AlignedData,
    series: [
      {},
      ...streamIds.map((streamId, index) => seriesOption(
        labelsByStream.get(streamId) ?? 'Flujo',
        resourceColor(index),
        unit,
        2,
      )),
    ],
    seriesSignature: legendItems.map((item) => `${item.key}:${item.label}`).join('|'),
    legendItems,
  };
}

export function formatMetricValue(value: number | null, unit: string | undefined): string {
  if (value === null || !Number.isFinite(value)) return '-';

  const formatterKey = Math.abs(value) >= 100 ? 'integer' : 'decimal';
  let formatter = metricNumberFormatters.get(formatterKey);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: formatterKey === 'integer' ? 0 : 2,
    });
    metricNumberFormatters.set(formatterKey, formatter);
  }
  const formatted = formatter.format(value);

  return unit === undefined ? formatted : `${formatted} ${unit}`;
}

export function formatAxisValue(value: number, unit: string | undefined): string {
  if (unit === '%') return `${Math.round(value)}%`;

  const formatterKey = Math.abs(value) >= 1000 ? 'compact' : 'decimal';
  let formatter = axisNumberFormatters.get(formatterKey);
  if (formatter === undefined) {
    formatter = formatterKey === 'compact'
      ? new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 })
      : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
    axisNumberFormatters.set(formatterKey, formatter);
  }
  return formatter.format(value);
}

function shouldShowEnvelope(points: readonly TechnicalMetricSeriesPoint[], statistic: string | undefined): boolean {
  if (points.length === 0 || statistic === 'MIN' || statistic === 'MAX' || statistic === 'LATEST' || statistic === 'COUNT') {
    return false;
  }

  return points.some((point) => point.sampleCount > 1 && point.min !== point.max);
}

function streamIdentity(point: TechnicalMetricSeriesPoint): string {
  return [
    point.externalResourceId,
    point.cloudResourceId ?? '',
    point.providerNamespace ?? '',
    point.regionId ?? '',
    point.dimensionsHash ?? '',
    point.sourceGranularitiesSeconds.join(','),
  ].join('\u0000');
}

function streamLabel(
  point: TechnicalMetricSeriesPoint,
  resourceLabels: ReadonlyMap<string, string> | undefined,
): string {
  const resourceLabel = resourceLabels?.get(point.cloudResourceId ?? '')
    ?? resourceLabels?.get(point.externalResourceId)
    ?? shortResource(point.externalResourceId);
  const suffix = [
    point.providerNamespace,
    point.regionId,
    point.dimensionsHash === undefined ? undefined : `dim ${point.dimensionsHash.slice(0, 8)}`,
  ].filter((value): value is string => value !== undefined && value !== '').join(' · ');
  return suffix === '' ? resourceLabel : `${resourceLabel} · ${suffix}`;
}

function seriesOption(label: string, stroke: string, unit: string | undefined, width: number, dash?: number[]) {
  return {
    label,
    stroke,
    width,
    ...(dash === undefined ? {} : { dash }),
    value: (_u: uPlot, value: number | null) => formatMetricValue(value, unit),
  };
}

function shortResource(value: string): string {
  return value.length > 28 ? `${value.slice(0, 25)}...` : value;
}

function resourceColor(index: number): string {
  return ['#FACC15', '#38bdf8', '#22c55e', '#f472b6', '#a78bfa', '#fb923c'][index % 6] ?? '#FACC15';
}

const metricNumberFormatters = new Map<string, Intl.NumberFormat>();
const axisNumberFormatters = new Map<string, Intl.NumberFormat>();

function formatStatisticLabel(statistic: string | undefined): string {
  const labels: Record<string, string> = {
    MEAN: 'Promedio',
    MIN: 'Mínimo',
    MAX: 'Máximo',
    P50: 'P50',
    P90: 'P90',
    P95: 'P95',
    P99: 'P99',
    SUM: 'Suma',
    COUNT: 'Conteo',
    RATE: 'Tasa',
    LATEST: 'Último valor',
  };
  return labels[statistic ?? 'MEAN'] ?? statistic ?? 'Valor';
}
