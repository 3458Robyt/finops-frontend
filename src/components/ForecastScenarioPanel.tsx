import type { CostForecastScenario } from '../services/api';
import { formatCurrency } from '../views/dashboard/dashboardPresentation';

const labels: Record<CostForecastScenario['scenario'], string> = {
  BASELINE: 'Base histórica',
  CURRENT_TREND: 'Tendencia actual',
  APPROVED: 'Con oportunidades aprobadas',
  EXECUTED: 'Con acciones ejecutadas',
  VERIFIED: 'Ahorro verificado',
};

const tones: Record<CostForecastScenario['scenario'], string> = {
  BASELINE: 'border-zinc-700 bg-zinc-950 text-zinc-200',
  CURRENT_TREND: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  APPROVED: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
  EXECUTED: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  VERIFIED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

export function ForecastScenarioPanel({ scenarios }: { readonly scenarios: readonly CostForecastScenario[] }) {
  const ordered = [...scenarios].sort((left, right) => scenarioOrder(left.scenario) - scenarioOrder(right.scenario));
  return (
    <section className="ui-surface p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">Proyección con evidencia</p>
          <h3 className="mt-1 text-lg font-black text-white">¿Qué cambia si actuamos?</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">Separa la tendencia de los ahorros aprobados, ejecutados y verificados. No mezcla escenarios ni inventa ahorro.</p>
        </div>
        <span className="material-symbols-outlined text-2xl text-tak-yellow">query_stats</span>
      </div>
      {ordered.length === 0 ? (
        <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm font-bold text-zinc-500">Aún no hay forecast persistido para construir escenarios comparables.</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ordered.map((scenario) => (
            <article key={`${scenario.scenario}-${scenario.forecastMonth}-${scenario.currency}`} className={`rounded-2xl border p-4 ${tones[scenario.scenario]}`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{labels[scenario.scenario]}</p>
              <p className="mt-3 text-xl font-black">{formatCurrency(scenario.predictedCost, scenario.currency)}</p>
              <p className="mt-1 text-[11px] font-bold opacity-70">{scenario.forecastMonth} · confianza {Math.round(scenario.confidence * 100)}%</p>
              {scenario.savingsApplied > 0 && <p className="mt-3 text-xs font-black">Ahorro aplicado: {formatCurrency(scenario.savingsApplied, scenario.currency)}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function scenarioOrder(scenario: CostForecastScenario['scenario']): number {
  return ['BASELINE', 'CURRENT_TREND', 'APPROVED', 'EXECUTED', 'VERIFIED'].indexOf(scenario);
}
