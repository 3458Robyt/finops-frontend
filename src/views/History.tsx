import { useEffect, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import { fetchAdoptionKpis, fetchRecommendations, fetchSavingsKpis, type Recommendation } from '../services/api';

interface IntegrationCardProps {
  title: string;
  icon: string;
  status: boolean;
}

export default function History() {
  const token = useAccessToken();
  const [activeTab, setActiveTab] = useState('audit');
  const [recommendations, setRecommendations] = useState<readonly Recommendation[]>([]);
  const [summary, setSummary] = useState({
    estimated: 0,
    observed: 0,
    acceptanceRate: 0,
    currency: 'USD',
  });
  const [engagement, setEngagement] = useState<{
    activeUsers: number;
    recurringUsers: number;
    chatInteractions: number;
    notificationReadRate: number;
  } | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchRecommendations(token),
      fetchSavingsKpis(token),
      fetchAdoptionKpis(token),
    ])
      .then(([recommendationResponse, savingsResponse, adoptionResponse]) => {
        if (active) {
          setRecommendations(recommendationResponse.recommendations);
          setSummary({
            estimated: savingsResponse.savings.estimatedMonthlySavings,
            observed: savingsResponse.savings.verifiedMonthlySavings,
            acceptanceRate: adoptionResponse.adoption.acceptanceRate,
            currency: savingsResponse.savings.currency,
          });
          const adoptionEngagement = adoptionResponse.adoption.engagement;
          setEngagement(adoptionEngagement === undefined ? null : {
            activeUsers: adoptionEngagement.activeUsers,
            recurringUsers: adoptionEngagement.recurringUsers,
            chatInteractions: adoptionEngagement.chatInteractions,
            notificationReadRate: adoptionEngagement.notificationReadRate,
          });
        }
      })
      .catch(() => {
        if (active) {
          setRecommendations([]);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="ui-page space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <header className="ui-page-header">
        <div>
          <p className="ui-kicker">Gobierno y resultados</p>
          <h1 className="ui-page-title mt-2">Historial y estado operativo</h1>
          <p className="ui-page-lead">Conserva la trazabilidad de las oportunidades y el estado de las integraciones que sostienen el análisis.</p>
        </div>
        <span className="ui-status ui-status-accent shrink-0">Auditoría continua</span>
      </header>
      <div className="flex w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${activeTab === 'audit' ? 'bg-zinc-800 text-tak-yellow shadow' : 'text-zinc-500 hover:text-white'}`}
        >
          Historial Ops
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-zinc-800 text-tak-yellow shadow' : 'text-zinc-500 hover:text-white'}`}
        >
          Integraciones
        </button>
      </div>

      {activeTab === 'audit' ? (
        <div className="ui-surface overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-tak-yellow">history_toggle_off</span>
              Registro de Auditoria
            </h3>
            <button className="bg-zinc-800 hover:bg-zinc-700 text-tak-yellow text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">download</span>
              Exportar
            </button>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-zinc-950/50">
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Fecha</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Cuenta</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Recomendacion</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Estado</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 text-right">Ahorro Est.</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm font-bold text-zinc-500">Sin recomendaciones registradas</td>
                  </tr>
                ) : recommendations.slice(0, 12).map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                    <td className="p-4 text-xs font-medium text-zinc-400">{formatDate(row.updatedAt)}</td>
                    <td className="p-4 text-sm font-medium text-white">{row.cloudAccountId}</td>
                    <td className="p-4 text-sm text-zinc-300">{row.title}</td>
                    <td className="p-4">
                      <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[10px]">verified_user</span>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-green-400 font-black text-right">
                      +{formatCurrency(row.estimatedMonthlySavings ?? 0, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-zinc-800 p-6 sm:grid-cols-2 xl:grid-cols-7">
            <SummaryCard label="Ahorro estimado" value={formatCurrency(summary.estimated, summary.currency)} />
            <SummaryCard label="Ahorro verificado" value={formatCurrency(summary.observed, summary.currency)} />
            <SummaryCard label="Aceptacion" value={`${(summary.acceptanceRate * 100).toFixed(0)}%`} />
            <SummaryCard label="Usuarios activos" value={engagement === null ? '—' : String(engagement.activeUsers)} />
            <SummaryCard label="Usuarios recurrentes" value={engagement === null ? '—' : String(engagement.recurringUsers)} />
            <SummaryCard label="Consultas IA" value={engagement === null ? '—' : String(engagement.chatInteractions)} />
            <SummaryCard label="Alertas leídas" value={engagement === null ? '—' : `${(engagement.notificationReadRate * 100).toFixed(0)}%`} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          <IntegrationCard title="AWS Cost Explorer API" icon="cloud" status={false} />
          <IntegrationCard title="Supabase PostgreSQL" icon="database" status={true} />
          <IntegrationCard title="NVIDIA NIM IA" icon="smart_toy" status={true} />
          <IntegrationCard title="Telegram MVP" icon="send" status={false} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="ui-surface-raised p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function IntegrationCard({ title, icon, status }: IntegrationCardProps) {
  const isActive = status;

  return (
    <div className="ui-surface relative flex flex-col justify-between overflow-hidden p-6 transition-colors hover:border-zinc-700">
      {isActive && <div className="absolute top-0 right-0 w-24 h-24 bg-tak-yellow/5 rounded-full blur-2xl pointer-events-none"></div>}
      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-zinc-800 text-tak-yellow' : 'bg-zinc-800 text-zinc-500'}`}>
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-tak-yellow/15 text-tak-yellow' : 'bg-zinc-800 text-zinc-500'}`}>
          {isActive ? 'Disponible' : 'En standby'}
        </span>
      </div>
      <div className="z-10 relative">
        <h4 className="text-base font-bold text-white">{title}</h4>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          {isActive ? 'Integracion disponible para datos, auditoria o IA.' : 'Integracion planificada; no participa en el MVP actual.'}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${isActive ? 'bg-tak-yellow' : 'bg-zinc-600'}`}></span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-tak-yellow' : 'text-zinc-500'}`}>
            {isActive ? 'Conectado' : 'Pendiente'}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCurrency(value: number, currency: string): string {
  const normalized = /^[A-Z]{3}$/.test(currency.trim().toUpperCase()) ? currency.trim().toUpperCase() : 'USD';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: normalized, maximumFractionDigits: 2 }).format(value);
}
