import { useEffect, useMemo, useRef } from 'react';
import uPlot, { type AlignedData, type Options } from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface CostHistoryPoint {
  readonly timestamp: string;
  readonly asIs: number | null;
  readonly toBe: number | null;
}

export function CostHistoryUPlot({ points, currency }: { readonly points: readonly CostHistoryPoint[]; readonly currency: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const chart = useMemo(() => toChart(points), [points]);
  const dataRef = useRef<AlignedData>(chart.data);

  useEffect(() => {
    dataRef.current = chart.data;
  }, [chart.data]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const plot = new uPlot({
      width: Math.max(320, container.clientWidth),
      height: Math.max(280, container.clientHeight),
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
      series: [
        {},
        { label: `Costo AS-IS (${currency})`, stroke: '#FACC15', width: 3, value: (_u, value) => formatMoney(value, currency) },
      ],
    } satisfies Options, dataRef.current, container);
    plotRef.current = plot;

    const observer = new ResizeObserver(() => {
      plot.setSize({ width: Math.max(320, container.clientWidth), height: Math.max(280, container.clientHeight) });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
  }, [chart.labels, currency, points.length]);

  useEffect(() => {
    plotRef.current?.setData(chart.data);
  }, [chart.data]);

  return <div ref={containerRef} className="h-full w-full [&_.uplot]:font-sans [&_.u-legend]:!bg-zinc-950 [&_.u-legend]:!text-zinc-200 [&_.u-legend]:!border-zinc-800" />;
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
