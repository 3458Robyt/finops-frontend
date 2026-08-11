import type { TechnicalMetricOpportunity, TechnicalMetricsOverview } from '../../services/api';
import type { MetricGroupFilter } from './technicalMetricsModel';

export const groupLabels: Readonly<Record<MetricGroupFilter, string>> = {
  ALL: 'Todas',
  CPU: 'CPU',
  MEMORY: 'Memoria',
  NETWORK: 'Red',
  DISK: 'Disco',
  SYSTEM: 'Sistema',
  OTHER: 'Otras',
};

export const severityStyles: Readonly<Record<TechnicalMetricOpportunity['severity'], string>> = {
  INFO: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
  LOW: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  MEDIUM: 'border-tak-yellow/20 bg-tak-yellow/10 text-tak-yellow',
  HIGH: 'border-red-500/20 bg-red-500/10 text-red-200',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function formatRange(overview: TechnicalMetricsOverview | null): string {
  if (overview?.minSampledAt === undefined || overview.maxSampledAt === undefined) {
    return 'Sin rango disponible';
  }
  return `${formatShortDate(overview.minSampledAt)} - ${formatShortDate(overview.maxSampledAt)}`;
}

export function formatDateTime(value: string | undefined): string {
  if (value === undefined) return 'Sin datos';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}

export function formatCurrency(value: number, currency: string): string {
  return currencyFormatter.format(value).replace('$', currency === 'USD' ? '$' : `${currency} `);
}

export function formatMetricValue(value: number, unit: string | undefined): string {
  const formatted = Math.abs(value) >= 1000000
    ? new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
    : new Intl.NumberFormat('es-CO', { maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);
  return unit === undefined ? formatted : `${formatted} ${unit}`;
}

export function formatGranularity(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

export function shortResource(value: string): string {
  return value.length <= 28 ? value : `${value.slice(0, 14)}...${value.slice(-10)}`;
}
