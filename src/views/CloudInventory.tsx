import { useEffect, useMemo, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import {
  fetchTechnicalResourceSummary,
  fetchTechnicalResources,
  fetchRecommendations,
  fetchResourceAllocation,
  generateAiRecommendations,
  type AllocationSummary,
  type CloudResourceItem,
  type Recommendation,
  type TechnicalResourceSummary,
} from '../services/api';

interface CloudInventoryProps {
  readonly onOpenResource: (resource: CloudResourceItem) => void;
}

const evidenceStatusLabels: Readonly<Record<NonNullable<CloudResourceItem['lineage']>['status'], string>> = {
  EVIDENCE_COMPLETE: 'Completa',
  COST_ONLY: 'Solo costo',
  TECHNICAL_ONLY: 'Solo métricas',
  INSUFFICIENT_EVIDENCE: 'Insuficiente',
  STALE_DATA: 'Desactualizada',
};

export default function CloudInventory({ onOpenResource }: CloudInventoryProps) {
  const token = useAccessToken();
  const [resources, setResources] = useState<readonly CloudResourceItem[]>([]);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('ALL');
  const [costFilter, setCostFilter] = useState<'ALL' | 'WITH_COST'>('WITH_COST');
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setError(null);
      void fetchTechnicalResources(token, { limit: 200, costFilter, status, provider, query })
        .then((response) => setResources(response.resources))
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar el inventario.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [costFilter, provider, query, status, token]);

  const providers = useMemo(() => [...new Set(['OCI', 'AWS', ...resources.map((resource) => resource.provider)])].sort(), [resources]);
  const filtered = resources;

  return <div className="ui-page space-y-6 animate-in fade-in duration-500">
    <header className="ui-page-header">
      <div>
        <p className="ui-kicker">Catálogo operativo</p>
        <h2 className="ui-page-title mt-2">Inventario cloud</h2>
        <p className="ui-page-lead">Recursos detectados para el tenant activo, listos para cruzar consumo, costo y evidencia técnica.</p>
      </div>
      <span className="ui-status ui-status-accent shrink-0">{costFilter === 'WITH_COST' ? 'Solo con costo' : 'Inventario completo'}</span>
    </header>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar recurso, servicio o identificador"
        className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-tak-yellow" />
      <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-tak-yellow">
        <option value="ALL">Todos los proveedores</option>
        {providers.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={costFilter} onChange={(event) => setCostFilter(event.target.value as 'ALL' | 'WITH_COST')} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-tak-yellow">
        <option value="WITH_COST">Solo recursos con costo</option>
        <option value="ALL">Todos los recursos</option>
      </select>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-tak-yellow">
        <option value="ALL">Cualquier estado</option>
        <option value="ACTIVE">Activos</option>
        <option value="STOPPED">Detenidos</option>
        <option value="TERMINATED">Terminados</option>
        <option value="UNKNOWN">Desconocidos</option>
      </select>
    </div>
    <p className="text-xs text-zinc-500">Los filtros se aplican en el servidor. “Con costo” exige al menos un registro facturado positivo asociado exactamente al recurso.</p>
    {error !== null && <p className="ui-alert-danger p-4 text-sm">{error}</p>}
    <section className="ui-surface overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="p-4">Recurso</th><th>Proveedor</th><th>Servicio</th><th>Región</th><th>Evidencia</th><th>Estado</th><th>Última vez visto</th><th /></tr></thead>
        <tbody>{filtered.map((resource) => <tr key={resource.id} className="border-b border-zinc-800/70 text-zinc-300">
          <td className="p-4"><p className="font-bold text-white">{resource.name ?? resource.externalResourceId}</p><p className="max-w-[260px] truncate text-xs text-zinc-500">{resource.externalResourceId}</p></td>
          <td>{resource.provider}</td><td>{resource.serviceName}<p className="text-xs text-zinc-500">{resource.resourceType}</p></td><td>{resource.regionId ?? '—'}</td>
          <td><p className="font-bold text-white">{resource.lineage !== undefined ? evidenceStatusLabels[resource.lineage.status] : 'Sin evaluar'}</p><p className="text-xs text-zinc-500">{resource.lineage !== undefined ? `${resource.lineage.linkedCostCount} costos · ${resource.lineage.linkedMetricSampleCount} métricas` : 'Requiere readiness'}</p></td>
          <td>{resource.status}</td><td>{formatDate(resource.lastSeenAt)}</td>
          <td className="p-4 text-right"><button onClick={() => onOpenResource(resource)} className="rounded-lg bg-tak-yellow px-3 py-2 text-xs font-black text-zinc-950">Ver detalle</button></td>
        </tr>)}</tbody>
      </table></div>
      {filtered.length === 0 && <p className="p-8 text-center text-sm text-zinc-500">No hay recursos que coincidan con los filtros.</p>}
    </section>
  </div>;
}

export function CloudResourceDetail({ externalResourceId, cloudResourceId, onBack }: { readonly externalResourceId: string; readonly cloudResourceId?: string; readonly onBack: () => void }) {
  const token = useAccessToken();
  const [summary, setSummary] = useState<TechnicalResourceSummary | null>(null);
  const [allocation, setAllocation] = useState<readonly AllocationSummary[]>([]);
  const [recommendations, setRecommendations] = useState<readonly Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  useEffect(() => {
    let active = true;
    setSummary(null); setRecommendations([]); setAllocation([]); setError(null); setAllocationError(null); setRecommendationsError(null);
    void (async () => {
      const [resourceResult, recommendationResult, allocationResult] = await Promise.allSettled([
        fetchTechnicalResourceSummary(token, externalResourceId, cloudResourceId),
        fetchRecommendations(token, { externalResourceId, ...(cloudResourceId === undefined ? {} : { cloudResourceId }) }),
        fetchResourceAllocation(token, externalResourceId, cloudResourceId),
      ]);
      if (!active) return;
      if (resourceResult.status === 'fulfilled') setSummary(resourceResult.value.summary);
      else setError(resourceResult.reason instanceof Error ? resourceResult.reason.message : 'No se pudo cargar el recurso.');
      if (recommendationResult.status === 'fulfilled') setRecommendations(recommendationResult.value.recommendations);
      else setRecommendationsError('Las oportunidades relacionadas no están disponibles temporalmente.');
      if (allocationResult.status === 'fulfilled') setAllocation(allocationResult.value.summary);
      else setAllocationError('La asignación de costos no está disponible temporalmente.');
    })();
    return () => { active = false; };
  }, [cloudResourceId, externalResourceId, token]);
  if (error !== null) return <p className="ui-alert-danger p-4 text-sm">{error}</p>;
  if (summary === null) return <p className="p-8 text-sm text-zinc-400">Cargando detalle del recurso...</p>;
  const { resource, coverage, metrics, cost, evidence } = summary;
  const generateForResource = async () => {
    setGenerating(true); setAiMessage(null); setError(null);
    try {
      const response = await generateAiRecommendations(token, false, resource.externalResourceId, resource.id);
      setAiMessage(`Análisis auditado generado: ${response.recommendations.length} oportunidad(es) en vista previa.`);
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'No se pudo analizar el recurso con IA.'); }
    finally { setGenerating(false); }
  };
  return <div className="ui-page space-y-6 animate-in fade-in duration-500">
    <button onClick={onBack} className="ui-button ui-button-quiet px-0">← Volver al inventario</button>
    <header className="ui-page-header">
      <div>
        <p className="ui-kicker">Ficha de recurso</p>
        <h2 className="ui-page-title mt-2">{resource.name ?? resource.externalResourceId}</h2>
        <p className="ui-page-lead">{resource.externalResourceId} · {resource.provider} · {resource.regionId ?? 'Sin región'} · {resource.serviceName} · {resource.resourceType}</p>
        <p className="mt-1 text-xs text-zinc-500">{resource.status} · detectado desde {formatDate(resource.firstSeenAt)}</p>
      </div>
      <span className="ui-status ui-status-accent shrink-0">{resource.status}</span>
    </header>
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard label="Cobertura técnica" value={`${coverage.coveragePercent.toFixed(0)}%`} detail={`${coverage.totalSamples} muestras`} />
     <MetricCard label="Costo asociado" value={cost !== undefined ? formatCurrency(cost.totalCost, cost.currency) : 'Sin match exacto'} detail={cost !== undefined ? `${cost.metricCount} métricas facturadas` : 'No se inventa costo'} />
      <MetricCard label="Asignación de costo" value={allocationError !== null ? 'No disponible' : allocation[0]?.dimensions.find((item) => item.allocationKey !== 'UNALLOCATED')?.allocationKey ?? 'Sin asignar'} detail={allocationError ?? (allocation.length === 0 ? 'No hay costo FOCUS para asignar' : allocation[0]!.period)} />
      <MetricCard label="Última muestra" value={coverage.maxSampledAt !== undefined ? formatDate(coverage.maxSampledAt) : 'Sin muestras'} detail={resource.status} />
    </div>
    <section className={`ui-callout p-5 ${evidence.strength === 'HIGH' ? 'border-green-500/30 bg-green-500/10' : evidence.strength === 'MEDIUM' ? 'border-tak-yellow/30 bg-tak-yellow/10' : 'border-red-500/30 bg-red-500/10'}`}>
      <h3 className="font-black text-white">Estado de evidencia para IA: {evidence.strength === 'HIGH' ? 'fuerte' : evidence.strength === 'MEDIUM' ? 'moderada' : 'limitada'}</h3>
      <p className="mt-1 text-sm text-zinc-300">{evidence.readiness === 'GENERATABLE' ? 'La evidencia permite analizar una oportunidad técnica, sujeto a auditoría IA.' : 'La IA solo puede proponer validación técnica previa; no debe recomendar una ejecución directa.'}</p>
      {evidence.blockers.length > 0 && <p className="mt-2 text-xs text-zinc-400">Validaciones pendientes: {evidence.blockers.map(formatEvidenceBlocker).join(', ')}.</p>}
    </section>
    {aiMessage !== null && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">{aiMessage}</p>}
    <section className="ui-surface p-5"><h3 className="font-black text-white">Evidencia técnica</h3>
      {metrics.length === 0 ? <p className="mt-3 text-sm text-tak-yellow">No hay evidencia técnica suficiente para generar una recomendación ejecutable.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{metrics.map((metric) => <div key={metric.metricName} className="rounded-xl bg-zinc-950 p-4"><p className="font-bold text-white">{metric.metricName}</p><p className="mt-1 text-sm text-zinc-400">Promedio {metric.avg.toFixed(2)} {metric.metricUnit ?? ''} · p95 {metric.p95.toFixed(2)}</p><p className="mt-1 text-xs text-zinc-500">{metric.sampleCount} muestras · {metric.coverageDays} días</p></div>)}</div>}
    </section>
    <section className="ui-surface p-5">
      <h3 className="font-black text-white">Oportunidades relacionadas</h3>
      <p className="mt-1 text-sm text-zinc-400">Solo se muestran recomendaciones cuya evidencia apunta exactamente a este recurso.</p>
      {recommendationsError !== null ? <p className="mt-3 rounded-xl border border-tak-yellow/30 bg-tak-yellow/10 p-3 text-sm text-tak-yellow">{recommendationsError}</p> : recommendations.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No hay oportunidades persistidas para este recurso.</p> : <div className="mt-4 space-y-3">{recommendations.map((recommendation) => <article key={recommendation.id} className="rounded-xl bg-zinc-950 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-white">{recommendation.title}</p><p className="mt-1 text-sm text-zinc-400">{recommendation.description}</p></div><span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300">{recommendation.status}</span></div><p className="mt-2 text-xs text-tak-yellow">Ahorro estimado: {recommendation.estimatedMonthlySavings !== undefined ? formatCurrency(recommendation.estimatedMonthlySavings, recommendation.currency) : 'Por validar'}</p></article>)}</div>}
    </section>
    <button onClick={() => void generateForResource()} disabled={generating || metrics.length === 0 || cost === undefined}
      className="rounded-xl bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50">
      {generating ? 'Analizando recurso...' : 'Analizar este recurso con IA'}
    </button>
    <p className="text-xs text-zinc-500">Solo se habilita con costo asociado y evidencia técnica del recurso. La vista previa no persiste recomendaciones.</p>
  </div>;
}

function MetricCard({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail: string }) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>; }
function formatDate(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function formatCurrency(value: number, currency: string): string { return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
function formatEvidenceBlocker(blocker: string): string {
  const labels: Record<string, string> = {
    NO_TECHNICAL_EVIDENCE: 'sin muestras técnicas',
    INSUFFICIENT_TECHNICAL_COVERAGE: 'cobertura o frescura insuficiente',
    MISSING_CPU_METRIC: 'falta métrica de CPU',
    MISSING_MEMORY_METRIC: 'falta métrica de memoria',
    CPU_SATURATION_RISK: 'riesgo de saturación de CPU',
    MEMORY_SATURATION_RISK: 'riesgo de saturación de memoria',
  };
  return labels[blocker] ?? 'requiere validación técnica';
}
