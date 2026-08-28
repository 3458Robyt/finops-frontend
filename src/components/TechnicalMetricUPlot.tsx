import { useEffect, useMemo, useRef } from 'react';
import uPlot, { type AlignedData, type Options } from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { TechnicalMetricSeriesPoint } from '../services/api';

interface TechnicalMetricUPlotProps {
  readonly points: readonly TechnicalMetricSeriesPoint[];
  readonly unit?: string;
  readonly statistic?: string;
  readonly resourceLabels?: ReadonlyMap<string, string>;
  readonly loading: boolean;
  readonly separateResources?: boolean;
  readonly onSelectRange: (range: { readonly startDate: string; readonly endDate: string }) => void;
}

export function TechnicalMetricUPlot({
  points,
  unit,
  statistic,
  resourceLabels,
  loading,
  separateResources = false,
  onSelectRange,
}: TechnicalMetricUPlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const selectTimerRef = useRef<number | null>(null);
  const onSelectRangeRef = useRef(onSelectRange);
  const chart = useMemo(
    () => toUPlotChart(points, separateResources, unit, statistic, resourceLabels),
    [points, separateResources, unit, statistic, resourceLabels],
  );
  const data = chart.data;
  const dataRef = useRef<AlignedData>(data);
  const seriesRef = useRef(chart.series);

  useEffect(() => {
    onSelectRangeRef.current = onSelectRange;
  }, [onSelectRange]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    seriesRef.current = chart.series;
  }, [chart.series]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const buildOptions = (): Options => ({
      width: Math.max(320, container.clientWidth),
      height: Math.max(280, container.clientHeight),
      cursor: {
        drag: {
          x: true,
          y: false,
          setScale: false,
        },
      },
      scales: {
        x: { time: true },
      },
      axes: [
        {
          stroke: '#a1a1aa',
          grid: { stroke: '#27272a', width: 1 },
        },
        {
          stroke: '#a1a1aa',
          grid: { stroke: '#27272a', width: 1 },
          values: (_u, values) => values.map((value) => formatAxisValue(value, unit)),
        },
      ],
      series: seriesRef.current,
      hooks: {
        setSelect: [
          (plot) => {
            if (selectTimerRef.current !== null) {
              window.clearTimeout(selectTimerRef.current);
            }

            selectTimerRef.current = window.setTimeout(() => {
              const selection = plot.select;
              if (selection.width < 8) {
                return;
              }

              const start = plot.posToVal(selection.left, 'x');
              const end = plot.posToVal(selection.left + selection.width, 'x');
              if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                return;
              }

              onSelectRangeRef.current({
                startDate: new Date(start * 1000).toISOString(),
                endDate: new Date(end * 1000).toISOString(),
              });
              plot.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
            }, 250);
          },
        ],
      },
    });

    const plot = new uPlot(buildOptions(), dataRef.current, container);
    plotRef.current = plot;

    const observer = new ResizeObserver(() => {
      plot.setSize({
        width: Math.max(320, container.clientWidth),
        height: Math.max(280, container.clientHeight),
      });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (selectTimerRef.current !== null) {
        window.clearTimeout(selectTimerRef.current);
      }
      plot.destroy();
      plotRef.current = null;
    };
  }, [chart.seriesSignature, unit]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return (
    <div className="relative h-full min-h-[280px] w-full">
      <div ref={containerRef} className="h-full min-h-[280px] w-full [&_.uplot]:font-sans [&_.u-legend]:!bg-zinc-950 [&_.u-legend]:!text-zinc-200 [&_.u-legend]:!border-zinc-800" />
      {loading && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tak-yellow">
          Cargando
        </div>
      )}
      {points.length === 0 && !loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-500">
          Sin datos para los filtros seleccionados
        </div>
      )}
    </div>
  );
}

function toUPlotChart(
  points: readonly TechnicalMetricSeriesPoint[],
  separateResources: boolean,
  unit: string | undefined,
  statistic: string | undefined,
  resourceLabels: ReadonlyMap<string, string> | undefined,
): {
  readonly data: AlignedData;
  readonly series: NonNullable<Options['series']>;
  readonly seriesSignature: string;
} {
  if (!separateResources) {
    const showEnvelope = shouldShowEnvelope(points, statistic);
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
        seriesOption(formatStatisticLabel(statistic), '#FACC15', unit, 2),
        ...(showEnvelope ? [
          seriesOption('Mínimo del intervalo', '#22c55e', unit, 1, [4, 4]),
          seriesOption('Máximo del intervalo', '#38bdf8', unit, 1, [4, 4]),
        ] : []),
      ],
      seriesSignature: `aggregate:${statistic ?? 'MEAN'}:${showEnvelope ? 'envelope' : 'native'}`,
    };
  }

  const streamIds = [...new Set(points.map(streamIdentity))].sort();
  const timestamps = [...new Set(points.map((point) => new Date(point.bucketStart).getTime() / 1000))].sort((a, b) => a - b);
  const valuesByStream = new Map<string, Map<number, number>>();
  for (const point of points) {
    const streamId = streamIdentity(point);
    const streamValues = valuesByStream.get(streamId) ?? new Map<number, number>();
    streamValues.set(new Date(point.bucketStart).getTime() / 1000, point.value);
    valuesByStream.set(streamId, streamValues);
  }

  return {
    data: [
      timestamps,
      ...streamIds.map((streamId) => timestamps.map((timestamp) => valuesByStream.get(streamId)?.get(timestamp) ?? null)),
    ] as AlignedData,
    series: [
      {},
      ...streamIds.map((streamId, index) => seriesOption(
        streamLabel(streamId, points, resourceLabels),
        resourceColor(index),
        unit,
        2,
      )),
    ],
    seriesSignature: streamIds.join('|'),
  };
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
  streamId: string,
  points: readonly TechnicalMetricSeriesPoint[],
  resourceLabels: ReadonlyMap<string, string> | undefined,
): string {
  const point = points.find((candidate) => streamIdentity(candidate) === streamId);
  if (point === undefined) return 'Flujo';
  const resourceLabel = resourceLabels?.get(point.externalResourceId) ?? shortResource(point.externalResourceId);
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

function formatMetricValue(value: number | null, unit: string | undefined): string {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }

  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);

  return unit === undefined ? formatted : `${formatted} ${unit}`;
}

function formatAxisValue(value: number, unit: string | undefined): string {
  if (unit === '%') {
    return `${Math.round(value)}%`;
  }

  return Math.abs(value) >= 1000
    ? new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
}

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
