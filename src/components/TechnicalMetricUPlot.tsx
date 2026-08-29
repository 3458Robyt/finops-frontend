import { useEffect, useMemo, useRef } from 'react';
import uPlot, { type AlignedData, type Options } from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { TechnicalMetricSeriesPoint } from '../services/api';
import { TechnicalMetricLegend } from './TechnicalMetricLegend';
import { formatAxisValue, toUPlotChart } from './technicalMetricChartModel';
import { hideTechnicalMetricTooltip, updateTechnicalMetricTooltip } from './technicalMetricTooltip';

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
  const tooltipRef = useRef<HTMLDivElement | null>(null);
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
      legend: { show: false },
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
        setCursor: [
          (plot) => updateTechnicalMetricTooltip(plot, tooltipRef.current, unit),
        ],
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
    hideTechnicalMetricTooltip(tooltipRef.current);
  }, [data]);

  return (
    <div data-testid="technical-metric-chart" className="relative w-full">
      <div data-testid="technical-metric-plot" ref={containerRef} className="h-[300px] min-h-[280px] w-full sm:h-[340px] lg:h-[360px] [&_.uplot]:font-sans" />
      <div
        ref={tooltipRef}
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute z-10 hidden max-w-[220px] rounded-xl border border-zinc-700 bg-zinc-950/95 px-3 py-2 text-[11px] shadow-xl"
      />
      {loading && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tak-yellow">
          Cargando
        </div>
      )}
      {points.length === 0 && !loading && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[300px] items-center justify-center text-sm font-bold text-zinc-500 sm:h-[340px] lg:h-[360px]">
          Sin datos para los filtros seleccionados
        </div>
      )}
      <TechnicalMetricLegend items={chart.legendItems} />
    </div>
  );
}
