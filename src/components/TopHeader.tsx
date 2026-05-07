
type CurrentView = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail';
type Account = 'prod' | 'dev';

interface TopHeaderProps {
  currentView: CurrentView;
  activeAccount: Account;
  onAccountChange: (account: Account) => void;
}

const viewTitles: Partial<Record<CurrentView, string>> = {
  dashboard: 'Panel Ejecutivo ROI',
  console: 'Consola Técnica FinOps',
  chat: 'Asistente Inteligente',
  history: 'Historial de Optimizaciones',
  profile: 'Perfil de Usuario y Seguridad',
};

export default function TopHeader({ currentView, activeAccount, onAccountChange }: TopHeaderProps) {
  if (currentView === 'login') return null;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 lg:px-10 py-3 lg:py-4 flex items-center justify-between">
      <div className="flex items-center gap-4 lg:gap-8 flex-1">
        <div className="lg:hidden size-8 bg-tak-yellow flex items-center justify-center rounded shadow-sm">
          <span className="material-symbols-outlined text-zinc-950 text-xl font-bold">query_stats</span>
        </div>
        <h1 className="text-lg font-bold text-white uppercase tracking-tight hidden lg:block">
          {viewTitles[currentView] || 'FinOps FinOps Demo'}
        </h1>
      </div>
      
      <div className="flex items-center gap-3 lg:gap-6 ml-4">
        <div className="hidden sm:flex flex-col items-end mr-2 relative group cursor-pointer">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Entorno FOCUS Activo</span>
          <select 
            value={activeAccount} 
            onChange={(e) => onAccountChange(e.target.value as Account)}
            className="appearance-none bg-zinc-900 border border-zinc-700 text-xs font-bold text-tak-yellow rounded px-3 py-1 pr-8 outline-none focus:ring-1 focus:ring-tak-yellow focus:border-tak-yellow cursor-pointer"
          >
            <option value="prod">TAK - Prod Principal</option>
            <option value="dev">TAK - Dev/Staging</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-tak-yellow mt-4 text-sm">
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-800 hidden sm:block"></div>

        <button className="relative p-1.5 text-zinc-400 hover:text-tak-yellow transition-colors bg-zinc-900 rounded-full border border-zinc-800">
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-1 right-1 size-2.5 bg-red-500 rounded-full border-2 border-zinc-900"></span>
        </button>
      </div>
    </header>
  );
}
