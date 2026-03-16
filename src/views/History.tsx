import { useState } from 'react';

const auditData = [
  { id: 1, date: '01 Mar 2026 14:30', resource: 'i-0abcd1234ef', action: 'Apagado Automático', user: 'Andrés Rivera', saving: 15.50 },
  { id: 2, date: '28 Feb 2026 09:15', resource: 'db-XY1Z2A3B4', action: 'Reducción Storage', user: 'Auto-IA', saving: 45.00 },
  { id: 3, date: '25 Feb 2026 18:45', resource: 's3-logs-bucket', action: 'Transición Glacier', user: 'Andrés Rivera', saving: 8.20 },
  { id: 4, date: '20 Feb 2026 11:20', resource: 'i-0xvcd9876ef', action: 'Rightsizing (xlarge -> large)', user: 'María Gómez', saving: 120.00 },
  { id: 5, date: '15 Feb 2026 08:00', resource: 'vpc-nat-gw-1', action: 'Eliminación (Sin uso)', user: 'Auto-IA', saving: 32.50 },
];

export default function History() {
  const [activeTab, setActiveTab] = useState('audit');

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
              Registro de Auditoría
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
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Recurso</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Acción Tomada</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Aprobado Por</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 text-right">Ahorro Realizado</th>
                </tr>
              </thead>
              <tbody>
                {auditData.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                    <td className="p-4 text-xs font-medium text-zinc-400">{row.date}</td>
                    <td className="p-4 text-sm font-medium text-white">{row.resource}</td>
                    <td className="p-4 text-sm text-zinc-300">{row.action}</td>
                    <td className="p-4 flex items-center gap-2">
                      {row.user === 'Auto-IA' ? (
                         <span className="bg-tak-yellow/10 text-tak-yellow text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit">
                           <span className="material-symbols-outlined text-[10px]">smart_toy</span> IA
                         </span>
                      ) : (
                         <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit">
                           <span className="material-symbols-outlined text-[10px]">person</span> {row.user}
                         </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-green-400 font-black text-right">+${row.saving.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          <IntegrationCard title="AWS Cost Explorer API" icon="cloud" status={true} />
          <IntegrationCard title="Motor n8n (Webhooks)" icon="hub" status={true} />
          <IntegrationCard title="Alertas WhatsApp" icon="chat" status={false} />
          <IntegrationCard title="Slack FinOps Channel" icon="tag" status={true} />
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ title, icon, status }: any) {
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
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{isActive ? 'Sincronización de datos activada y en ejecución continua.' : 'Integración pausada. No se consumen ni emiten datos.'}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${isActive ? 'bg-tak-yellow' : 'bg-zinc-600'}`}></span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-tak-yellow' : 'text-zinc-500'}`}>
            {isActive ? 'Conectado' : 'Inactivo'}
          </span>
        </div>
      </div>
    </div>
  );
}
