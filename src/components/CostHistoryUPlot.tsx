import { useEffect, useMemo, useRef } from 'react';
import uPlot, { type AlignedData, type Options } from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface CostHistoryPoint {
  readonly name: string;
  readonly asIs: number;
  readonly toBe: number;
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function CostHistoryUPlot({ points }: { readonly points: readonly CostHistoryPoint[] }) {
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
      scales: { x: { range: () => [-0.5, Math.max(0.5, points.length - 0.5)] } },
      axes: [
        {
          stroke: '#a1a1aa',
          grid: { stroke: '#27272a', width: 1 },
          values: (_u, values) => values.map((value) => chart.labels[Math.round(value)] ?? ''),
        },
        {
          stroke: '#a1a1aa',
          grid: { stroke: '#27272a', width: 1 },
          values: (_u, values) => values.map((value) => money.format(value)),
        },
      ],
      series: [
        {},
        { label: 'Current AS-IS', stroke: '#52525b', width: 3, value: (_u, value) => formatMoney(value) },
        { label: 'Opt TO-BE', stroke: '#FACC15', width: 3, value: (_u, value) => formatMoney(value) },
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
  }, [chart.labels, points.length]);

  useEffect(() => {
    plotRef.current?.setData(chart.data);
  }, [chart.data]);

  return <div ref={containerRef} className="h-full w-full [&_.uplot]:font-sans [&_.u-legend]:!bg-zinc-950 [&_.u-legend]:!text-zinc-200 [&_.u-legend]:!border-zinc-800" />;
}

function toChart(points: readonly CostHistoryPoint[]): { readonly data: AlignedData; readonly labels: readonly string[] } {
  return {
    data: [points.map((_point, index) => index), points.map((point) => point.asIs), points.map((point) => point.toBe)],
    labels: points.map((point) => point.name),
  };
}

function formatMoney(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '-' : money.format(value);
}
