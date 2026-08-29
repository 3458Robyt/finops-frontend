import { useEffect, useMemo, useRef } from 'react';
import uPlot, { type AlignedData, type Options } from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface CostHistoryPoint {
  readonly timestamp: string;
  readonly asIs: number | null;
  readonly toBe: number | null;
}

export function CostHistoryUPlot({ points, currency }: { readonly points: readonly CostHistoryPoint[]; readonly currency: string }) {
  const plotContainerRef = useRef<HTMLDivElement | null>(null);
  const legendContainerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const chart = useMemo(() => toChart(points), [points]);
  const dataRef = useRef<AlignedData>(chart.data);

  useEffect(() => {
    dataRef.current = chart.data;
  }, [chart.data]);

  useEffect(() => {
    const container = plotContainerRef.current;
    if (container === null) return;
    const legendContainer = legendContainerRef.current;
    legendContainer?.replaceChildren();

    const plot = new uPlot({
      width: Math.max(320, container.clientWidth),
      height: Math.max(220, container.clientHeight),
      scales: { x: { time: true } },
      axes: [
        {
          stroke: '#a1a1aa',
          grid: { stroke: '#27272a', width: 1 },
          values: (_u, values) => values.map((value) => new Date(value * 1000).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })),
        },
        {
          stroke: '#a1a1aa',
          grid: { stroke: '#27272a', width: 1 },
          values: (_u, values) => values.map((value) => formatMoney(value, currency)),
        },
      ],
      legend: {
        show: true,
        live: true,
        mount: (_self, legendElement) => {
          legendContainer?.appendChild(legendElement);
        },
      },
      series: [
        {},
        { label: `Costo AS-IS (${currency})`, stroke: '#FACC15', width: 3, value: (_u, value) => formatMoney(value, currency) },
      ],
    } satisfies Options, dataRef.current, container);
    plotRef.current = plot;

    const observer = new ResizeObserver(() => {
      plot.setSize({ width: Math.max(320, container.clientWidth), height: Math.max(220, container.clientHeight) });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      plot.destroy();
      legendContainer?.replaceChildren();
      plotRef.current = null;
    };
  }, [chart.labels, currency, points.length]);

  useEffect(() => {
    plotRef.current?.setData(chart.data);
  }, [chart.data]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div ref={plotContainerRef} className="min-h-0 min-w-0 flex-1 [&_.uplot]:font-sans" />
      <div
        ref={legendContainerRef}
        aria-label="Leyenda de costos"
        className="mt-2 min-h-5 shrink-0 overflow-x-auto px-1 text-left text-xs font-medium text-zinc-400 [&_.u-legend]:!mx-0 [&_.u-legend]:!bg-transparent [&_.u-legend]:!font-sans [&_.u-legend]:!text-xs [&_.u-legend]:!text-zinc-400"
      />
    </div>
  );
}

function toChart(points: readonly CostHistoryPoint[]): { readonly data: AlignedData; readonly labels: readonly string[] } {
  return {
    data: [points.map((point) => Math.floor(new Date(point.timestamp).getTime() / 1000)), points.map((point) => point.asIs)],
    labels: points.map((point) => point.timestamp),
  };
}

function formatMoney(value: number | null, currency: string): string {
  return value === null || !Number.isFinite(value) ? '-' : new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}
