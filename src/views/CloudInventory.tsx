import { useEffect, useMemo, useState } from 'react';
import {
  fetchTechnicalResourceSummary,
  fetchTechnicalResources,
  generateAiRecommendations,
  type CloudResourceItem,
  type TechnicalResourceSummary,
} from '../services/api';

interface CloudInventoryProps {
  readonly token: string;
  readonly onOpenResource: (externalResourceId: string) => void;
}

export default function CloudInventory({ token, onOpenResource }: CloudInventoryProps) {
  const [resources, setResources] = useState<readonly CloudResourceItem[]>([]);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTechnicalResources(token, 200)
      .then((response) => setResources(response.resources))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar el inventario.'));
  }, [token]);

  const providers = useMemo(() => [...new Set(resources.map((resource) => resource.provider))].sort(), [resources]);
  const filtered = useMemo(() => resources.filter((resource) => {
    const text = `${resource.name ?? ''} ${resource.externalResourceId} ${resource.serviceName} ${resource.resourceType}`.toLowerCase();
    return (provider === 'ALL' || resource.provider === provider) && text.includes(query.trim().toLowerCase());
  }), [provider, query, resources]);

  return <div className="space-y-6 animate-in fade-in duration-500">
    <header>
      <h2 className="text-2xl font-black text-white">Inventario Cloud</h2>
      <p className="mt-1 text-sm text-zinc-400">Recursos detectados para el tenant activo. La sincronización sigue siendo manual durante desarrollo.</p>
    </header>
    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar recurso, servicio o identificador"
        className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-tak-yellow" />
      <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-tak-yellow">
        <option value="ALL">Todos los proveedores</option>
        {providers.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
    {error !== null && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="p-4">Recurso</th><th>Proveedor</th><th>Servicio</th><th>Región</th><th>Estado</th><th>Última vez visto</th><th /></tr></thead>
        <tbody>{filtered.map((resource) => <tr key={resource.id} className="border-b border-zinc-800/70 text-zinc-300">
          <td className="p-4"><p className="font-bold text-white">{resource.name ?? resource.externalResourceId}</p><p className="max-w-[260px] truncate text-xs text-zinc-500">{resource.externalResourceId}</p></td>
          <td>{resource.provider}</td><td>{resource.serviceName}<p className="text-xs text-zinc-500">{resource.resourceType}</p></td><td>{resource.regionId ?? '—'}</td><td>{resource.status}</td><td>{formatDate(resource.lastSeenAt)}</td>
          <td className="p-4 text-right"><button onClick={() => onOpenResource(resource.externalResourceId)} className="rounded-lg bg-tak-yellow px-3 py-2 text-xs font-black text-zinc-950">Ver detalle</button></td>
        </tr>)}</tbody>
      </table></div>
      {filtered.length === 0 && <p className="p-8 text-center text-sm text-zinc-500">No hay recursos que coincidan con los filtros.</p>}
    </section>
  </div>;
}

export function CloudResourceDetail({ token, externalResourceId, onBack }: { readonly token: string; readonly externalResourceId: string; readonly onBack: () => void }) {
  const [summary, setSummary] = useState<TechnicalResourceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  useEffect(() => { void fetchTechnicalResourceSummary(token, externalResourceId).then((response) => setSummary(response.summary)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar el recurso.')); }, [externalResourceId, token]);
  if (error !== null) return <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>;
  if (summary === null) return <p className="p-8 text-sm text-zinc-400">Cargando detalle del recurso...</p>;
  const { resource, coverage, metrics, cost } = summary;
  const generateForResource = async () => {
    setGenerating(true); setAiMessage(null); setError(null);
    try {
      const response = await generateAiRecommendations(token, false, resource.externalResourceId);
      setAiMessage(`Análisis auditado generado: ${response.recommendations.length} oportunidad(es) en vista previa.`);
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'No se pudo analizar el recurso con IA.'); }
    finally { setGenerating(false); }
  };
  return <div className="space-y-6 animate-in fade-in duration-500">
    <button onClick={onBack} className="text-sm font-bold text-tak-yellow">← Volver al inventario</button>
    <header><h2 className="text-2xl font-black text-white">{resource.name ?? resource.externalResourceId}</h2><p className="mt-1 text-sm text-zinc-400">{resource.externalResourceId} · {resource.provider} · {resource.regionId ?? 'Sin región'}</p></header>
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard label="Cobertura técnica" value={`${coverage.coveragePercent.toFixed(0)}%`} detail={`${coverage.totalSamples} muestras`} />
      <MetricCard label="Costo asociado" value={cost !== undefined ? formatCurrency(cost.totalCost, cost.currency) : 'Sin match exacto'} detail={cost !== undefined ? `${cost.metricCount} métricas facturadas` : 'No se inventa costo'} />
      <MetricCard label="Última muestra" value={coverage.maxSampledAt !== undefined ? formatDate(coverage.maxSampledAt) : 'Sin muestras'} detail={resource.status} />
    </div>
    {aiMessage !== null && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">{aiMessage}</p>}
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h3 className="font-black text-white">Evidencia técnica</h3>
      {metrics.length === 0 ? <p className="mt-3 text-sm text-tak-yellow">No hay evidencia técnica suficiente para generar una recomendación ejecutable.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{metrics.map((metric) => <div key={metric.metricName} className="rounded-xl bg-zinc-950 p-4"><p className="font-bold text-white">{metric.metricName}</p><p className="mt-1 text-sm text-zinc-400">Promedio {metric.avg.toFixed(2)} {metric.metricUnit ?? ''} · p95 {metric.p95.toFixed(2)}</p><p className="mt-1 text-xs text-zinc-500">{metric.sampleCount} muestras · {metric.coverageDays} días</p></div>)}</div>}
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
