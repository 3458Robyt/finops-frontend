import { useEffect, useState } from 'react';
import { fetchAdoptionKpis, fetchRecommendations, fetchSavingsKpis, type Recommendation } from '../services/api';

interface IntegrationCardProps {
  title: string;
  icon: string;
  status: boolean;
}

export default function History({ token }: { readonly token: string }) {
  const [activeTab, setActiveTab] = useState('audit');
  const [recommendations, setRecommendations] = useState<readonly Recommendation[]>([]);
  const [summary, setSummary] = useState({
    estimated: 0,
    observed: 0,
    acceptanceRate: 0,
  });

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
            observed: savingsResponse.savings.observedMonthlySavings,
            acceptanceRate: adoptionResponse.adoption.acceptanceRate,
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
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-full max-w-sm mx-auto sm:mx-0">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
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
                      +${(row.estimatedMonthlySavings ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 border-t border-zinc-800">
            <SummaryCard label="Ahorro estimado" value={`$${summary.estimated.toFixed(2)}`} />
            <SummaryCard label="Ahorro observado" value={`$${summary.observed.toFixed(2)}`} />
            <SummaryCard label="Aceptacion" value={`${(summary.acceptanceRate * 100).toFixed(0)}%`} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          <IntegrationCard title="AWS Cost Explorer API" icon="cloud" status={true} />
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function IntegrationCard({ title, icon, status }: IntegrationCardProps) {
  const [isActive, setIsActive] = useState(status);

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all shadow-lg relative overflow-hidden group">
      {isActive && <div className="absolute top-0 right-0 w-24 h-24 bg-tak-yellow/5 rounded-full blur-2xl pointer-events-none"></div>}
      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-zinc-800 text-tak-yellow' : 'bg-zinc-800 text-zinc-500'}`}>
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in mt-1">
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => setIsActive(!isActive)}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-zinc-700 border-4 border-zinc-900 appearance-none cursor-pointer checked:right-0 checked:bg-tak-yellow checked:border-tak-yellow transition-all"
          />
          <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${isActive ? 'bg-tak-yellow/20 border-tak-yellow/30' : 'bg-zinc-800 border-zinc-700 border'}`}></label>
        </div>
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
