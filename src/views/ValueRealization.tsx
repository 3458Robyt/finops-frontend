import { useCallback, useEffect, useRef, useState } from 'react';
import ValueRealizationTrendUPlot from '../components/ValueRealizationTrendUPlot';
import {
  fetchValueRealizationItems,
  fetchValueRealizationSummary,
  fetchValueRealizationTrend,
  reconcileValueRealization,
  downloadValueRealizationCsv,
  type ValueRealizationFilters,
  type ValueRealizationItem,
  type ValueRealizationSummary,
  type ValueRealizationTrendPoint,
} from '../services/api';

interface Props { readonly token: string; readonly canReconcile: boolean; readonly onOpenRecommendation: (id: string) => void; }

const money = (value: number, currency: string) => new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
const statusLabels: Record<string, string> = { NO_EXECUTION: 'Sin ejecución', WAITING_FOR_DATA: 'Esperando datos', READY: 'Listo para calcular', CALCULATED: 'Calculado', INSUFFICIENT_EVIDENCE: 'Evidencia insuficiente', VERIFIED: 'Verificado', REJECTED: 'Rechazado' };

export default function ValueRealization({ token, canReconcile, onOpenRecommendation }: Props) {
  const [summary, setSummary] = useState<ValueRealizationSummary | null>(null);
  const [items, setItems] = useState<readonly ValueRealizationItem[]>([]);
  const [trend, setTrend] = useState<readonly ValueRealizationTrendPoint[]>([]);
  const [filters, setFilters] = useState<ValueRealizationFilters>({ pageSize: 50 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (append = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true); setError(null);
    try {
      const requestFilters = append && nextCursor !== undefined ? { ...filters, cursor: nextCursor } : { ...filters, cursor: undefined };
      const [summaryResponse, itemsResponse, trendResponse] = await Promise.all([
        fetchValueRealizationSummary(token, requestFilters, { signal: controller.signal }),
        fetchValueRealizationItems(token, requestFilters, { signal: controller.signal }),
        fetchValueRealizationTrend(token, requestFilters, { signal: controller.signal }),
      ]);
      setSummary(summaryResponse.summary);
      setItems((current) => append ? [...current, ...itemsResponse.page.items] : itemsResponse.page.items);
      setTrend(trendResponse.points);
      setHasMore(itemsResponse.page.hasMore); setNextCursor(itemsResponse.page.nextCursor);
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'No fue posible cargar el valor realizado'); }
    finally { if (controllerRef.current === controller) { controllerRef.current = null; setLoading(false); } }
  }, [filters, nextCursor, token]);

  useEffect(() => { void load(false); return () => controllerRef.current?.abort(); }, [filters, token]); // eslint-disable-line react-hooks/exhaustive-deps
  const primary = summary?.currencies.find((item) => item.currency === filters.currency) ?? summary?.currencies[0];
  const primaryCurrency = primary?.currency ?? 'USD';
  const count = (key: string) => summary?.counts[key] ?? 0;
  const runReconcile = async () => { setBusy(true); setReconcileResult(null); try { const response = await reconcileValueRealization(token); const result = response.result; setReconcileResult(`Procesadas: ${result.attempted ?? 0} · creadas: ${result.created ?? 0} · sin cambios: ${result.unchanged ?? 0} · insuficientes: ${result.insufficientEvidence ?? 0} · fallidas: ${result.failures ?? 0}`); await load(false); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible reconciliar'); } finally { setBusy(false); } };
  const exportCsv = async () => { try { const blob = await downloadValueRealizationCsv(token, filters); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'valor-realizado.csv'; link.click(); URL.revokeObjectURL(url); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible exportar'); } };
  const updateFilter = (key: keyof ValueRealizationFilters, value: string | boolean) => setFilters((current) => ({ ...current, cursor: undefined, [key]: value === '' ? undefined : value }));

  return <div className="space-y-6 animate-fade-in">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.22em] text-tak-yellow">Resultado después de ejecutar</p><h1 className="mt-2 text-3xl font-bold text-white">Valor realizado</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">Compara lo estimado con lo observado y lo verificado. Los aumentos de costo se muestran separados del ahorro.</p></div>
      <div className="flex gap-2"><button onClick={() => void load(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-tak-yellow">Actualizar</button>{canReconcile && <button disabled={busy} onClick={() => void runReconcile()} className="rounded-lg bg-tak-yellow px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50">{busy ? 'Actualizando…' : 'Actualizar mediciones'}</button>}<button onClick={() => void exportCsv()} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-tak-yellow">Exportar CSV</button></div>
    </header>
    {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
    {reconcileResult && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">Actualización completada. {reconcileResult}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi label="Estimado mensual" value={money(primary?.estimatedMonthlySavings ?? 0, primaryCurrency)} />
      <Kpi label="Proyectado mensual" value={money(primary?.projectedMonthlySavings ?? 0, primaryCurrency)} tone="text-sky-200" />
      <Kpi label="Observado" value={money(primary?.observedSavings ?? 0, primaryCurrency)} tone="text-sky-300" />
      <Kpi label="Verificado" value={money(primary?.verifiedMonthlySavings ?? 0, primaryCurrency)} tone="text-tak-yellow" />
      <Kpi label="Aumento de costo" value={money(primary?.costIncreaseMonthlyAmount ?? 0, primaryCurrency)} tone="text-rose-300" />
      <Kpi label="Tasa de realización" value={`${((primary?.realizationRate ?? 0) * 100).toFixed(1)}%`} tone="text-emerald-300" />
    </section>
    {summary !== null && <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{summary.currencies.map((currency) => <div key={currency.currency} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Resumen {currency.currency}</p><span className="text-xs text-emerald-300">{(currency.realizationRate * 100).toFixed(1)}% realizado</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><Metric label="Estimado" value={money(currency.estimatedMonthlySavings, currency.currency)} /><Metric label="Reportado" value={money(currency.reportedMonthlySavings, currency.currency)} /><Metric label="Observado" value={money(currency.observedSavings, currency.currency)} /><Metric label="Proyectado mensual" value={money(currency.projectedMonthlySavings, currency.currency)} tone="text-sky-200" /><Metric label="Run-rate verificado" value={money(currency.verifiedMonthlySavings, currency.currency)} tone="text-tak-yellow" /><Metric label="Aumento" value={money(currency.costIncreaseMonthlyAmount, currency.currency)} tone="text-rose-300" /><Metric label="Variación" value={money(currency.varianceAgainstEstimate, currency.currency)} /></div></div>)}</section>}
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold text-white">Cola de trabajo</h2><p className="text-xs text-zinc-500">Prioriza aumentos, revisiones y ejecuciones sin evidencia posterior.</p></div><span className="text-xs text-zinc-500">{attentionItems(items).length} pendientes visibles</span></div>{attentionItems(items).slice(0, 5).length === 0 ? <Empty text="No hay mediciones que requieran atención inmediata." /> : <div className="mt-4 space-y-2">{attentionItems(items).slice(0, 5).map((item) => <div key={`attention-${item.recommendationId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><div><p className="font-medium text-white">{attentionReason(item)}</p><p className="text-xs text-zinc-500">{item.title} · {item.resourceId ?? item.serviceName ?? 'Cuenta completa'}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-zinc-200">{money(item.costIncreaseMonthlyAmount > 0 ? item.costIncreaseMonthlyAmount : item.estimatedMonthlySavings, item.currency)}</span><button onClick={() => onOpenRecommendation(item.recommendationId)} className="text-xs font-bold text-tak-yellow hover:underline">Revisar recomendación</button></div></div>)}</div>}</section>
    <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
       <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-white">Evolución del valor</h2><p className="text-xs text-zinc-500">Observado en la ventana, run-rate mensual verificado y aumentos separados</p></div><span className="text-xs text-zinc-500">{primaryCurrency} · {trend.length} periodos</span></div>{trend.length > 0 ? <ValueRealizationTrendUPlot points={trend} currency={filters.currency ?? primaryCurrency} /> : <Empty text="Aún no hay mediciones para graficar." />}</div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><h2 className="font-bold text-white">Embudo de realización</h2><div className="mt-4 space-y-3">{[['Identificadas', count('identified')], ['Aprobadas', count('approved')], ['Ejecutadas', count('executed')], ['Sin medición', count('withoutMeasurement')], ['En revisión', count('calculatedPendingReview')], ['Verificadas', count('verified')]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between border-b border-zinc-800 pb-2 text-sm"><span className="text-zinc-400">{label}</span><strong className="text-white">{value}</strong></div>)}</div></div>
    </section>
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-white">Portafolio de oportunidades</h2><p className="text-xs text-zinc-500">Una fila por recomendación y su última ejecución medible.</p></div><div className="flex flex-wrap gap-2"><input value={filters.search ?? ''} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Buscar recurso o oportunidad" className="w-56 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-tak-yellow" /><select value={filters.currency ?? ''} onChange={(event) => updateFilter('currency', event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"><option value=''>Todas las monedas</option>{(summary?.currencies ?? []).map((item) => <option key={item.currency} value={item.currency}>{item.currency}</option>)}</select><select value={filters.status ?? ''} onChange={(event) => updateFilter('status', event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"><option value="">Todos los estados</option>{Object.entries(statusLabels).filter(([key]) => key !== 'NO_EXECUTION').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><label className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300"><input type="checkbox" checked={filters.onlyIncreases === true} onChange={(event) => updateFilter('onlyIncreases', event.target.checked)} /> Aumentos</label></div></div>
      {loading && items.length === 0 ? <p className="py-12 text-center text-sm text-zinc-500">Cargando valor realizado…</p> : items.length === 0 ? <Empty text="No hay oportunidades que coincidan con los filtros." /> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="pb-3">Oportunidad</th><th className="pb-3">Recurso</th><th className="pb-3">Estimado</th><th className="pb-3">Verificado</th><th className="pb-3">Estado</th><th className="pb-3">Siguiente acción</th><th /></tr></thead><tbody className="divide-y divide-zinc-800">{items.map((item) => <tr key={item.recommendationId} className="text-zinc-300"><td className="py-3 pr-4"><p className="font-medium text-white">{item.title}</p><p className="text-xs text-zinc-500">{item.provider} · {item.cloudAccountName}</p></td><td className="py-3 pr-4">{item.resourceId ?? item.serviceName ?? 'Cuenta completa'}</td><td className="py-3 pr-4">{money(item.estimatedMonthlySavings, item.currency)}</td><td className="py-3 pr-4 text-tak-yellow">{money(item.verifiedMonthlySavings, item.currency)}</td><td className="py-3 pr-4"><span className="rounded-full bg-zinc-800 px-2 py-1 text-xs">{statusLabels[item.measurementStatus ?? 'NO_EXECUTION'] ?? item.measurementStatus}</span></td><td className="py-3 pr-4 text-xs text-zinc-400">{item.nextAction.replaceAll('_', ' ')}</td><td className="py-3 text-right"><button onClick={() => onOpenRecommendation(item.recommendationId)} className="text-xs font-bold text-tak-yellow hover:underline">Ver detalle</button></td></tr>)}</tbody></table></div>}
      {hasMore && <div className="mt-4 text-center"><button onClick={() => void load(true)} disabled={loading} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50">{loading ? 'Cargando…' : 'Cargar más'}</button></div>}
    </section>
  </div>;
}

function Kpi({ label, value, tone = 'text-white' }: { readonly label: string; readonly value: string; readonly tone?: string }) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p><p className={`mt-2 text-xl font-bold ${tone}`}>{value}</p></div>; }
function Metric({ label, value, tone = 'text-white' }: { readonly label: string; readonly value: string; readonly tone?: string }) { return <div><p className="text-xs text-zinc-500">{label}</p><p className={`mt-1 font-bold ${tone}`}>{value}</p></div>; }
function attentionItems(items: readonly ValueRealizationItem[]): readonly ValueRealizationItem[] { return [...items].filter((item) => item.costIncreaseMonthlyAmount > 0 || item.measurementStatus === 'CALCULATED' || item.measurementStatus === 'INSUFFICIENT_EVIDENCE' || item.measurementStatus === 'WAITING_FOR_DATA' || item.measurementStatus === 'NO_EXECUTION' || item.measurementStatus === undefined).sort((left, right) => attentionPriority(left) - attentionPriority(right)); }
function attentionPriority(item: ValueRealizationItem): number { if (item.costIncreaseMonthlyAmount > 0) return 0; if (item.measurementStatus === 'CALCULATED') return 1; if (item.measurementStatus === 'INSUFFICIENT_EVIDENCE') return 2; if (item.measurementStatus === 'WAITING_FOR_DATA') return 3; return 4; }
function attentionReason(item: ValueRealizationItem): string { if (item.costIncreaseMonthlyAmount > 0) return 'Aumento de costo detectado'; if (item.measurementStatus === 'CALCULATED') return 'Medición lista para revisión'; if (item.measurementStatus === 'INSUFFICIENT_EVIDENCE') return 'Evidencia insuficiente'; if (item.measurementStatus === 'WAITING_FOR_DATA') return 'Ventana esperando datos'; return 'Ejecución sin medición'; }
function Empty({ text }: { readonly text: string }) { return <div className="py-12 text-center text-sm text-zinc-500">{text}</div>; }
