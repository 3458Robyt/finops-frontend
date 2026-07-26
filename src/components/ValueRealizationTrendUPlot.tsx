import { useEffect, useMemo, useRef } from 'react';
import uPlot, { type AlignedData } from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ValueRealizationTrendPoint } from '../services/api';

export default function ValueRealizationTrendUPlot({ points, currency: selectedCurrency }: { readonly points: readonly ValueRealizationTrendPoint[]; readonly currency?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const chart = useMemo(() => {
    const ordered = [...points].sort((left, right) => `${left.period}-${left.currency}`.localeCompare(`${right.period}-${right.currency}`));
    const periods = [...new Set(ordered.map((point) => point.period))];
    const currency = selectedCurrency ?? ordered[0]?.currency;
    const byPeriod = new Map(ordered.filter((point) => point.currency === currency).map((point) => [point.period, point]));
    return {
      labels: periods,
      data: [periods.map((_period, index) => index), periods.map((period) => byPeriod.get(period)?.observedSavings ?? 0), periods.map((period) => byPeriod.get(period)?.verifiedMonthlySavings ?? 0), periods.map((period) => byPeriod.get(period)?.costIncreaseMonthlyAmount ?? 0)] as AlignedData,
      currency: currency ?? 'USD',
    };
  }, [points, selectedCurrency]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null || chart.labels.length === 0) return;
    const plot = new uPlot({
      width: Math.max(320, container.clientWidth),
      height: 280,
      scales: { x: { range: () => [-0.5, Math.max(0.5, chart.labels.length - 0.5)] } },
      axes: [
        { stroke: '#a1a1aa', grid: { stroke: '#27272a', width: 1 }, values: (_u, values) => values.map((value) => chart.labels[Math.round(value)] ?? '') },
        { stroke: '#a1a1aa', grid: { stroke: '#27272a', width: 1 }, values: (_u, values) => values.map((value) => `${chart.currency} ${value.toFixed(0)}`) },
      ],
      series: [
        {},
        { label: 'Ahorro observado en ventana', stroke: '#38bdf8', width: 2 },
        { label: 'Run-rate mensual verificado', stroke: '#FACC15', width: 3, fill: 'rgba(250,204,21,.12)' },
        { label: 'Aumento mensual de costo', stroke: '#fb7185', width: 2 },
      ],
    }, chart.data, container);
    plotRef.current = plot;
    const observer = new ResizeObserver(() => plot.setSize({ width: Math.max(320, container.clientWidth), height: 280 }));
    observer.observe(container);
    return () => { observer.disconnect(); plot.destroy(); plotRef.current = null; };
  }, [chart]);

  useEffect(() => { if (plotRef.current !== null && chart.labels.length > 0) plotRef.current.setData(chart.data); }, [chart]);
  return <div ref={containerRef} className="min-h-[280px] w-full [&_.uplot]:font-sans [&_.u-legend]:!bg-zinc-950 [&_.u-legend]:!text-zinc-200 [&_.u-legend]:!border-zinc-800" />;
}
