import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { archiveBudget, createBudget, evaluateBudgets, fetchBudgetAlerts, fetchBudgetPerformance, fetchBudgets, updateBudget, type Budget, type BudgetPerformance, type BudgetScope } from '../services/api';

type Alert = { readonly id: string; readonly level: string; readonly createdAt: string };

export default function Budgets({ token, canManage, onOpenAllocation }: { readonly token: string; readonly canManage: boolean; readonly onOpenAllocation: () => void }) {
  const [period, setPeriod] = useState(currentMonth());
  const [cloudAccountId, setCloudAccountId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [budgets, setBudgets] = useState<readonly Budget[]>([]);
  const [performance, setPerformance] = useState<Record<string, BudgetPerformance>>({});
  const [alerts, setAlerts] = useState<Record<string, readonly Alert[]>>({});
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchBudgets(token, { period, ...(cloudAccountId === '' ? {} : { cloudAccountId }), ...(serviceName === '' ? {} : { serviceName }) });
      const details = await Promise.all(result.budgets.map(async (budget) => [await fetchBudgetPerformance(token, budget.id), await fetchBudgetAlerts(token, budget.id)] as const));
      setBudgets(result.budgets);
      setPerformance(Object.fromEntries(details.map(([detail]) => [detail.performance.budget.id, detail.performance])));
      setAlerts(Object.fromEntries(details.map(([detail, budgetAlerts]) => [detail.performance.budget.id, budgetAlerts.alerts])));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar presupuestos');
    } finally { setLoading(false); }
  }, [token, period, cloudAccountId, serviceName]);

  useEffect(() => { void load(); }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const scope = form.get('scope') as BudgetScope;
      await createBudget(token, { scope, period, amount: Number(form.get('amount')), currency: String(form.get('currency')).toUpperCase(), warningThreshold: Number(form.get('warningThreshold')) / 100, criticalThreshold: Number(form.get('criticalThreshold')) / 100, exceededThreshold: Number(form.get('exceededThreshold')) / 100, ...(scope === 'SERVICE' ? { serviceName: String(form.get('serviceName')) } : {}), ...(scope === 'CLOUD_ACCOUNT' ? { cloudAccountId: String(form.get('cloudAccountId')) } : {}) });
      setCreating(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible crear el presupuesto'); }
  };

  const editBudget = async (budget: Budget) => {
    const amount = window.prompt('Importe mensual', String(budget.amount));
    const warningThreshold = amount === null ? null : window.prompt('Umbral advertencia (%)', String(budget.warningThreshold * 100));
    const criticalThreshold = warningThreshold === null ? null : window.prompt('Umbral crítico (%)', String(budget.criticalThreshold * 100));
    const exceededThreshold = criticalThreshold === null ? null : window.prompt('Umbral excedido (%)', String(budget.exceededThreshold * 100));
    if (amount === null || warningThreshold === null || criticalThreshold === null || exceededThreshold === null) return;
    const values = [Number(amount), Number(warningThreshold), Number(criticalThreshold), Number(exceededThreshold)];
    if (!values.every(Number.isFinite) || values[0]! <= 0 || !(values[1]! > 0 && values[1]! < values[2]! && values[2]! < values[3]!)) { setError('Importe y umbrales inválidos.'); return; }
    try { await updateBudget(token, budget.id, { amount: values[0]!, warningThreshold: values[1]! / 100, criticalThreshold: values[2]! / 100, exceededThreshold: values[3]! / 100 }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible editar el presupuesto'); }
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-black">Presupuestos</h1><p className="mt-1 text-zinc-400">Límites mensuales reales, gasto y forecast persistido.</p></div>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Periodo" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2" />
        {canManage && <button onClick={() => setCreating((value) => !value)} className="rounded-lg bg-tak-yellow px-4 py-2 font-bold text-zinc-950">Nuevo presupuesto</button>}
      </div>
    </header>
    <div className="grid gap-2 md:grid-cols-2"><input value={cloudAccountId} onChange={(event) => setCloudAccountId(event.target.value)} placeholder="Filtrar por ID de cuenta" className="rounded border border-zinc-700 bg-zinc-900 p-2" /><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Filtrar por servicio" className="rounded border border-zinc-700 bg-zinc-900 p-2" /></div>
    {error !== null && <p className="rounded-lg border border-red-500/40 p-3 text-red-300">{error}</p>}
    {creating && <CreateBudgetForm onSubmit={create} />}
    {loading ? <p className="text-zinc-400">Cargando presupuestos…</p> : budgets.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-400">No hay presupuesto real configurado para este periodo.</div> : <div className="grid gap-4">{budgets.map((budget) => <BudgetCard key={budget.id} budget={budget} performance={performance[budget.id]} alerts={alerts[budget.id] ?? []} canManage={canManage} onEvaluate={() => void evaluateBudgets(token, budget.id).then(load)} onEdit={() => void editBudget(budget)} onArchive={() => void archiveBudget(token, budget.id).then(load)} onOpenAllocation={onOpenAllocation} />)}</div>}
  </div>;
}

function CreateBudgetForm({ onSubmit }: { readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-4"><select name="scope" className="rounded border border-zinc-700 bg-zinc-950 p-2"><option value="TENANT">Tenant</option><option value="SERVICE">Servicio</option><option value="CLOUD_ACCOUNT">Cuenta cloud</option></select><input name="amount" required min="0.01" step="0.01" type="number" placeholder="Importe" className="rounded border border-zinc-700 bg-zinc-950 p-2" /><input name="currency" defaultValue="USD" maxLength={3} required className="rounded border border-zinc-700 bg-zinc-950 p-2" /><button className="rounded bg-white font-bold text-zinc-950">Guardar</button><input name="warningThreshold" defaultValue="80" min="1" max="99" type="number" required placeholder="Advertencia %" className="rounded border border-zinc-700 bg-zinc-950 p-2" /><input name="criticalThreshold" defaultValue="90" min="1" max="100" type="number" required placeholder="Crítico %" className="rounded border border-zinc-700 bg-zinc-950 p-2" /><input name="exceededThreshold" defaultValue="100" min="1" type="number" required placeholder="Excedido %" className="rounded border border-zinc-700 bg-zinc-950 p-2" /><input name="serviceName" placeholder="Servicio (si aplica)" className="rounded border border-zinc-700 bg-zinc-950 p-2" /><input name="cloudAccountId" placeholder="ID cuenta (si aplica)" className="rounded border border-zinc-700 bg-zinc-950 p-2" /></form>; }
function BudgetCard({ budget, performance, alerts, canManage, onEvaluate, onEdit, onArchive, onOpenAllocation }: { readonly budget: Budget; readonly performance?: BudgetPerformance; readonly alerts: readonly Alert[]; readonly canManage: boolean; readonly onEvaluate: () => void; readonly onEdit: () => void; readonly onArchive: () => void; readonly onOpenAllocation: () => void }) { const ratio = Math.min(performance?.consumedPercent ?? 0, 100); return <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex justify-between gap-4"><div><h2 className="font-bold">{budget.scope === 'TENANT' ? 'Tenant completo' : budget.serviceName ?? budget.scopeKey}</h2><p className="text-sm text-zinc-500">{budget.currency} {budget.amount.toFixed(2)} · {budget.scope}</p></div><span className={`font-bold ${performance?.health === 'EXCEEDED' ? 'text-red-400' : performance?.health === 'WARNING' || performance?.health === 'CRITICAL' ? 'text-yellow-300' : 'text-green-400'}`}>{performance?.health ?? 'Cargando'}</span></div><div className="mt-4 h-2 overflow-hidden rounded bg-zinc-800"><div className="h-full bg-tak-yellow" style={{ width: `${ratio}%` }} /></div><div className="mt-3 grid gap-3 text-sm md:grid-cols-4"><p>Gasto real: <b>{performance ? `${budget.currency} ${performance.actualCost.toFixed(2)}` : '—'}</b></p><p>Disponible: <b>{performance ? `${budget.currency} ${performance.remainingBudget.toFixed(2)}` : '—'}</b></p><p>Forecast: <b>{performance?.forecastCost === undefined ? 'No disponible' : `${budget.currency} ${performance.forecastCost.toFixed(2)}`}</b></p><p>Desviación: <b>{performance?.varianceAmount === undefined ? 'No disponible' : `${budget.currency} ${performance.varianceAmount.toFixed(2)}`}</b></p></div><p className="mt-3 text-xs text-zinc-500">Alertas emitidas: {alerts.length === 0 ? 'ninguna' : alerts.map((alert) => alert.level).join(', ')}</p><div className="mt-4 flex flex-wrap gap-3 text-sm">{budget.scope !== 'TENANT' && <button onClick={onOpenAllocation}>Ver asignación de costos</button>}{canManage && <><button onClick={onEvaluate} className="rounded border border-zinc-600 px-3 py-1">Evaluar umbrales</button><button onClick={onEdit}>Editar importe</button><button onClick={onArchive} className="text-red-300">Archivar</button></>}</div></article>; }
function currentMonth(): string { const date = new Date(); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
