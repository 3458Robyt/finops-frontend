import uPlot from 'uplot';
import { formatMetricValue } from './technicalMetricChartModel';

export function updateTechnicalMetricTooltip(
  plot: uPlot,
  element: HTMLDivElement | null,
  unit: string | undefined,
): void {
  if (element === null) return;
  const index = plot.cursor.idx;
  const timestamp = index === null || index === undefined ? undefined : plot.data[0]?.[index];
  if (index === null || index === undefined || typeof timestamp !== 'number') {
    hideTechnicalMetricTooltip(element);
    return;
  }
  if (element.dataset.cursorIndex === String(index)) return;
  element.dataset.cursorIndex = String(index);

  const rows: Array<{ readonly label: string; readonly value: string }> = [];
  for (let seriesIndex = 1; seriesIndex < plot.series.length; seriesIndex += 1) {
    const value = plot.data[seriesIndex]?.[index];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const seriesLabel = plot.series[seriesIndex]?.label;
      rows.push({
        label: typeof seriesLabel === 'string' ? seriesLabel : 'Valor',
        value: formatMetricValue(value, unit),
      });
    }
  }
  if (rows.length === 0) {
    hideTechnicalMetricTooltip(element);
    return;
  }

  element.replaceChildren();
  const title = document.createElement('p');
  title.className = 'mb-1 font-black text-white';
  title.textContent = tooltipDateFormatter.format(new Date(timestamp * 1000));
  element.append(title);
  for (const row of rows) {
    const line = document.createElement('p');
    line.className = 'truncate text-zinc-300';
    line.textContent = `${row.label}: ${row.value}`;
    element.append(line);
  }

  const parentWidth = element.parentElement?.clientWidth ?? 600;
  const parentHeight = element.parentElement?.clientHeight ?? 360;
  const cursorLeft = plot.cursor.left ?? 8;
  const cursorTop = plot.cursor.top ?? 8;
  element.style.left = `${Math.min(Math.max(cursorLeft + 12, 8), Math.max(8, parentWidth - 228))}px`;
  element.style.top = `${Math.min(Math.max(cursorTop + 12, 8), Math.max(8, parentHeight - 100))}px`;
  element.classList.remove('hidden');
}

export function hideTechnicalMetricTooltip(element: HTMLDivElement | null): void {
  if (element === null) return;
  delete element.dataset.cursorIndex;
  element.classList.add('hidden');
}

const tooltipDateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
