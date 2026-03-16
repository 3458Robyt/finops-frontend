
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const dataProd = [
  { name: '1 Mar', asIs: 4000, toBe: 2400 },
  { name: '5 Mar', asIs: 4200, toBe: 2200 },
  { name: '10 Mar', asIs: 4500, toBe: 2500 },
  { name: '15 Mar', asIs: 6800, toBe: 2800 }, // Pico crítico
  { name: '20 Mar', asIs: 5100, toBe: 2700 },
  { name: '25 Mar', asIs: 4900, toBe: 2600 },
  { name: '30 Mar', asIs: 5000, toBe: 2500 },
];

const dataDev = [
  { name: '1 Mar', asIs: 800, toBe: 750 },
  { name: '5 Mar', asIs: 900, toBe: 800 },
  { name: '10 Mar', asIs: 850, toBe: 780 },
  { name: '15 Mar', asIs: 950, toBe: 820 },
  { name: '20 Mar', asIs: 820, toBe: 760 },
  { name: '25 Mar', asIs: 890, toBe: 800 },
  { name: '30 Mar', asIs: 860, toBe: 790 },
];

export default function Dashboard({ account }: { account: 'prod' | 'dev' }) {
  const isProd = account === 'prod';
  const chartData = isProd ? dataProd : dataDev;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-white">account_balance_wallet</span>
          </div>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Gasto vs Presupuesto</p>
          <div className="flex items-end gap-2 mb-4">
            <h3 className="text-3xl font-black text-white">{isProd ? '$34.5K' : '$3.2K'}</h3>
            <span className="text-zinc-500 text-sm font-medium mb-1">/ {isProd ? '$40K' : '$5K'}</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div className={`h-full rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)] ${isProd ? 'bg-red-500 w-[86%]' : 'bg-tak-yellow w-[64%]'}`}></div>
          </div>
          <div className="flex justify-between mt-4">
             <p className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-green-500 font-bold">arrow_downward</span>
                {isProd ? '12.4% vs Mes Anterior' : '2.1% vs Mes Anterior'}
             </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center gap-5 lg:gap-6">
          <div className="size-12 lg:size-14 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
            <span className="material-symbols-outlined text-red-500 text-2xl lg:text-3xl">delete_sweep</span>
          </div>
          <div>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Desperdicio Identificado</h3>
            <p className="text-2xl lg:text-3xl font-bold text-white">{isProd ? '$8,420' : '$420'}</p>
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded uppercase mt-2 inline-block border border-red-500/20">Acción Requerida</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center gap-5 lg:gap-6 md:col-span-2 lg:col-span-1">
          <div className="size-12 lg:size-14 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
            <span className="material-symbols-outlined text-green-500 text-2xl lg:text-3xl">account_balance_wallet</span>
          </div>
          <div>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">ROI de Ahorro Neto</h3>
            <p className="text-2xl lg:text-3xl font-bold text-white">{isProd ? '24.8%' : '8.4%'}</p>
            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase mt-2 inline-block border border-green-500/20">
              {isProd ? '+2.4% este Q' : '+1.1% este Q'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-tak-yellow">insights</span>
              Proyección de Consumo Optimizada
            </h3>
            <p className="text-zinc-500 text-sm">Histórico (AS-IS) vs Proyectado (TO-BE)</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-zinc-700"></span>
               <span className="text-xs font-bold text-zinc-400">Current AS-IS</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-tak-yellow"></span>
               <span className="text-xs font-bold text-zinc-400">Opt TO-BE</span>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAsIs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3f3f46" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorToBe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FACC15" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}
              />
              <Area type="monotone" dataKey="asIs" stroke="#52525b" strokeWidth={3} fillOpacity={1} fill="url(#colorAsIs)" />
              <Area type="monotone" dataKey="toBe" stroke="#FACC15" strokeWidth={3} fillOpacity={1} fill="url(#colorToBe)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="size-10 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-tak-yellow">
                <span className="material-symbols-outlined">memory</span>
              </div>
              <span className="bg-tak-yellow/10 text-tak-yellow text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">IA Suggestion</span>
            </div>
            <h4 className="text-white font-bold mb-1">Apagar 3 Servidores EC2</h4>
            <p className="text-zinc-400 text-xs mb-4">Los fines de semana no se detecta tráfico. Sugerimos orquestar el apagado automático.</p>
            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl mb-4 border border-zinc-800">
               <span className="text-xs text-zinc-500 font-medium">Ahorro Mensual</span>
               <span className="text-tak-yellow font-black">$150.00</span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-tak-yellow hover:bg-yellow-400 text-zinc-950 text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-colors">Aprobar</button>
              <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors">Ignorar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
