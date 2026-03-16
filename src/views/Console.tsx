
const mockDataProd = [
  { id: 'i-0abcd1234efgh5678', service: 'EC2', metric: 'CPU < 1%', action: 'Apagar (Zombie)', saving: 120 },
  { id: 'db-XY1Z2A3B4C5D6E7', service: 'RDS', metric: 'RAM > 90%', action: 'Rightsizing (+1)', saving: -45 },
  { id: 'i-0xvcd9876efgh1234', service: 'EC2', metric: 'CPU < 5%', action: 'Apagar (Fines Sem)', saving: 85 },
];

const mockDataDev = [
  { id: 'i-dev-test01', service: 'EC2', metric: 'CPU < 2%', action: 'Apagar (Zombie)', saving: 15 },
  { id: 's3-backup-dev', service: 'S3', metric: 'Sin uso 30d', action: 'Glacier', saving: 5 },
];

export default function Console({ account, onResourceSelect }: { account: 'prod' | 'dev', onResourceSelect?: (id: string) => void }) {
  const isProd = account === 'prod';
  const tableData = isProd ? mockDataProd : mockDataDev;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 relative">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Anomalías Críticas</p>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tak-yellow text-3xl">warning</span>
            <h3 className="text-3xl font-black text-white">{isProd ? '12' : '2'}</h3>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Recursos Zombie</p>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-zinc-500 text-3xl">sleep</span>
            <h3 className="text-3xl font-black text-white">{isProd ? '45' : '3'}</h3>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Sobreconsumo</p>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-3xl">trending_up</span>
            <h3 className="text-3xl font-black text-white">{isProd ? '3' : '0'}</h3>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-tak-yellow">table_chart</span>
            Recomendaciones Técnicas
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-zinc-950/50">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">ID Recurso</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Servicio</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Métrica</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Acción Sugerida</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 text-right">Ahorro Est.</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                  <td className="p-4 text-sm font-medium text-white">{row.id}</td>
                  <td className="p-4">
                    <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded uppercase">{row.service}</span>
                  </td>
                  <td className="p-4 text-sm text-zinc-400 font-medium">{row.metric}</td>
                  <td className="p-4 text-sm text-tak-yellow font-bold uppercase tracking-tight">{row.action}</td>
                  <td className="p-4 text-sm text-white font-black text-right">${row.saving}</td>
                  <td className="p-4 flex justify-center">
                    <button 
                      onClick={() => onResourceSelect && onResourceSelect(row.id)}
                      className="text-[10px] font-bold bg-tak-yellow/10 hover:bg-tak-yellow/20 text-tak-yellow uppercase tracking-widest transition-colors border border-tak-yellow/20 px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
