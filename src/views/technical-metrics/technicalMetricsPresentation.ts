import type { TechnicalMetricOpportunity, TechnicalMetricResourceSummary, TechnicalMetricsOverview } from '../../services/api';
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
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency.trim().toUpperCase())
    ? currency.trim().toUpperCase()
    : 'USD';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  }).format(value);
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

export function resourceHasDisplayName(resource: Pick<TechnicalMetricResourceSummary, 'externalResourceId' | 'name'>): boolean {
  const name = resource.name?.trim();
  return name !== undefined && name !== '' && name !== resource.externalResourceId;
}

export function resourceLegendLabel(
  resource: Pick<TechnicalMetricResourceSummary, 'externalResourceId' | 'name' | 'serviceName' | 'resourceType'>,
): string {
  if (resourceHasDisplayName(resource)) {
    return resource.name!.trim();
  }

  const descriptor = resource.serviceName?.trim() || resource.resourceType?.trim() || 'Recurso cloud';
  return `${descriptor} · ${shortResource(resource.externalResourceId)}`;
}

export function resourceOptionLabel(
  resource: Pick<TechnicalMetricResourceSummary, 'externalResourceId' | 'name' | 'serviceName' | 'resourceType'>,
): string {
  const label = resourceLegendLabel(resource);
  return resourceHasDisplayName(resource) ? `${label} · ${shortResource(resource.externalResourceId)}` : label;
}
