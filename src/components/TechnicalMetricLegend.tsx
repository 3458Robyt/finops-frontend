import { useMemo, useState } from 'react';

export interface TechnicalMetricLegendItem {
  readonly key: string;
  readonly label: string;
  readonly fullLabel: string;
  readonly color: string;
}

interface TechnicalMetricLegendProps {
  readonly items: readonly TechnicalMetricLegendItem[];
}

export function TechnicalMetricLegend({ items }: TechnicalMetricLegendProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(
    () => normalizedQuery === ''
      ? items
      : items.filter((item) => item.fullLabel.toLocaleLowerCase().includes(normalizedQuery)),
    [items, normalizedQuery],
  );

  if (items.length === 0) {
    return null;
  }

  const compactItems = items.slice(0, 6);
  const hiddenCount = Math.max(0, items.length - compactItems.length);

  return (
    <section data-testid="technical-metric-legend" className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3" aria-label="Leyenda de la gráfica">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Series graficadas</p>
          <p className="mt-1 text-xs text-zinc-400">{items.length} {items.length === 1 ? 'serie' : 'series'} · pasa el cursor para ver el identificador completo</p>
        </div>
        {items.length > compactItems.length && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tak-yellow transition hover:border-tak-yellow"
          >
            {expanded ? 'Ocultar series' : `Ver todas (+${hiddenCount})`}
          </button>
        )}
      </div>

      {!expanded && (
        <div className="mt-3 grid max-h-[4.75rem] grid-cols-1 gap-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
          {compactItems.map((item) => <LegendChip key={item.key} item={item} />)}
        </div>
      )}

      {expanded && (
        <div className="mt-3">
          <label className="sr-only" htmlFor="technical-metric-legend-search">Buscar serie</label>
          <input
            id="technical-metric-legend-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por recurso, región o namespace"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none transition focus:border-tak-yellow"
          />
          <div className="mt-2 grid max-h-60 grid-cols-1 gap-1 overflow-y-auto pr-1 custom-scrollbar sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.length === 0 ? (
              <p className="col-span-full py-3 text-xs text-zinc-500">No hay series que coincidan con la búsqueda.</p>
            ) : filteredItems.map((item) => <LegendChip key={item.key} item={item} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function LegendChip({ item }: { readonly item: TechnicalMetricLegendItem }) {
  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-lg border border-zinc-800 px-2 py-1.5"
      title={item.fullLabel}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
      <span className="truncate text-[11px] font-bold text-zinc-300">{item.label}</span>
    </div>
  );
}
