

export default function Chat() {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] relative animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6">
        <div className="flex flex-col gap-1 items-end">
          <div className="bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] sm:max-w-[70%] text-sm">
            Hola, detecté un incremento inusual en la factura de ayer. ¿Puedes decirme la causa?
          </div>
          <span className="text-[10px] text-zinc-500 font-bold pr-1 uppercase">10:42 AM</span>
        </div>
        
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-6 bg-tak-yellow flex items-center justify-center rounded-sm">
              <span className="material-symbols-outlined text-[14px] text-zinc-950 font-bold">smart_toy</span>
            </div>
            <span className="text-[10px] font-bold text-tak-yellow uppercase tracking-widest">Asistente FinOps</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[95%] sm:max-w-[80%] text-sm leading-relaxed">
            ¡Claro! Analicé los datos de Cost Explorer y encontré que en tu cuenta <strong className="text-white">Prod Principal</strong> se levantaron 3 clústeres de EMR que no se apagaron después del procesamiento de logs.
            <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 w-full">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">warning</span>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Alerta de Gasto</span>
                </div>
                <span className="text-tak-yellow font-black text-sm">+$240.50</span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Clústeres EMR ociosos desde las 02:00 AM.</p>
              <button className="w-full bg-tak-yellow/10 text-tak-yellow border border-tak-yellow/20 font-bold text-xs uppercase tracking-widest py-2 rounded-lg hover:bg-tak-yellow hover:text-zinc-950 transition-colors">
                Apagar Clústeres Ahora
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
          <button className="whitespace-nowrap bg-zinc-900 border border-zinc-800 hover:border-tak-yellow text-xs font-bold text-zinc-400 hover:text-tak-yellow px-4 py-1.5 rounded-full transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">pie_chart</span> Analizar Costos S3
          </button>
          <button className="whitespace-nowrap bg-zinc-900 border border-zinc-800 hover:border-tak-yellow text-xs font-bold text-zinc-400 hover:text-tak-yellow px-4 py-1.5 rounded-full transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span> Ver Anomalías Hoy
          </button>
          <button className="whitespace-nowrap bg-zinc-900 border border-zinc-800 hover:border-tak-yellow text-xs font-bold text-zinc-400 hover:text-tak-yellow px-4 py-1.5 rounded-full transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">receipt_long</span> Resumen Semanal
          </button>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Escribe tu consulta a la IA (ej: Muéstrame el ROI actual)..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-tak-yellow transition-all shadow-inner"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-tak-yellow text-zinc-950 rounded-xl flex items-center justify-center hover:bg-yellow-400 transition-colors shadow">
            <span className="material-symbols-outlined font-bold">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
