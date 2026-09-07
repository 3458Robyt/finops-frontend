import type { IngestionMetricCoverageResponse } from '../../services/api';

type Coverage = IngestionMetricCoverageResponse['coverage'];

const statusLabels: Readonly<Record<Coverage['windows'][number]['status'], string>> = {
  UNKNOWN: 'Sin evaluar',
  COVERED: 'Completa',
  PARTIAL: 'Parcial',
  NO_DATA: 'Sin datos',
  FAILED: 'Fallida',
};

const statusColors: Readonly<Record<Coverage['windows'][number]['status'], string>> = {
  UNKNOWN: 'text-zinc-400',
  COVERED: 'text-emerald-300',
  PARTIAL: 'text-amber-300',
  NO_DATA: 'text-red-300',
  FAILED: 'text-red-300',
};

export default function MetricCoveragePanel({ coverage, loading }: {
  readonly coverage: Coverage | null;
  readonly loading: boolean;
}) {
  return (
    <section className="ui-surface overflow-hidden">
      <header className="border-b border-zinc-800 p-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tak-yellow">data_check</span>
          <h3 className="text-lg font-bold text-white">Cobertura técnica por stream</h3>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Compara las muestras esperadas contra las realmente observadas por día, métrica, recurso y estadística.
          Una ventana parcial no se interpreta como cero.
        </p>
      </header>
      {loading ? <p className="p-6 text-sm font-bold text-zinc-500">Calculando cobertura…</p> : coverage === null ? (
        <p className="p-6 text-sm text-zinc-500">No hay cobertura calculada para una conexión disponible.</p>
      ) : (
        <>
          <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Ventanas" value={coverage.summary.totalWindows} detail={`${coverage.summary.returnedWindows} visibles`} />
            <SummaryCard label="Completas" value={coverage.summary.coveredWindows} detail="Todos los puntos esperados" tone="text-emerald-300" />
            <SummaryCard label="Parciales" value={coverage.summary.partialWindows} detail={`${coverage.summary.missingSamples} muestras faltantes`} tone="text-amber-300" />
            <SummaryCard label="Sin datos / fallidas" value={coverage.summary.noDataWindows + coverage.summary.failedWindows} detail={`${coverage.summary.expectedSamples} esperadas · ${coverage.summary.observedSamples} observadas`} tone="text-red-300" />
          </div>
          <div className="custom-scrollbar max-h-96 overflow-auto border-t border-zinc-800">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead><tr className="bg-zinc-950/50"><Th>Ventana</Th><Th>Stream</Th><Th>Estadística</Th><Th>Estado</Th><Th>Observadas / esperadas</Th></tr></thead>
              <tbody>
                {coverage.windows.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-sm text-zinc-500">No hay ventanas de cobertura calculadas.</td></tr> : coverage.windows.map((window) => (
                  <tr key={window.id} className="border-b border-zinc-800/50 align-top last:border-0 hover:bg-zinc-800/40">
                    <td className="p-4 text-xs text-zinc-400">{formatDate(window.windowStart)}<br />{formatTime(window.windowStart)} – {formatTime(window.windowEnd)}</td>
                    <td className="p-4"><p className="max-w-xs truncate text-sm font-bold text-white" title={window.externalResourceId}>{window.externalResourceId}</p><p className="mt-1 text-xs text-zinc-500">{window.providerNamespace || 'sin namespace'} · {window.metricName}</p></td>
                    <td className="p-4 text-xs text-zinc-300">{window.statistic}<br /><span className="text-zinc-500">{window.granularitySeconds / 60} min</span></td>
                    <td className={`p-4 text-xs font-bold ${statusColors[window.status]}`}>{statusLabels[window.status]}</td>
                    <td className="p-4 text-xs text-zinc-300">{window.observedSamples} / {window.expectedSamples}<br /><span className="text-zinc-500">Faltan {window.missingSamples}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function SummaryCard({ label, value, detail, tone = 'text-white' }: { readonly label: string; readonly value: number; readonly detail: string; readonly tone?: string }) {
  return <div className="ui-surface-raised p-4"><p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p><p className={`mt-2 text-2xl font-black ${tone}`}>{value.toLocaleString('es-CO')}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>;
}

function Th({ children }: { readonly children: React.ReactNode }) { return <th className="border-b border-zinc-800 p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{children}</th>; }
function formatDate(value: string): string { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value)); }
function formatTime(value: string): string { return new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' }).format(new Date(value)); }
