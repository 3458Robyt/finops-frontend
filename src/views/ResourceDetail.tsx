export default function ResourceDetail({ resourceId, onBack }: { resourceId: string, onBack: () => void }) {
  return (
    <div className="animate-in fade-in duration-500 w-full max-w-5xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-[0_40px_100px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-5 md:px-10 md:py-7 border-b border-zinc-800/50 bg-zinc-950/20">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="size-10 md:size-12 rounded-2xl bg-tak-yellow/10 flex items-center justify-center border border-tak-yellow/20 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
            <span className="material-symbols-outlined text-tak-yellow text-2xl md:text-3xl">insights</span>
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-black tracking-tight text-white uppercase italic">Detalle de Recurso</h2>
            <p className="text-[10px] md:text-xs text-zinc-500 font-bold tracking-widest uppercase">FinOps Console • Cloud Optimizer</p>
          </div>
        </div>
        <button onClick={onBack} className="size-10 md:size-12 flex items-center justify-center rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white border border-zinc-700/50 active:scale-95">
          <span className="material-symbols-outlined font-bold">close</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          <div className="lg:col-span-7 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6 bg-zinc-950/30 border border-zinc-800 p-6 md:p-8 rounded-3xl">
              <div className="flex-1">
                <span className="text-[10px] font-black text-tak-yellow uppercase tracking-[0.25em]">Identificador del Recurso</span>
                <h3 className="text-xl md:text-2xl font-black mt-2 text-white flex items-center flex-wrap gap-3">
                  {resourceId}
                  <span className="px-3 py-1 rounded-full bg-tak-yellow/10 text-[10px] font-black text-tak-yellow border border-tak-yellow/20">AWS EC2</span>
                </h3>
              </div>
              <div className="md:text-right border-t md:border-t-0 md:border-l border-zinc-800 pt-5 md:pt-0 md:pl-8">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo Actual</span>
                <p className="text-lg md:text-xl font-bold text-zinc-100">t3.xlarge</p>
              </div>
            </div>
            
            <div className="bg-zinc-950/20 border border-zinc-800 rounded-3xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h4 className="font-black text-zinc-200 text-base md:text-lg uppercase tracking-tight">Histórico de Uso (14 días)</h4>
                  <p className="text-xs text-zinc-500 font-medium">Métricas de rendimiento en alta resolución</p>
                </div>
                <div className="flex items-center gap-6 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-tak-yellow shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                    <span className="text-[10px] font-black text-zinc-300 uppercase">CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-zinc-600 border border-zinc-500/20"></div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase">RAM</span>
                  </div>
                </div>
              </div>
              
              <div className="relative h-56 md:h-72 w-full">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 240">
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="20" y2="20"></line>
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="90" y2="90"></line>
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="160" y2="160"></line>
                  <line className="stroke-zinc-800" strokeDasharray="4" x1="0" x2="800" y1="230" y2="230"></line>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#FACC15" stopOpacity="0.3"></stop>
                      <stop offset="100%" stopColor="#FACC15" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                  <path d="M0,180 L80,185 L160,175 L240,190 L320,185 L400,188 L480,182 L560,186 L640,180 L720,185 L800,178" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2"></path>
                  <path d="M0,220 L50,218 L100,225 L150,210 L200,222 L250,215 L300,228 L350,212 L400,218 L450,225 L500,218 L550,210 L600,224 L650,215 L700,222 L750,228 L800,215" fill="none" stroke="#FACC15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
                  <path d="M0,220 L50,218 L100,225 L150,210 L200,222 L250,215 L300,228 L350,212 L400,218 L450,225 L500,218 L550,210 L600,224 L650,215 L700,222 L750,228 L800,215 V240 H0 Z" fill="url(#cpuGradient)"></path>
                </svg>
                <div className="flex justify-between mt-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <span>14 Días atrás</span>
                  <span className="hidden md:block">Periodo de Análisis</span>
                  <span className="text-tak-yellow">Tiempo Real</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-5">
              <div className="bg-zinc-950/20 border border-zinc-800 p-6 md:p-7 rounded-3xl">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Costo Actual Mensual</p>
                <p className="text-2xl md:text-3xl font-black text-white">$62.40 <span className="text-xs font-medium text-zinc-500 ml-1 tracking-tight">USD</span></p>
              </div>
              <div className="bg-tak-yellow/5 border border-tak-yellow/20 p-6 md:p-7 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-tak-yellow/10 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                <p className="text-[10px] font-black text-tak-yellow uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="size-2 bg-tak-yellow rounded-full animate-ping"></span>
                  Potencial de Ahorro
                </p>
                <p className="text-3xl md:text-4xl font-black text-tak-yellow tracking-tighter">-$42.50 <span className="text-sm font-medium opacity-60 ml-1">/mes</span></p>
              </div>
            </div>
            
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col relative">
               <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tak-yellow/0 via-tak-yellow/50 to-tak-yellow/0"></div>
              <div className="bg-zinc-900/50 px-6 py-4 flex items-center gap-3 border-b border-zinc-800">
                <span className="material-symbols-outlined text-tak-yellow text-2xl">auto_awesome</span>
                <h4 className="text-xs font-black uppercase tracking-[0.15em] text-white italic">Análisis Inteligente TAK</h4>
              </div>
              <div className="p-6 md:p-8 space-y-6 flex-1">
                <p className="text-sm md:text-base leading-relaxed text-zinc-300 font-medium">
                  "El motor de IA ha detectado que <span className="text-tak-yellow font-bold">{resourceId}</span> mantiene un patrón de subutilización extrema."
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                    <span className="material-symbols-outlined text-tak-yellow text-xl">speed</span>
                    <p className="text-xs md:text-sm text-zinc-400 font-medium">
                      Pico de CPU máximo: <span className="text-white font-black">4.2%</span>
                      <span className="block text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Altamente ineficiente</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                    <span className="material-symbols-outlined text-tak-yellow text-xl">memory</span>
                    <p className="text-xs md:text-sm text-zinc-400 font-medium">
                      Uso de RAM constante: <span className="text-white font-black">12%</span>
                      <span className="block text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Capacidad excesiva</span>
                    </p>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-zinc-800 mt-auto">
                  <p className="text-[10px] font-black text-tak-yellow mb-3 uppercase tracking-widest italic">Recomendación Ejecutiva:</p>
                  <p className="text-sm md:text-base text-zinc-100 font-bold leading-relaxed">
                    Migrar inmediatamente a <span className="text-tak-yellow underline underline-offset-4 decoration-2">t3.small</span>. 
                    Ahorro proyectado del <span className="text-tak-yellow">68%</span> anual.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <button onClick={onBack} className="w-full bg-tak-yellow hover:bg-yellow-400 py-4 rounded-2xl text-zinc-950 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_10px_30px_-10px_rgba(250,204,21,0.3)]">
                <span className="material-symbols-outlined font-black">bolt</span>
                APLICAR AHORRO AHORA
              </button>
              <button onClick={onBack} className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 rounded-2xl text-zinc-400 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] border border-zinc-800">
                IGNORAR SUGERENCIA
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 md:px-10 md:py-6 bg-zinc-950/80 border-t border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="size-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">IA Conectada • Análisis en Real Time</span>
        </div>
        <p className="text-[9px] md:text-[10px] text-zinc-600 font-black tracking-widest uppercase">FinOps Demo © {new Date().getFullYear()} • Powered by FinOps AI</p>
      </div>
    </div>
  );
}
