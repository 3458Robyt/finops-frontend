
type Role = 'admin' | 'client';
type ApiRole = 'ADMIN' | 'MASTER_ADMIN' | 'VIEWER' | 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN' | 'CLIENT_APPROVER' | 'CLIENT_VIEWER';
type CurrentView = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'cloud_resource_detail' | 'budgets' | 'cost_allocation';
type NavView = 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'budgets' | 'cost_allocation';

interface NavItem {
  id: NavView;
  icon: string;
  label: string;
roles: readonly Role[];
masterOnly?: boolean;
}

interface BottomNavProps {
  currentView: CurrentView;
  onViewChange: (view: NavView) => void;
currentRole: Role;
apiRole: ApiRole;
}

export default function BottomNav({ currentView, onViewChange, currentRole, apiRole }: BottomNavProps) {
  if (currentView === 'login') return null;

  const allNavItems: readonly NavItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel', roles: ['admin', 'client'] },
    { id: 'console', icon: 'terminal', label: 'Consola', roles: ['admin'] },
    { id: 'ingesta', icon: 'cloud_sync', label: 'Ingesta', roles: ['admin'] },
    { id: 'metricas_tecnicas', icon: 'monitoring', label: 'Métricas', roles: ['admin'] },
    { id: 'cloud_inventory', icon: 'inventory_2', label: 'Inventario', roles: ['admin'] },
    { id: 'budgets', icon: 'account_balance_wallet', label: 'Presupuesto', roles: ['admin', 'client'] },
    { id: 'cost_allocation', icon: 'account_tree', label: 'Asignación', roles: ['admin', 'client'] },
    { id: 'chat', icon: 'smart_toy', label: 'IA', roles: ['admin', 'client'] },
{ id: 'history', icon: 'history', label: 'Historial', roles: ['admin', 'client'] },
{ id: 'agent_settings', icon: 'settings_suggest', label: 'Agente', roles: ['admin'] },
{ id: 'master_admin', icon: 'admin_panel_settings', label: 'MSP', roles: ['admin'], masterOnly: true },
{ id: 'profile', icon: 'person', label: 'Perfil', roles: ['admin', 'client'] },
];

const navItems = allNavItems.filter(item => item.roles.includes(currentRole) && (item.masterOnly !== true || apiRole === 'MASTER_ADMIN'));

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
