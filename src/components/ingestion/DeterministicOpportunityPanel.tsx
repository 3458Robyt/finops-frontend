import type { DeterministicFinOpsOpportunity, DeterministicOpportunityCatalog } from '../../services/types/lineage';

const priorityLabels: Readonly<Record<DeterministicFinOpsOpportunity['priority'], string>> = {
  CRITICAL: 'Crítica', HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja',
};
const priorityClasses: Readonly<Record<DeterministicFinOpsOpportunity['priority'], string>> = {
  CRITICAL: 'bg-red-500/15 text-red-300', HIGH: 'bg-orange-500/15 text-orange-300',
  MEDIUM: 'bg-tak-yellow/15 text-tak-yellow', LOW: 'bg-sky-500/15 text-sky-300',
};
const kindLabels: Readonly<Record<DeterministicFinOpsOpportunity['kind'], string>> = {
  DATA_LINKAGE: 'Vínculo de datos', DATA_FRESHNESS: 'Frescura',
  TECHNICAL_EVIDENCE: 'Evidencia técnica', TAG_GOVERNANCE: 'Etiquetas',
};

export default function DeterministicOpportunityPanel({ catalog }: { readonly catalog: DeterministicOpportunityCatalog }) {
  const visible = catalog.opportunities.slice(0, 8);
  return (
    <section className="border-t border-zinc-800 bg-zinc-950/30 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">rule</span>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Oportunidades detectadas por reglas</h3>
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-zinc-400">
            Este catálogo se calcula antes de la IA usando costos, métricas, inventario y gobierno de etiquetas. No estima ahorros ni habilita acciones por sí solo.
          </p>
        </div>
        <div className="text-left text-xs text-zinc-500 lg:text-right">
          <p className="font-bold text-zinc-300">{catalog.opportunities.length} oportunidades</p>
          <p>Reglas {catalog.ruleVersion}</p>
        </div>
      </div>

      {!catalog.resourceCoverageComplete && (
        <p className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-relaxed text-sky-200">
          Se muestran {catalog.sampledResources} de {catalog.inventoryResources} recursos. Las oportunidades de recursos corresponden a una muestra; los bloqueadores y conteos agregados sí consideran todo el tenant.
        </p>
      )}

      {visible.length === 0 ? <p className="mt-4 text-sm font-medium text-green-300">No hay oportunidades de calidad de datos abiertas con la evidencia actual.</p> : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visible.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}
        </div>
      )}
      {catalog.opportunities.length > visible.length && <p className="mt-3 text-xs text-zinc-500">Se muestran las {visible.length} oportunidades de mayor prioridad. El catálogo completo permanece disponible en la respuesta de trazabilidad.</p>}
    </section>
  );
}

function OpportunityCard({ opportunity }: { readonly opportunity: DeterministicFinOpsOpportunity }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide ${priorityClasses[opportunity.priority]}`}>{priorityLabels[opportunity.priority]}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{kindLabels[opportunity.kind]}</span>
        {opportunity.externalResourceId !== undefined && <span className="truncate text-[10px] font-medium text-zinc-600">{opportunity.externalResourceId}</span>}
      </div>
      <h4 className="mt-3 text-sm font-black text-white">{opportunity.title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{opportunity.description}</p>
      <p className="mt-3 border-t border-zinc-800 pt-3 text-xs font-semibold leading-relaxed text-tak-yellow">Siguiente acción: {opportunity.recommendedAction}</p>
      <p className="mt-2 text-[10px] text-zinc-600">Evidencia: {opportunity.evidence.source} · {opportunity.evidence.ruleVersion}</p>
    </article>
  );
}
