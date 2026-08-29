import { useState } from 'react';
import { getVisibleNavItems, type ApiRole, type AppRole, type CurrentView, type NavItem, type NavView } from './navigation';

interface BottomNavProps {
  readonly currentView: CurrentView;
  readonly onViewChange: (view: NavView) => void;
  readonly currentRole: AppRole;
  readonly apiRole: ApiRole;
}

const primaryByRole: Readonly<Record<AppRole, readonly Exclude<NavView, 'profile'>[]>> = {
  admin: ['dashboard', 'console', 'metricas_tecnicas', 'chat'],
  client: ['dashboard', 'budgets', 'value_realization', 'chat'],
};

export default function BottomNav({ currentView, onViewChange, currentRole, apiRole }: BottomNavProps) {
  const [open, setOpen] = useState(false);
  if (currentView === 'login') return null;

  const items = getVisibleNavItems(currentRole, apiRole);
  const primaryIds = primaryByRole[currentRole];
  const primaryItems = items.filter((item) => primaryIds.includes(item.id));
  const secondaryItems = items.filter((item) => !primaryIds.includes(item.id));
  const currentInMenu = secondaryItems.some((item) => item.id === currentView) || currentView === 'profile';
  const choose = (view: NavView) => {
    onViewChange(view);
    setOpen(false);
  };
  const profileItem = { id: 'profile' as const, icon: 'person', label: 'Perfil y Seguridad', roles: ['admin', 'client'] as const };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/60 lg:hidden" role="presentation" onClick={() => setOpen(false)}>
          <section className="absolute inset-x-0 bottom-16 max-h-[70dvh] overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl" role="dialog" aria-modal="true" aria-label="Todos los módulos" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Todos los módulos</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:text-white" aria-label="Cerrar menú">
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-zinc-800 bg-zinc-900/95 px-1 backdrop-blur-lg lg:hidden" aria-label="Navegación móvil">
        {primaryItems.map((item) => <BottomItem key={item.id} item={item} active={currentView === item.id} onSelect={() => choose(item.id)} />)}
        <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Más" aria-expanded={open} className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center transition-colors ${currentInMenu || open ? 'border-t-2 border-tak-yellow bg-zinc-900/50 text-tak-yellow' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <span className="material-symbols-outlined text-2xl">menu</span>
          <span className="mt-0.5 text-[10px] font-bold uppercase">Más</span>
        </button>
      </nav>
    </>
  );
}

function BottomItem({ item, active, onSelect }: { readonly item: NavItem; readonly active: boolean; readonly onSelect: () => void }) {
  return (
    <button type="button" title={item.label} aria-label={item.label} onClick={onSelect} className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center transition-colors ${active ? 'border-t-2 border-tak-yellow bg-zinc-900/50 text-tak-yellow' : 'text-zinc-500 hover:text-zinc-300'}`}>
      <span className="material-symbols-outlined text-2xl">{item.icon}</span>
      <span className="mt-0.5 truncate px-1 text-[10px] font-bold uppercase">{item.label.replace('Panel de Control', 'Panel').replace('Métricas Técnicas', 'Métricas')}</span>
    </button>
  );
}

function MenuItem({ item, active, onSelect }: { readonly item: NavItem | { readonly id: 'profile'; readonly icon: string; readonly label: string; readonly roles: readonly AppRole[] }; readonly active: boolean; readonly onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold ${active ? 'border-tak-yellow/40 bg-tak-yellow/10 text-tak-yellow' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}`}>
      <span className="material-symbols-outlined shrink-0 text-lg">{item.icon}</span>
      <span className="min-w-0 truncate">{item.label}</span>
    </button>
  );
}
