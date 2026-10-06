import type { ApiUser } from '../services/api';
import { getVisibleNavItems, roleLabel, type ApiRole, type CurrentView, type NavView } from './navigation';

interface SidebarProps {
  readonly currentView: CurrentView;
  readonly onViewChange: (view: NavView) => void;
  readonly role: ApiRole;
  readonly user: ApiUser;
}

export default function Sidebar({ currentView, onViewChange, role, user }: SidebarProps) {
  if (currentView === 'login') return null;

  const displayName = user.name.trim() !== '' ? user.name : user.email;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || user.email.slice(0, 2).toUpperCase();
  const navItems = getVisibleNavItems(role);
  const navGroups: readonly { readonly label: string; readonly ids: readonly NavView[] }[] = [
    { label: 'Visión', ids: ['dashboard', 'value_realization'] },
    { label: 'Operación', ids: ['console', 'metricas_tecnicas', 'cloud_inventory', 'ingesta'] },
    { label: 'Gobierno', ids: ['budgets', 'cost_allocation', 'history'] },
    { label: 'IA y canales', ids: ['chat', 'agent_settings', 'messaging'] },
    { label: 'Administración', ids: ['master_admin'] },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-[100dvh] w-20 flex-col border-r border-zinc-800 bg-zinc-900 lg:flex xl:w-[280px]">
      <div className="shrink-0 border-b border-zinc-800 p-4 xl:p-6">
        <div className="flex items-center justify-center gap-3 xl:justify-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tak-yellow">
            <span className="material-symbols-outlined font-bold text-zinc-950">query_stats</span>
          </div>
          <div className="hidden min-w-0 xl:block">
            <span className="block font-display text-xl font-bold leading-none tracking-tight text-white">TAK Colombia</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{roleLabel(role)}</span>
          </div>
        </div>
      </div>

      <nav className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-4 xl:px-3 xl:py-5" aria-label="Módulos principales">
        {navGroups.map((group) => {
          const groupItems = navItems.filter((item) => group.ids.includes(item.id));
          if (groupItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600 xl:block">{group.label}</p>
              <div className="space-y-1">
                {groupItems.map((item) => (
                  <NavButton key={item.id} item={item} active={currentView === item.id} onSelect={() => onViewChange(item.id)} />
                ))}
              </div>
            </div>
          );
        })}
        <div className="my-2 border-t border-zinc-800" />
        <button
          type="button"
          title="Perfil y Seguridad"
          aria-label="Perfil y Seguridad"
          onClick={() => onViewChange('profile')}
          className={`ui-nav-item flex w-full items-center justify-center gap-4 px-3 py-3 xl:justify-start xl:px-4 ${currentView === 'profile' ? 'is-active' : ''}`}
        >
          <span className="material-symbols-outlined shrink-0">person</span>
          <span className="hidden text-sm font-medium xl:inline">Perfil y Seguridad</span>
        </button>
      </nav>

      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/30 p-3 xl:p-4">
        <button type="button" onClick={() => onViewChange('profile')} className="flex w-full items-center justify-center gap-3 text-left transition hover:opacity-80 xl:justify-start">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 font-mono text-xs font-bold text-white">{initials}</span>
          <span className="hidden min-w-0 overflow-hidden xl:block">
            <span className="block truncate text-sm font-bold text-zinc-100">{displayName}</span>
            <span className="block truncate text-xs text-zinc-500">{user.email}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function NavButton({ item, active, onSelect }: {
  readonly item: { readonly id: NavView; readonly icon: string; readonly label: string };
  readonly active: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
      className={`ui-nav-item flex w-full items-center justify-center gap-4 px-3 py-2.5 xl:justify-start xl:px-3 ${active ? 'is-active' : ''}`}
    >
      <span className="material-symbols-outlined shrink-0 text-[21px]">{item.icon}</span>
      <span className="hidden truncate text-sm font-medium xl:inline">{item.label}</span>
    </button>
  );
}
