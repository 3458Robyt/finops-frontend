import { useState } from 'react';
import { getVisibleNavItems, type ApiRole, type CurrentView, type NavItem, type NavView } from './navigation';

interface BottomNavProps {
  readonly currentView: CurrentView;
  readonly onViewChange: (view: NavView) => void;
  readonly role: ApiRole;
}

const primaryForTechnical: readonly Exclude<NavView, 'profile'>[] = ['dashboard', 'console', 'metricas_tecnicas', 'chat'];
const primaryForClient: readonly Exclude<NavView, 'profile'>[] = ['dashboard', 'budgets', 'value_realization', 'chat'];

export default function BottomNav({ currentView, onViewChange, role }: BottomNavProps) {
  const [open, setOpen] = useState(false);
  if (currentView === 'login') return null;

  const items = getVisibleNavItems(role);
  const primaryIds = role === 'CLIENT_APPROVER' || role === 'CLIENT_VIEWER' || role === 'VIEWER'
    ? primaryForClient
    : primaryForTechnical;
  const primaryItems = items.filter((item) => primaryIds.includes(item.id));
  const secondaryItems = items.filter((item) => !primaryIds.includes(item.id));
  const currentInMenu = secondaryItems.some((item) => item.id === currentView) || currentView === 'profile';
  const choose = (view: NavView) => {
    onViewChange(view);
    setOpen(false);
  };
  const profileItem = { id: 'profile' as const, icon: 'person', label: 'Perfil y Seguridad', roles: [] as const };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/60 lg:hidden" role="presentation" onClick={() => setOpen(false)}>
          <section className="ui-bottom-drawer absolute inset-x-0 bottom-16 max-h-[70dvh] overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Todos los módulos" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Todos los módulos</h2>
              <button type="button" onClick={() => setOpen(false)} className="ui-icon-button" aria-label="Cerrar menú">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {secondaryItems.map((item) => <MenuItem key={item.id} item={item} active={currentView === item.id} onSelect={() => choose(item.id)} />)}
              <MenuItem item={profileItem} active={currentView === 'profile'} onSelect={() => choose('profile')} />
            </div>
          </section>
        </div>
      )}
      <nav className="ui-bottom-nav fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around px-1 lg:hidden" aria-label="Navegación móvil">
        {primaryItems.map((item) => <BottomItem key={item.id} item={item} active={currentView === item.id} onSelect={() => choose(item.id)} />)}
        <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Más" aria-expanded={open} className={`ui-bottom-item flex h-full min-w-0 flex-1 flex-col items-center justify-center ${currentInMenu || open ? 'is-active' : ''}`}>
          <span className="material-symbols-outlined text-2xl">menu</span>
          <span className="mt-0.5 text-[10px] font-bold uppercase">Más</span>
        </button>
      </nav>
    </>
  );
}

function BottomItem({ item, active, onSelect }: { readonly item: NavItem; readonly active: boolean; readonly onSelect: () => void }) {
  return (
    <button type="button" title={item.label} aria-label={item.label} onClick={onSelect} className={`ui-bottom-item flex h-full min-w-0 flex-1 flex-col items-center justify-center ${active ? 'is-active' : ''}`}>
      <span className="material-symbols-outlined text-2xl">{item.icon}</span>
      <span className="mt-0.5 truncate px-1 text-[10px] font-bold uppercase">{item.label.replace('Panel de Control', 'Panel').replace('Métricas Técnicas', 'Métricas')}</span>
    </button>
  );
}

function MenuItem({ item, active, onSelect }: { readonly item: NavItem | { readonly id: 'profile'; readonly icon: string; readonly label: string; readonly roles: readonly ApiRole[] }; readonly active: boolean; readonly onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`ui-drawer-item flex min-h-14 items-center gap-2 px-3 text-left text-xs font-bold ${active ? 'is-active' : ''}`}>
      <span className="material-symbols-outlined shrink-0 text-lg">{item.icon}</span>
      <span className="min-w-0 truncate">{item.label}</span>
    </button>
  );
}
