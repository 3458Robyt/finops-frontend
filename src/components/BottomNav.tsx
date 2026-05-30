
type Role = 'admin' | 'client';
type CurrentView = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas';
type NavView = 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas';

interface NavItem {
  id: NavView;
  icon: string;
  label: string;
  roles: readonly Role[];
}

interface BottomNavProps {
  currentView: CurrentView;
  onViewChange: (view: NavView) => void;
  currentRole: Role;
}

export default function BottomNav({ currentView, onViewChange, currentRole }: BottomNavProps) {
  if (currentView === 'login') return null;

  const allNavItems: readonly NavItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel', roles: ['admin', 'client'] },
    { id: 'console', icon: 'terminal', label: 'Consola', roles: ['admin'] },
    { id: 'ingesta', icon: 'cloud_sync', label: 'Ingesta', roles: ['admin'] },
    { id: 'metricas_tecnicas', icon: 'monitoring', label: 'Métricas', roles: ['admin'] },
    { id: 'chat', icon: 'smart_toy', label: 'IA', roles: ['admin', 'client'] },
    { id: 'history', icon: 'history', label: 'Historial', roles: ['admin', 'client'] },
    { id: 'agent_settings', icon: 'settings_suggest', label: 'Agente', roles: ['admin'] },
    { id: 'profile', icon: 'person', label: 'Perfil', roles: ['admin', 'client'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(currentRole));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 z-50 flex items-center justify-around h-16 px-2">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === item.id 
              ? 'text-tak-yellow border-t-2 border-tak-yellow bg-zinc-900/50' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">{item.icon}</span>
          <span className="text-[10px] font-bold uppercase mt-0.5">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
