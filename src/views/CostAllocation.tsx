import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAccessToken } from '../auth/authSession';
import { CostAllocationRuleForm } from './CostAllocationRuleForm';
import { readCostAllocationRule, toCostAllocationInput } from './costAllocationUi';
import { CostAllocationSharedTotals } from './CostAllocationSharedTotals';
import { activateCostAllocationRule, archiveCostAllocationRule, closeCostAllocationPeriod, compareCostAllocationClosures, createCostAllocationRule, downloadCostAllocationCsv, fetchBudgets, fetchCostAllocationClosure, fetchCostAllocationClosures, fetchCostAllocationComparison, fetchCostAllocationRules, fetchCostAllocationSummary, fetchCostDataOptions, fetchUnallocatedCosts, fetchValueRealizationDestinations, previewCostAllocationRule, updateCostAllocationRule, type AllocationPreview, type AllocationSummary, type Budget, type CostAllocationClosure, type CostAllocationRule, type CostAllocationRuleInput, type CostDataOptions, type ValueRealizationDestinationSummary } from '../services/api';

type Filters = { readonly cloudAccountId?: string; readonly serviceName?: string; readonly currency?: string; readonly destination?: string };

export default function CostAllocation({ canManage }: { readonly canManage: boolean }) {
  const token = useAccessToken();
  const [period, setPeriod] = useState(currentMonth());
  const [filters, setFilters] = useState<Filters>({});
  const [rules, setRules] = useState<readonly CostAllocationRule[]>([]);
  const [summary, setSummary] = useState<readonly AllocationSummary[]>([]);
  const [previousSummary, setPreviousSummary] = useState<readonly AllocationSummary[]>([]);
  const [closures, setClosures] = useState<readonly CostAllocationClosure[]>([]);
  const [previousClosures, setPreviousClosures] = useState<readonly CostAllocationClosure[]>([]);
  const [budgets, setBudgets] = useState<readonly Budget[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<CostAllocationClosure | null>(null);
  const [closureComparison, setClosureComparison] = useState<{ readonly current: CostAllocationClosure; readonly previous?: CostAllocationClosure } | null>(null);
  const [unallocated, setUnallocated] = useState<readonly UnallocatedItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [options, setOptions] = useState<CostDataOptions | null>(null);
  const [destinationSavings, setDestinationSavings] = useState<readonly ValueRealizationDestinationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetchCostAllocationRules(token),
        fetchCostAllocationSummary(token, period, { ...filters, allocationKey: filters.destination }),
        fetchCostAllocationComparison(token, period, { ...filters, allocationKey: filters.destination }),
        fetchUnallocatedCosts(token, period, filters),
        fetchCostAllocationClosures(token, period),
        fetchCostAllocationClosures(token, previousPeriod(period)),
        fetchBudgets(token, { period, ...(filters.cloudAccountId === undefined ? {} : { cloudAccountId: filters.cloudAccountId }), ...(filters.serviceName === undefined ? {} : { serviceName: filters.serviceName }) }),
      ]);
      const [ruleResult, summaryResult, comparisonResult, unallocatedResult, closureResult, previousClosureResult, budgetResult] = results;
      if (ruleResult.status === 'fulfilled') setRules(ruleResult.value.rules);
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.summary);
      if (comparisonResult.status === 'fulfilled') setPreviousSummary(comparisonResult.value.comparison.previousSummary);
      if (unallocatedResult.status === 'fulfilled') setUnallocated(unallocatedResult.value.items);
      if (closureResult.status === 'fulfilled') setClosures(closureResult.value.closures);
      if (previousClosureResult.status === 'fulfilled') setPreviousClosures(previousClosureResult.value.closures);
      if (budgetResult.status === 'fulfilled') setBudgets(budgetResult.value.budgets);
      setError(results.some((result) => result.status === 'rejected') ? 'Algunos bloques no pudieron actualizarse. Los datos disponibles permanecen visibles.' : null);
    } catch (cause) { setError(message(cause, 'No fue posible cargar la asignación de costos')); }
  }, [filters, period, token]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { void fetchCostDataOptions(token, period).then((response) => setOptions(response.options)).catch(() => setOptions(null)); }, [period, token]);
  useEffect(() => { void fetchValueRealizationDestinations(token, period, filters.currency).then((response) => setDestinationSavings(response.destinations)).catch(() => setDestinationSavings([])); }, [filters.currency, period, token]);
  const visibleSummary = useMemo(() => summary.filter((item) => (filters.currency === undefined || item.currency === filters.currency) && (filters.destination === undefined || item.dimensions.some((dimension) => dimension.allocationKey.toLowerCase().includes(filters.destination!.toLowerCase())))), [filters.currency, filters.destination, summary]);
  const destinationRows = useMemo(() => buildDestinationFinancialRows({ summary, previousSummary, closures, previousClosures, budgets, savings: destinationSavings, useClosed: filters.cloudAccountId === undefined && filters.serviceName === undefined, currency: filters.currency, destination: filters.destination }), [budgets, closures, destinationSavings, filters.cloudAccountId, filters.currency, filters.destination, filters.serviceName, previousClosures, previousSummary, summary]);
  const closureStatus = closures.some((closure) => closure.status === 'CLOSED') ? 'CERRADO' : closures.some((closure) => closure.status === 'REPLACED') ? 'REEMPLAZADO' : visibleSummary.length > 0 ? 'LISTO' : 'ABIERTO';

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const rule = readCostAllocationRule(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    try { if (submitter instanceof HTMLButtonElement && submitter.value === 'preview') { await previewRule(rule); return; } await createCostAllocationRule(token, rule); setCreating(false); await load(); }
    catch (cause) { setError(message(cause, 'No fue posible crear la regla')); }
  };
  const previewRule = async (rule: CostAllocationRuleInput, ruleId?: string) => {
    try { setPreview((await previewCostAllocationRule(token, rule, period, ruleId)).preview); setError(null); }
    catch (cause) { setError(message(cause, 'No fue posible previsualizar la regla')); }
  };
  const editRule = async (rule: CostAllocationRule) => {
    const name = window.prompt('Nombre de la regla', rule.name); if (name === null) return;
    const priority = window.prompt('Prioridad (menor número = mayor prioridad)', String(rule.priority)); if (priority === null) return;
    const parsed = Number(priority); if (!Number.isInteger(parsed) || parsed < 0 || name.trim() === '') { setError('El nombre y la prioridad son obligatorios.'); return; }
    try { await updateCostAllocationRule(token, rule.id, { name: name.trim(), priority: parsed }); await load(); }
    catch (cause) { setError(message(cause, 'No fue posible editar la regla')); }
  };
  const exportCsv = async () => {
    try { const blob = new Blob([await downloadCostAllocationCsv(token, period)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `showback-${period}.csv`; link.click(); URL.revokeObjectURL(url); }
    catch (cause) { setError(message(cause, 'No fue posible exportar el CSV')); }
  };
  const loadClosureDetail = async (closureId: string) => {
    try { setSelectedClosure((await fetchCostAllocationClosure(token, closureId)).closure); setClosureComparison(null); setError(null); }
    catch (cause) { setError(message(cause, 'No fue posible cargar el detalle del cierre')); }
  };
  const compareClosure = async (closureId: string) => {
    try { setClosureComparison(await compareCostAllocationClosures(token, closureId)); setError(null); }
    catch (cause) { setError(message(cause, 'No fue posible comparar las versiones del cierre')); }
  };
  const closePeriod = async () => {
    if (!window.confirm(`Confirmar cierre de ${period}. Los costos sin asignar quedarán visibles y no se redistribuirán automáticamente.`)) return;
    const hasClosed = closures.some((closure) => closure.status === 'CLOSED');
    const replacementReason = hasClosed ? window.prompt('Indique el motivo para reemplazar el cierre anterior:') : undefined;
    if (hasClosed && (replacementReason === null || (replacementReason ?? '').trim() === '')) { setError('El motivo del reemplazo es obligatorio.'); return; }
    try { await closeCostAllocationPeriod(token, period, replacementReason === null ? undefined : replacementReason); await load(); setError(null); }
    catch (cause) { setError(message(cause, 'No fue posible cerrar el período')); }
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Asignación de costos</h1><p className="text-zinc-400">Showback determinístico por reglas, dimensiones FOCUS y etiquetas.</p></div><div className="flex flex-wrap gap-2"><input aria-label="Periodo" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className={fieldClass}/><button onClick={() => void exportCsv()} className="rounded border border-zinc-700 px-4 font-bold">Exportar CSV</button>{canManage && <button onClick={() => setCreating((open) => !open)} className="rounded bg-tak-yellow px-4 font-bold text-zinc-950">Nueva regla</button>}</div></header>
    {options?.latestPeriod !== undefined && options.latestPeriod !== period && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tak-yellow/30 bg-tak-yellow/10 p-4 text-sm text-tak-yellow"><span>El último período con costos disponibles es {options.latestPeriod}. Este período puede no tener datos.</span><button onClick={() => setPeriod(options.latestPeriod!)} className="rounded border border-tak-yellow/50 px-3 py-2 font-bold">Usar período disponible</button></div>}
    <div className="grid gap-2 md:grid-cols-4"><select aria-label="Cuenta cloud" value={filters.cloudAccountId ?? ''} onChange={(event) => setFilters((value) => ({ ...value, cloudAccountId: blank(event.target.value) }))} className={fieldClass}><option value="">Todas las cuentas</option>{(options?.cloudAccounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.provider}</option>)}</select><select aria-label="Servicio" value={filters.serviceName ?? ''} onChange={(event) => setFilters((value) => ({ ...value, serviceName: blank(event.target.value) }))} className={fieldClass}><option value="">Todos los servicios</option>{(options?.services ?? []).map((service) => <option key={service}>{service}</option>)}</select><select aria-label="Moneda" value={filters.currency ?? ''} onChange={(event) => setFilters((value) => ({ ...value, currency: blank(event.target.value) }))} className={fieldClass}><option value="">Todas las monedas</option>{(options?.currencies ?? []).map((currency) => <option key={currency}>{currency}</option>)}</select><input value={filters.destination ?? ''} onChange={(event) => setFilters((value) => ({ ...value, destination: blank(event.target.value) }))} placeholder="Centro, proyecto, equipo o ambiente" className={fieldClass}/></div>
    {error !== null && <p className="rounded border border-red-500/40 p-3 text-red-300">{error}</p>}
    {creating && <CostAllocationRuleForm onSubmit={create} options={options}/>} {preview !== null && <section className="rounded-xl border border-tak-yellow/40 bg-tak-yellow/10 p-4"><div className="flex justify-between gap-4"><div><h2 className="font-bold">Previsualización sin guardar</h2><p className="text-sm text-zinc-300">Muestra la cobertura que tendría esta regla en {period}; no modifica costos ni reglas.</p></div><button onClick={() => setPreview(null)} className="text-sm">Cerrar</button></div><p className="mt-2 text-sm">Coincidiría con {preview.metricCount} líneas y {preview.resourceCount} recursos. Reglas usadas: {preview.rulesUsed.length === 0 ? 'ninguna' : preview.rulesUsed.map((rule) => `${rule.name} · v${rule.configurationVersion}`).join(' | ')}.</p><AllocationCards summary={preview.summary}/><p className="mt-2 text-xs text-zinc-400">Período anterior: {preview.previousSummary.map((item) => `${item.currency} ${item.totalCost.toFixed(2)}`).join(' · ') || 'sin datos'}.</p>{preview.examples.length > 0 && <p className="mt-3 text-xs text-zinc-400">Ejemplos: {preview.examples.map((item) => `${item.currency} ${item.cost.toFixed(2)} · ${item.serviceName}`).join(' | ')}</p>}<div className="mt-4 rounded border border-zinc-700/60 bg-zinc-950/30 p-3"><h3 className="font-bold">Impacto financiero</h3>{preview.financialImpact.budgets.length === 0 ? <p className="mt-1 text-xs text-zinc-400">No hay presupuestos por destino para este período.</p> : <div className="mt-2 space-y-1 text-xs">{preview.financialImpact.budgets.map((item) => <p key={`${item.currency}-${item.allocationKey}`}>{item.currency} · {item.allocationKey}: gasto proyectado {item.projectedCost.toFixed(2)} de {item.budgetAmount.toFixed(2)} ({item.consumedPercent.toFixed(1)}%).</p>)}</div>}<p className="mt-2 text-xs text-zinc-400">Ahorro con evidencia cerrada — potencial: {savingsByCurrency(preview.financialImpact.savings, 'potentialSavings')} · aprobado: {savingsByCurrency(preview.financialImpact.savings, 'approvedSavings')} · verificado: {savingsByCurrency(preview.financialImpact.savings, 'verifiedSavings')}. No se proyecta ahorro nuevo hasta cerrar y ejecutar.</p></div></section>}
    <AllocationCards summary={visibleSummary}/><CostAllocationSharedTotals summary={visibleSummary}/><DestinationFinancialSummary rows={destinationRows}/>
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Estado del período</h2><p className="mt-1 text-sm text-zinc-400">Checklist previo al cierre de {period}.</p></div><span className="rounded border border-tak-yellow/40 px-3 py-1 text-sm font-bold text-tak-yellow">{closureStatus}</span></div><ul className="mt-3 grid gap-2 text-sm text-zinc-300 md:grid-cols-2"><li>{visibleSummary.length > 0 ? '✓' : '○'} Fuente de costos disponible para el período.</li><li>{rules.some((rule) => rule.status === 'ACTIVE') ? '✓' : '○'} Reglas activas cargadas y filtradas por tenant.</li><li>{visibleSummary.every(totalsBalance) ? '✓' : '○'} Totales separados por moneda.</li><li>{unallocated.length === 0 ? '✓' : '!' } Costos sin asignar: {unallocated.length === 0 ? 'ninguno detectado' : 'se confirmarán explícitamente al cerrar'}.</li><li className="md:col-span-2 text-zinc-500">Los trabajos de facturación activos y la inmutabilidad de la fuente se validan en el backend al confirmar el cierre.</li></ul></section>
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Valor financiero por destino</h2><p className="text-sm text-zinc-400">Solo incluye ahorros vinculados a una línea de costo cerrada, recurso canónico y hash de métrica exactos.</p></div><span className="text-xs text-zinc-500">Sin evidencia exacta no se atribuye ahorro.</span></div>{destinationSavings.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No hay ahorros atribuibles por destino para este período.</p> : <div className="mt-3 space-y-2">{destinationSavings.filter((item) => filters.destination === undefined || item.allocationKey.toLowerCase().includes(filters.destination.toLowerCase())).map((item) => <div key={`${item.currency}-${item.allocationKey}`} className="grid gap-2 border-b border-zinc-800 py-3 text-sm md:grid-cols-5"><span className="font-medium">{item.allocationKey === 'UNALLOCATED' ? 'Sin asignar' : item.allocationKey}<small className="block text-xs text-zinc-500">{item.attributedRecommendations} oportunidades con evidencia</small></span><span>{item.currency} {item.potentialSavings.toFixed(2)}<small className="block text-xs text-zinc-500">Potencial</small></span><span>{item.currency} {item.approvedSavings.toFixed(2)}<small className="block text-xs text-zinc-500">Aprobado</small></span><span className="text-tak-yellow">{item.currency} {item.verifiedSavings.toFixed(2)}<small className="block text-xs text-zinc-500">Verificado</small></span><span className="text-sky-200">{item.currency} {item.observedSavings.toFixed(2)}<small className="block text-xs text-zinc-500">Observado</small></span></div>)}</div>}</section>
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Comparación de cobertura mensual</h2><p className="text-sm text-zinc-400">Compara cuánto gasto tiene una dimensión y cuánto sigue sin asignar.</p></div>{canManage && <button onClick={() => void closePeriod()} className="rounded bg-tak-yellow px-3 py-2 text-sm font-bold text-zinc-950">Cerrar período</button>}</div>{visibleSummary.map((item) => { const previous = previousSummary.find((candidate) => candidate.currency === item.currency); const delta = item.coveragePercent - (previous?.coveragePercent ?? 0); return <p key={item.currency} className="mt-2 text-sm">{item.currency}: {item.coveragePercent.toFixed(1)}% este mes · {previous?.coveragePercent.toFixed(1) ?? 'sin datos'}% mes anterior <b className={delta >= 0 ? 'text-green-300' : 'text-red-300'}>({delta >= 0 ? '+' : ''}{delta.toFixed(1)} pp)</b></p>; })}</section>
    {closures.length > 0 && <section className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4"><h2 className="font-bold">Cierres reproducibles de {period}</h2><p className="mt-1 text-sm text-zinc-400">Cada moneda se cierra por separado. Un reemplazo conserva la versión anterior para auditoría.</p><div className="mt-3 space-y-2">{closures.map((closure) => <div key={closure.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 p-3 text-sm"><div><b>{closure.currency}</b> · versión {closure.version} · {closure.status === 'CLOSED' ? 'Cerrado' : 'Reemplazado'}<small className="ml-2 text-zinc-500">Fuente {closure.sourceHash.slice(0, 10)}…</small><p className="mt-1">Total {closure.sourceTotal.toFixed(2)} · asignado {closure.allocatedTotal.toFixed(2)} · sin asignar {closure.unallocatedTotal.toFixed(2)}</p></div><div className="flex gap-2"><button onClick={() => void loadClosureDetail(closure.id)} className="rounded border border-zinc-700 px-3 py-2 text-xs font-bold">Ver detalle</button><button onClick={() => void compareClosure(closure.id)} className="rounded border border-tak-yellow/50 px-3 py-2 text-xs font-bold text-tak-yellow">Comparar versión</button></div></div>)}</div></section>}
    {selectedClosure !== null && <section data-testid="allocation-closure-detail" className="rounded-xl border border-sky-800/60 bg-sky-950/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Detalle del cierre {selectedClosure.currency} · versión {selectedClosure.version}</h2><p className="mt-1 text-xs text-zinc-400">Responsable: {selectedClosure.closedByUserId} · {formatClosureDate(selectedClosure.createdAt)}</p></div><button onClick={() => setSelectedClosure(null)} className="text-xs text-zinc-400">Cerrar detalle</button></div><div className="mt-3 grid gap-2 text-sm md:grid-cols-4"><span>Fuente: <b>{selectedClosure.sourceTotal.toFixed(2)}</b></span><span>Asignado: <b>{selectedClosure.allocatedTotal.toFixed(2)}</b></span><span>Compartido: <b>{selectedClosure.sharedTotal.toFixed(2)}</b></span><span>Sin asignar: <b>{selectedClosure.unallocatedTotal.toFixed(2)}</b></span></div><p className="mt-3 break-all text-xs text-zinc-400">Hash de fuente: {selectedClosure.sourceHash}</p><p className="break-all text-xs text-zinc-400">Hash de reglas: {selectedClosure.rulesHash}</p><div className="mt-3 space-y-1 text-sm">{selectedClosure.results.map((result) => <p key={`${selectedClosure.currency}-${result.allocationKey}`}>{result.allocationKey === 'UNALLOCATED' ? 'Sin asignar' : result.allocationKey}: {selectedClosure.currency} {result.cost.toFixed(2)} · {result.metricCount} líneas · {result.resourceCount} recursos</p>)}</div></section>}
    {closureComparison !== null && <section data-testid="allocation-closure-comparison" className="rounded-xl border border-violet-800/60 bg-violet-950/20 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">Comparación de versiones</h2><p className="mt-1 text-sm text-zinc-400">La versión actual conserva el cierre anterior; ninguna versión histórica se sobrescribe.</p></div><button onClick={() => setClosureComparison(null)} className="text-xs text-zinc-400">Cerrar comparación</button></div><div className="mt-3 grid gap-2 text-sm md:grid-cols-2"><p>Actual: versión {closureComparison.current.version} · {closureComparison.current.currency} {closureComparison.current.sourceTotal.toFixed(2)}</p><p>Anterior: {closureComparison.previous === undefined ? 'sin versión anterior' : `versión ${closureComparison.previous.version} · ${closureComparison.previous.currency} ${closureComparison.previous.sourceTotal.toFixed(2)}`}</p></div>{closureComparison.current.replacementReason !== undefined && <p className="mt-2 text-sm text-zinc-300">Motivo del reemplazo: {closureComparison.current.replacementReason}</p>}</section>}
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><h2 className="font-bold">Distribución del gasto</h2>{visibleSummary.length === 0 ? <p className="mt-3 text-zinc-500">No hay costos para los filtros seleccionados.</p> : <div className="mt-3 space-y-2">{visibleSummary.flatMap((item) => item.dimensions.map((dimension) => ({ ...dimension, currency: item.currency }))).filter((item) => filters.destination === undefined || item.allocationKey.toLowerCase().includes(filters.destination.toLowerCase())).map((item) => <p key={`${item.currency}-${item.allocationKey}`} className="flex justify-between gap-3 text-sm"><span>{item.allocationKey === 'UNALLOCATED' ? 'Sin asignar' : item.allocationKey} <small className="text-zinc-500">· {item.metricCount} líneas · {item.resourceCount} recursos</small></span><b>{item.currency} {item.cost.toFixed(2)}</b></p>)}</div>}</section>
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><h2 className="font-bold">Reglas</h2>{rules.length === 0 ? <p className="mt-3 text-zinc-500">No hay reglas configuradas. Cree una regla para asignar el gasto sin etiqueta.</p> : <div className="mt-3 space-y-2">{rules.map((rule) => { const previewReady = rule.configurationHash !== undefined && rule.lastPreviewedHash === rule.configurationHash; return <div key={rule.id} className="flex flex-wrap justify-between gap-3 border-b border-zinc-800 py-3"><div><b>{rule.name}</b> <span className="text-xs text-zinc-500">Prioridad {rule.priority} · {labelStatus(rule.status)} · {rule.allocationMode === 'SPLIT' ? `Distribución ${rule.allocationTargets.map((item) => `${item.percentage}%`).join(' + ')}` : 'Directa'} · v{rule.configurationVersion}</span><p className="text-sm text-zinc-400">{criterion(rule)} → {target(rule)}</p></div>{canManage && <div className="flex flex-wrap gap-3 text-sm"><button onClick={() => void previewRule(toCostAllocationInput(rule), rule.id)}>Previsualizar</button><button onClick={() => void editRule(rule)}>Editar</button>{rule.status === 'DRAFT' && <><button disabled={!previewReady} onClick={() => void activateCostAllocationRule(token, rule.id).then(load).catch((cause) => setError(message(cause, 'Previsualice la regla antes de activarla.')))} className="disabled:cursor-not-allowed disabled:opacity-40">Activar</button>{!previewReady && <span className="self-center text-xs text-tak-yellow">Previsualice antes de activar</span>}</>}{rule.status !== 'ARCHIVED' && <button className="text-red-300" onClick={() => void archiveCostAllocationRule(token, rule.id).then(load).catch((cause) => setError(message(cause, 'No fue posible archivar la regla')))}>Archivar</button>}</div>}</div>; })}</div>}</section>
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><h2 className="font-bold">Costos sin asignar</h2>{unallocated.length === 0 ? <p className="mt-3 text-zinc-500">No hay costos sin asignar para este periodo y filtros.</p> : <div className="mt-3 space-y-2">{unallocated.slice(0, 50).map((item, index) => <p key={`${item.cloudAccountId}-${item.serviceName}-${item.cloudResourceId ?? item.resourceId ?? index}`} className="text-sm"><b>{item.currency} {item.cost.toFixed(2)}</b> · {item.serviceName} · {item.cloudAccountId} {item.cloudResourceId !== undefined ? `· recurso canónico ${item.cloudResourceId}` : item.resourceId !== undefined ? `· ${item.resourceId}` : ''}<span className="text-zinc-500"> — {item.suggestedCriteria.join(', ')}</span></p>)}</div>}</section>
  </div>;
}

type DestinationFinancialRow = {
  readonly allocationKey: string;
  readonly currency: string;
  readonly currentCost?: number;
  readonly currentSource: 'CLOSED' | 'LIVE' | 'NONE';
  readonly previousCost?: number;
  readonly variation?: number;
  readonly variationPercent?: number;
  readonly budgetAmount?: number;
  readonly budgetConsumed?: number;
  readonly budgetConsumedPercent?: number;
  readonly potentialSavings: number;
  readonly approvedSavings: number;
  readonly verifiedSavings: number;
  readonly observedSavings: number;
};

function DestinationFinancialSummary({ rows }: { readonly rows: readonly DestinationFinancialRow[] }) {
  return <section data-testid="allocation-destination-financial-summary" className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Resumen financiero por destino</h2><p className="text-sm text-zinc-400">Costo actual, comparación, presupuesto y ahorro en una sola vista. El costo actual usa el cierre más reciente; sin cierre se muestra como dato en vivo, no como cifra financiera cerrada.</p></div><span className="text-xs text-zinc-500">El ahorro solo usa evidencia exacta.</span></div>{rows.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No hay destinos con datos para este período.</p> : <div className="mt-3 space-y-2">{rows.map((row) => <article key={`${row.currency}-${row.allocationKey}`} className="rounded border border-zinc-800 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b>{row.allocationKey === 'UNALLOCATED' ? 'Sin asignar' : row.allocationKey}</b><span className="text-xs text-zinc-500">{row.currency} · {row.currentSource === 'CLOSED' ? 'Cierre vigente' : row.currentSource === 'LIVE' ? 'En vivo, sin cierre' : 'Sin costo actual'}</span></div><div className="mt-3 grid gap-3 text-sm md:grid-cols-4"><p>Costo actual: <b>{formatAmount(row.currentCost, row.currency)}</b><small className="block text-xs text-zinc-500">Anterior: {formatAmount(row.previousCost, row.currency)}</small></p><p>Variación: <b className={row.variation === undefined ? 'text-zinc-300' : row.variation >= 0 ? 'text-red-300' : 'text-green-300'}>{formatSignedAmount(row.variation, row.currency)}</b><small className="block text-xs text-zinc-500">{row.variationPercent === undefined ? 'Sin base comparable' : `${row.variationPercent.toFixed(1)} %`}</small></p><p>Presupuesto: <b>{formatAmount(row.budgetAmount, row.currency)}</b><small className="block text-xs text-zinc-500">Consumido: {row.budgetConsumedPercent === undefined ? 'Sin presupuesto o cierre' : `${row.budgetConsumedPercent.toFixed(1)} % (${formatAmount(row.budgetConsumed, row.currency)})`}</small></p><p>Ahorro: <b>{formatAmount(row.potentialSavings, row.currency)}</b><small className="block text-xs text-zinc-500">Potencial · aprobado {formatAmount(row.approvedSavings, row.currency)} · verificado {formatAmount(row.verifiedSavings, row.currency)} · acumulado {formatAmount(row.observedSavings, row.currency)}</small></p></div></article>)}</div>}</section>;
}

function buildDestinationFinancialRows(input: { readonly summary: readonly AllocationSummary[]; readonly previousSummary: readonly AllocationSummary[]; readonly closures: readonly CostAllocationClosure[]; readonly previousClosures: readonly CostAllocationClosure[]; readonly budgets: readonly Budget[]; readonly savings: readonly ValueRealizationDestinationSummary[]; readonly useClosed: boolean; readonly currency?: string; readonly destination?: string }): readonly DestinationFinancialRow[] {
  const currentLive = summaryCosts(input.summary);
  const previousLive = summaryCosts(input.previousSummary);
  const currentClosed = input.useClosed ? closureCosts(input.closures) : new Map<string, number>();
  const previousClosed = input.useClosed ? closureCosts(input.previousClosures) : new Map<string, number>();
  const budgetTotals = new Map<string, number>();
  for (const budget of input.budgets) if (budget.status === 'ACTIVE' && budget.scope === 'ALLOCATION_DESTINATION') addAmount(budgetTotals, keyOf(budget.currency, budget.scopeKey), budget.amount);
  const savings = new Map<string, { potentialSavings: number; approvedSavings: number; verifiedSavings: number; observedSavings: number }>();
  for (const item of input.savings) {
    const key = keyOf(item.currency, item.allocationKey);
    const current = savings.get(key) ?? { potentialSavings: 0, approvedSavings: 0, verifiedSavings: 0, observedSavings: 0 };
    savings.set(key, { potentialSavings: current.potentialSavings + item.potentialSavings, approvedSavings: current.approvedSavings + item.approvedSavings, verifiedSavings: current.verifiedSavings + item.verifiedSavings, observedSavings: current.observedSavings + item.observedSavings });
  }
  const keys = new Set([...currentLive.keys(), ...previousLive.keys(), ...currentClosed.keys(), ...previousClosed.keys(), ...budgetTotals.keys(), ...savings.keys()]);
  return [...keys].map((key) => {
    const [currency, allocationKey] = key.split('\u0000');
    const closedCost = currentClosed.get(key);
    const currentCost = closedCost ?? currentLive.get(key);
    const previousCost = previousClosed.get(key) ?? previousLive.get(key);
    const variation = currentCost === undefined || previousCost === undefined ? undefined : currentCost - previousCost;
    const budgetAmount = budgetTotals.get(key);
    const budgetConsumed = budgetAmount === undefined || closedCost === undefined ? undefined : closedCost;
    const savingsRow = savings.get(key) ?? { potentialSavings: 0, approvedSavings: 0, verifiedSavings: 0, observedSavings: 0 };
    const currentSource: DestinationFinancialRow['currentSource'] = closedCost !== undefined ? 'CLOSED' : currentCost !== undefined ? 'LIVE' : 'NONE';
    return { allocationKey: allocationKey ?? '', currency: currency ?? '', currentCost, currentSource, previousCost, variation, variationPercent: variation === undefined || previousCost === undefined || previousCost === 0 ? undefined : variation / Math.abs(previousCost) * 100, budgetAmount, budgetConsumed, budgetConsumedPercent: budgetAmount === undefined || budgetAmount === 0 || budgetConsumed === undefined ? undefined : budgetConsumed / budgetAmount * 100, ...savingsRow };
  }).filter((row) => (input.currency === undefined || row.currency === input.currency) && (input.destination === undefined || row.allocationKey.toLowerCase().includes(input.destination.toLowerCase()))).sort((left, right) => (right.currentCost ?? -1) - (left.currentCost ?? -1));
}

function summaryCosts(items: readonly AllocationSummary[]): Map<string, number> { const values = new Map<string, number>(); for (const item of items) for (const dimension of item.dimensions) addAmount(values, keyOf(item.currency, dimension.allocationKey), dimension.cost); return values; }
function closureCosts(closures: readonly CostAllocationClosure[]): Map<string, number> { const latest = new Map<string, CostAllocationClosure>(); for (const closure of closures) if (closure.status === 'CLOSED' && (latest.get(closure.currency)?.version ?? 0) < closure.version) latest.set(closure.currency, closure); const values = new Map<string, number>(); for (const closure of latest.values()) for (const result of closure.results) addAmount(values, keyOf(closure.currency, result.allocationKey), result.cost); return values; }
function keyOf(currency: string, allocationKey: string): string { return `${currency}\u0000${allocationKey}`; }
function addAmount(values: Map<string, number>, key: string, amount: number): void { values.set(key, (values.get(key) ?? 0) + amount); }
function formatAmount(value: number | undefined, currency: string): string { return value === undefined ? '—' : `${currency} ${value.toFixed(2)}`; }
function formatSignedAmount(value: number | undefined, currency: string): string { return value === undefined ? '—' : `${value >= 0 ? '+' : '-'}${formatAmount(Math.abs(value), currency)}`; }

function AllocationCards({ summary }: { readonly summary: readonly AllocationSummary[] }) { return <section className="grid gap-3 md:grid-cols-3">{summary.map((item) => <article key={item.currency} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs uppercase text-zinc-500">{item.currency} · Cobertura</p><p className="text-3xl font-black">{item.coveragePercent.toFixed(1)}%</p><p className="text-sm text-zinc-400">Total {item.currency} {item.totalCost.toFixed(2)} · Asignado {item.currency} {item.allocatedCost.toFixed(2)} · Sin asignar {item.currency} {item.unallocatedCost.toFixed(2)}</p></article>)}</section>; }
function criterion(rule: CostAllocationRule): string { return [rule.cloudAccountId, rule.provider, rule.serviceName, rule.regionId, rule.resourceId, rule.tagKey === undefined ? undefined : `${rule.tagKey}=${rule.tagValue}`].filter(Boolean).join(' · '); }
function target(rule: CostAllocationRule): string { return [rule.costCenter, rule.businessUnit, rule.project, rule.team, rule.environment].filter(Boolean).join(' · '); }
function labelStatus(status: CostAllocationRule['status']): string { return status === 'DRAFT' ? 'Borrador' : status === 'ACTIVE' ? 'Activa' : 'Archivada'; }
function blank(value: string): string | undefined { const trimmed = value.trim(); return trimmed === '' ? undefined : trimmed; }
function message(cause: unknown, fallback: string): string { return cause instanceof Error ? cause.message : fallback; }
function currentMonth(): string { const date = new Date(); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
function previousPeriod(value: string): string { const [year, month] = value.split('-').map(Number); const date = new Date(Date.UTC(year!, month! - 2, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
function formatClosureDate(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function totalsBalance(item: AllocationSummary): boolean { return Math.abs(item.totalCost - item.allocatedCost - item.unallocatedCost) < 0.000001; }
function savingsByCurrency(items: readonly ValueRealizationDestinationSummary[], field: 'potentialSavings' | 'approvedSavings' | 'verifiedSavings'): string { const totals = new Map<string, number>(); for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item[field]); return [...totals.entries()].map(([currency, value]) => `${currency} ${value.toFixed(2)}`).join(' · ') || 'sin evidencia exacta'; }
const fieldClass = 'rounded border border-zinc-700 bg-zinc-950 p-2';
type UnallocatedItem = { readonly cost: number; readonly currency: string; readonly serviceName: string; readonly cloudAccountId: string; readonly resourceId?: string; readonly cloudResourceId?: string; readonly suggestedCriteria: readonly string[] };
