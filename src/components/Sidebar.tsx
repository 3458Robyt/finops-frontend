import type { ApiUser } from '../services/api';
import { getVisibleNavItems, type ApiRole, type AppRole, type CurrentView, type NavView } from './navigation';

interface SidebarProps {
  readonly currentView: CurrentView;
  readonly onViewChange: (view: NavView) => void;
  readonly currentRole: AppRole;
  readonly apiRole: ApiRole;
  readonly user: ApiUser;
}

export default function Sidebar({ currentView, onViewChange, currentRole, apiRole, user }: SidebarProps) {
  if (currentView === 'login') return null;

  const displayName = user.name.trim() !== '' ? user.name : user.email;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || user.email.slice(0, 2).toUpperCase();
  const navItems = getVisibleNavItems(currentRole, apiRole);

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-[100dvh] w-20 flex-col border-r border-zinc-800 bg-zinc-900 lg:flex xl:w-[280px]">
      <div className="shrink-0 p-4 xl:p-8">
        <div className="flex items-center justify-center gap-3 xl:justify-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tak-yellow shadow-[0_0_15px_rgba(250,204,21,0.3)]">
            <span className="material-symbols-outlined font-bold text-zinc-950">query_stats</span>
          </div>
          <div className="hidden min-w-0 xl:block">
            <span className="block text-xl font-bold leading-none tracking-tight text-white">FinOps Demo</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{currentRole === 'admin' ? 'Ingeniería FinOps' : 'Cloud Client'}</span>
          </div>
        </div>
      </div>

      <nav className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3 xl:space-y-2 xl:px-4 xl:py-4" aria-label="Módulos principales">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={() => onViewChange(item.id)}
            className={`flex w-full items-center justify-center gap-4 rounded-lg px-3 py-3 transition-all xl:justify-start xl:px-4 ${currentView === item.id
              ? 'border-r-4 border-tak-yellow bg-zinc-950 text-tak-yellow font-semibold shadow-inner'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <span className="material-symbols-outlined shrink-0">{item.icon}</span>
            <span className="hidden truncate text-sm font-medium xl:inline">{item.label}</span>
          </button>
        ))}
        <div className="my-3 border-t border-zinc-800 xl:my-4" />
        <button
          type="button"
          title="Perfil y Seguridad"
          aria-label="Perfil y Seguridad"
          onClick={() => onViewChange('profile')}
          className={`flex w-full items-center justify-center gap-4 rounded-lg px-3 py-3 transition-all xl:justify-start xl:px-4 ${currentView === 'profile'
            ? 'border-r-4 border-tak-yellow bg-zinc-950 text-tak-yellow font-semibold shadow-inner'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
        >
          <span className="material-symbols-outlined shrink-0">person</span>
          <span className="hidden text-sm font-medium xl:inline">Perfil y Seguridad</span>
        </button>
      </nav>

      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/30 p-3 xl:p-6">
        <button type="button" onClick={() => onViewChange('profile')} className="flex w-full items-center justify-center gap-3 text-left transition hover:opacity-80 xl:justify-start">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-white ring-2 ring-zinc-700">{initials}</span>
          <span className="hidden min-w-0 overflow-hidden xl:block">
            <span className="block truncate text-sm font-bold text-zinc-100">{displayName}</span>
            <span className="block truncate text-xs text-zinc-500">{user.email}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
