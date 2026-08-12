import type {
  CostResourceClassification,
  ResourceLinkageReadinessResponse,
  ResourceLinkReasonCode,
} from '../../services/types/lineage';
import DeterministicOpportunityPanel from './DeterministicOpportunityPanel';

type Readiness = ResourceLinkageReadinessResponse['readiness'];

const statusStyles: Readonly<Record<Readiness['status'], { readonly label: string; readonly className: string }>> = {
  READY: { label: 'Trazabilidad lista', className: 'bg-green-500/15 text-green-300' },
  PARTIAL: { label: 'Cobertura parcial', className: 'bg-tak-yellow/15 text-tak-yellow' },
  BLOCKED: { label: 'Bloqueada', className: 'bg-red-500/15 text-red-300' },
  NO_DATA: { label: 'Sin datos', className: 'bg-zinc-800 text-zinc-400' },
};

const classificationLabels: Readonly<Record<CostResourceClassification, string>> = {
  RESOURCE_FOUND: 'Recurso activo encontrado',
  HISTORICAL_RESOURCE: 'Referencia histórica exacta',
  SERVICE_OR_ACCOUNT_LEVEL: 'Costo de servicio o cuenta',
  CONNECTION_NOT_AVAILABLE: 'Sin conexión cloud identificable',
  INVALID_OR_UNSUPPORTED_ID: 'Identificador no soportado',
  INVENTORY_RESOURCE_NOT_FOUND: 'Recurso válido pendiente de inventario',
  AMBIGUOUS_RESOURCE_ID: 'Identificador ambiguo',
};

const reasonLabels: Readonly<Record<ResourceLinkReasonCode, string>> = {
  EMPTY_RESOURCE_ID: 'Identificador vacío',
  INVENTORY_RESOURCE_NOT_FOUND: 'No existe en inventario',
  CONNECTION_NOT_AVAILABLE: 'Sin conexión cloud',
  AMBIGUOUS_RESOURCE_ID: 'Identificador ambiguo',
  SERVICE_LEVEL_COST: 'Costo a nivel de servicio',
  INVALID_EXISTING_REFERENCE: 'Referencia existente inválida',
  UNSUPPORTED_RESOURCE_ID: 'Identificador no soportado',
};

const blockerLabels: Readonly<Record<string, string>> = {
  NO_NORMALIZED_INVENTORY: 'No existe inventario normalizado compatible.',
  NO_RESOURCE_WITH_COST_AND_TECHNICAL_EVIDENCE: 'No hay un recurso con costo y métricas enlazados.',
  UNLINKED_COST_EVIDENCE: 'Existen costos elegibles sin vínculo exacto.',
  UNLINKED_TECHNICAL_EVIDENCE: 'Existen métricas sin vínculo exacto.',
  INVENTORY_NOT_FRESH: 'El inventario no está actualizado.',
  COST_DATA_NOT_FRESH: 'Los costos disponibles están desactualizados.',
  TECHNICAL_METRICS_NOT_FRESH: 'Las métricas técnicas están desactualizadas.',
};

const coverageLabels: Readonly<Record<Readiness['resources'][number]['coverage'], string>> = {
  COST_AND_TECHNICAL: 'Costo + técnica',
  COST_ONLY: 'Solo costo',
  TECHNICAL_ONLY: 'Solo técnica',
  INVENTORY_ONLY: 'Solo inventario',
};

const evidenceLabels: Readonly<Record<Readiness['resources'][number]['evidenceStatus'], string>> = {
  EVIDENCE_COMPLETE: 'Evidencia completa',
  COST_ONLY: 'Solo costo',
  TECHNICAL_ONLY: 'Solo métricas',
  INSUFFICIENT_EVIDENCE: 'Evidencia insuficiente',
  STALE_DATA: 'Datos desactualizados',
};

export default function ResourceLinkagePanel({ readiness }: { readonly readiness: Readiness }) {
  const counts = readiness.costClassifications.counts;
  const unresolvedValid = counts.INVENTORY_RESOURCE_NOT_FOUND + counts.AMBIGUOUS_RESOURCE_ID;
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <header className="flex flex-col gap-3 border-b border-zinc-800 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">account_tree</span>
            <h3 className="text-lg font-bold text-white">Trazabilidad normalizada por recurso</h3>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">
            Cruza costos, métricas y recomendaciones únicamente mediante conexión e identificador exactos. La cobertura se calcula sobre costos que realmente representan recursos enlazables.
          </p>
        </div>
        <StatusBadge {...statusStyles[readiness.status]} />
      </header>

      <div className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-4">
        <CoverageCard label="Recursos inventariados" value={String(readiness.inventoryResources)} detail="Identidades canónicas activas e históricas" />
        <CoverageCard label="Cobertura elegible de costos" value={`${readiness.costs.coveragePercent}%`} detail={`${readiness.costs.linked} de ${readiness.costs.eligible} costos enlazables`} />
        <CoverageCard label="Métricas enlazadas" value={`${readiness.metrics.coveragePercent}%`} detail={`${readiness.metrics.linked} de ${readiness.metrics.eligible} muestras`} />
        <CoverageCard label="Costo + evidencia técnica" value={String(readiness.linkedResourcesWithBoth)} detail="Recursos utilizables por la IA técnica" />
      </div>

      <div className="border-t border-zinc-800 p-6">
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs leading-relaxed text-zinc-300">
          <strong className="text-sky-300">Cómo leer el porcentaje:</strong> de {readiness.costs.total} registros de costo, {readiness.costs.eligible} tienen un identificador de recurso válido y una conexión utilizable. Los otros {readiness.costs.notEligible} se conservan para análisis financiero, pero no se usan como evidencia técnica por recurso.
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ClassificationCard label={classificationLabels.RESOURCE_FOUND} value={counts.RESOURCE_FOUND} tone="green" />
          <ClassificationCard label={classificationLabels.HISTORICAL_RESOURCE} value={counts.HISTORICAL_RESOURCE} tone="sky" detail="Existió en FOCUS; no implica que siga activo." />
          <ClassificationCard label="No elegibles" value={readiness.costs.notEligible} tone="zinc" detail={`${counts.SERVICE_OR_ACCOUNT_LEVEL} de servicio/cuenta · ${counts.CONNECTION_NOT_AVAILABLE} sin conexión · ${counts.INVALID_OR_UNSUPPORTED_ID} no soportados`} />
          <ClassificationCard label="Elegibles pendientes" value={unresolvedValid} tone={unresolvedValid === 0 ? 'green' : 'yellow'} detail={`${counts.INVENTORY_RESOURCE_NOT_FOUND} sin inventario · ${counts.AMBIGUOUS_RESOURCE_ID} ambiguos`} />
        </div>
        <ServiceClassificationTable readiness={readiness} />
      </div>

      <TagAndFreshness readiness={readiness} />
      <RecommendationBlockers blockers={readiness.technicalRecommendationBlockers} />
      {readiness.opportunityCatalog !== undefined && <DeterministicOpportunityPanel catalog={readiness.opportunityCatalog} />}
      <ConnectionAndResourceCoverage readiness={readiness} />
    </section>
  );
}

function ServiceClassificationTable({ readiness }: { readonly readiness: Readiness }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-zinc-950/60 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <tr><th className="p-3">Servicio</th><th className="p-3">Total</th><th className="p-3">Elegibles</th><th className="p-3">Activos</th><th className="p-3">Históricos</th><th className="p-3">No elegibles</th><th className="p-3">Cobertura</th></tr>
        </thead>
        <tbody>
          {readiness.costClassifications.byService.map((service) => (
            <tr key={service.serviceName} className="border-t border-zinc-800/70 text-zinc-300">
              <td className="p-3 font-bold text-white">{service.serviceName}</td>
              <td className="p-3">{service.total}</td><td className="p-3">{service.eligible}</td>
              <td className="p-3">{service.counts.RESOURCE_FOUND}</td><td className="p-3">{service.counts.HISTORICAL_RESOURCE}</td>
              <td className="p-3">{service.total - service.eligible}</td><td className="p-3 font-bold text-green-300">{service.coveragePercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TagAndFreshness({ readiness }: { readonly readiness: Readiness }) {
  return (
    <div className="border-t border-zinc-800 p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><p className="text-xs font-black uppercase tracking-widest text-zinc-500">Gobierno de etiquetas</p><p className="mt-1 text-xs text-zinc-500">Claves evaluadas: {readiness.tagGovernance.requiredKeys.join(', ') || 'ninguna configurada'}.</p></div>
        <CoverageCard label="Cobertura conforme" value={`${readiness.tagGovernance.coveragePercent}%`} detail={`${readiness.tagGovernance.compliantResources} de ${readiness.tagGovernance.totalResources} recursos`} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <FreshnessCard label="Inventario" signal={readiness.freshness.inventory} />
        <FreshnessCard label="Costos" signal={readiness.freshness.costs} />
        <FreshnessCard label="Métricas" signal={readiness.freshness.metrics} />
      </div>
    </div>
  );
}

function RecommendationBlockers({ blockers }: { readonly blockers: readonly string[] }) {
  if (blockers.length === 0) return null;
  return <div className="border-t border-zinc-800 bg-red-500/5 p-6"><p className="text-xs font-black uppercase tracking-widest text-red-300">Bloqueadores para recomendaciones técnicas</p><ul className="mt-3 grid gap-2 md:grid-cols-2">{blockers.map((blocker) => <li key={blocker} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{blockerLabels[blocker] ?? blocker}</li>)}</ul></div>;
}

function ConnectionAndResourceCoverage({ readiness }: { readonly readiness: Readiness }) {
  return (
    <div className="grid gap-6 border-t border-zinc-800 p-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div><p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Readiness por conexión</p><div className="mb-6 grid gap-3 md:grid-cols-2">{readiness.connections.length === 0 ? <p className="text-sm text-zinc-500">No hay conexiones registradas.</p> : readiness.connections.map((connection) => <article key={connection.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-white">{connection.name}</p><p className="text-xs text-zinc-500">{connection.provider.toUpperCase()} · {connection.inventoryResources} recursos</p></div><StatusBadge {...statusStyles[connection.status]} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><ReadinessLine label="Costos elegibles" value={`${connection.costs.coveragePercent}%`} /><ReadinessLine label="Históricos" value={String(connection.costClassifications.counts.HISTORICAL_RESOURCE)} /><ReadinessLine label="No elegibles" value={String(connection.costs.notEligible)} /></div></article>)}</div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Muestra de inventario cruzado</p><div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="w-full min-w-[640px] text-left"><thead className="bg-zinc-950/60 text-[10px] font-black uppercase tracking-widest text-zinc-500"><tr><th className="p-3">Recurso</th><th className="p-3">Evidencia</th><th className="p-3">Costos</th><th className="p-3">Métricas</th><th className="p-3">Recomendaciones</th></tr></thead><tbody>{readiness.resources.length === 0 ? <tr><td colSpan={5} className="p-4 text-sm text-zinc-500">Todavía no hay recursos inventariados.</td></tr> : readiness.resources.map((resource) => <tr key={resource.id} className="border-t border-zinc-800/70 text-sm"><td className="p-3"><p className="font-bold text-white">{resource.externalResourceId}</p><p className="text-xs text-zinc-500">{resource.serviceName} · {resource.provider.toUpperCase()}</p></td><td className="p-3 text-xs font-bold text-zinc-300"><p>{evidenceLabels[resource.evidenceStatus]}</p><p className="mt-1 text-[10px] font-medium text-zinc-500">{coverageLabels[resource.coverage]}</p></td><td className="p-3 text-zinc-300">{resource.costMetrics}</td><td className="p-3 text-zinc-300">{resource.metricSamples}</td><td className="p-3 text-zinc-300">{resource.recommendations}</td></tr>)}</tbody></table></div></div>
      <div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Razones de no vínculo</p><p className="mt-1 text-xs text-zinc-500">Solo los pendientes elegibles bloquean la cobertura técnica. Los no elegibles siguen disponibles para análisis financiero.</p></div><CoverageReasons label="Costos" reasons={readiness.costs.reasons} /><CoverageReasons label="Métricas" reasons={readiness.metrics.reasons} /><CoverageReasons label="Recomendaciones" reasons={readiness.recommendations.reasons} />{readiness.latestReconciliation !== undefined && <p className="text-[11px] text-zinc-600">Última reconciliación: {formatDateTime(readiness.latestReconciliation.observedAt)}</p>}</div>
    </div>
  );
}

function StatusBadge({ label, className }: { readonly label: string; readonly className: string }) { return <span className={`inline-block w-fit rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>{label}</span>; }
function CoverageCard({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail: string }) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>; }
function ClassificationCard({ label, value, tone, detail }: { readonly label: string; readonly value: number; readonly tone: 'green' | 'sky' | 'yellow' | 'zinc'; readonly detail?: string }) { const tones = { green: 'text-green-300', sky: 'text-sky-300', yellow: 'text-tak-yellow', zinc: 'text-zinc-300' }; return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p><p className={`mt-2 text-2xl font-black ${tones[tone]}`}>{value}</p>{detail !== undefined && <p className="mt-1 text-xs text-zinc-500">{detail}</p>}</div>; }
function ReadinessLine({ label, value }: { readonly label: string; readonly value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-1 text-xs font-medium text-zinc-300">{value}</p></div>; }
function FreshnessCard({ label, signal }: { readonly label: string; readonly signal: Readiness['freshness']['inventory'] }) { const labels = { FRESH: 'Actualizado', STALE: 'Desactualizado', NO_DATA: 'Sin datos' }; const className = signal.status === 'FRESH' ? 'text-green-300' : signal.status === 'STALE' ? 'text-tak-yellow' : 'text-zinc-500'; return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Frescura · {label}</p><p className={`mt-2 text-sm font-black ${className}`}>{labels[signal.status]}</p><p className="mt-1 text-xs text-zinc-500">{signal.observedAt !== undefined ? formatDateTime(signal.observedAt) : 'No se ha observado información.'}</p></div>; }
function CoverageReasons({ label, reasons }: { readonly label: string; readonly reasons: Partial<Record<ResourceLinkReasonCode, number>> }) { const entries = Object.entries(reasons).filter((entry): entry is [ResourceLinkReasonCode, number] => typeof entry[1] === 'number' && entry[1] > 0); return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs font-bold text-zinc-300">{label}</p>{entries.length === 0 ? <p className="mt-2 text-xs text-green-300">Sin registros pendientes.</p> : <ul className="mt-2 space-y-1 text-xs text-zinc-400">{entries.map(([reason, count]) => <li key={reason} className="flex justify-between gap-3"><span>{reasonLabels[reason]}</span><span className="font-bold text-tak-yellow">{count}</span></li>)}</ul>}</div>; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
