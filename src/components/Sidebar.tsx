
import type { ApiUser } from '../services/api';

type Role = 'admin' | 'client';
type ApiRole = 'ADMIN' | 'MASTER_ADMIN' | 'VIEWER' | 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN' | 'CLIENT_APPROVER' | 'CLIENT_VIEWER';
type CurrentView = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'cloud_resource_detail' | 'budgets' | 'cost_allocation' | 'value_realization';
type NavView = 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'budgets' | 'cost_allocation' | 'value_realization';

interface NavItem {
  id: Exclude<NavView, 'profile'>;
  icon: string;
  label: string;
roles: readonly Role[];
masterOnly?: boolean;
}

interface SidebarProps {
currentView: CurrentView;
onViewChange: (view: NavView) => void;
currentRole: Role;
apiRole: ApiRole;
user: ApiUser;
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

  const allNavItems: readonly NavItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel de Control', roles: ['admin', 'client'] },
    { id: 'console', icon: 'terminal', label: 'Consola Técnica', roles: ['admin'] },
    { id: 'ingesta', icon: 'cloud_sync', label: 'Ingesta y Datos', roles: ['admin'] },
    { id: 'metricas_tecnicas', icon: 'monitoring', label: 'Métricas Técnicas', roles: ['admin'] },
    { id: 'cloud_inventory', icon: 'inventory_2', label: 'Inventario Cloud', roles: ['admin'] },
    { id: 'budgets', icon: 'account_balance_wallet', label: 'Presupuestos', roles: ['admin', 'client'] },
    { id: 'cost_allocation', icon: 'account_tree', label: 'Asignación de costos', roles: ['admin', 'client'] },
    { id: 'value_realization', icon: 'query_stats', label: 'Valor realizado', roles: ['admin', 'client'] },
    { id: 'chat', icon: 'smart_toy', label: 'Asistente IA', roles: ['admin', 'client'] },
{ id: 'history', icon: 'history', label: 'Historial', roles: ['admin', 'client'] },
{ id: 'agent_settings', icon: 'settings_suggest', label: 'Agente IA', roles: ['admin'] },
{ id: 'master_admin', icon: 'admin_panel_settings', label: 'Administracion MSP', roles: ['admin'], masterOnly: true },
];

const navItems = allNavItems.filter(item => item.roles.includes(currentRole) && (item.masterOnly !== true || apiRole === 'MASTER_ADMIN'));

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[280px] bg-zinc-900 border-r border-zinc-800 z-50 flex-col">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-tak-yellow flex items-center justify-center rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.3)]">
            <span className="material-symbols-outlined text-zinc-950 font-bold">query_stats</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white block leading-none">FinOps Demo</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{currentRole === 'admin' ? 'Ingeniería FinOps' : 'Cloud Client'}</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
              currentView === item.id 
                ? 'border-r-4 border-tak-yellow bg-zinc-900 text-tak-yellow lg:border-r-4 lg:border-b-0 font-semibold shadow-inner' 
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
        
        <div className="my-4 border-t border-zinc-800"></div>

        <button
          onClick={() => onViewChange('profile')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
            currentView === 'profile' 
              ? 'border-r-4 border-tak-yellow bg-zinc-900 text-tak-yellow font-semibold shadow-inner' 
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-sm font-medium">Perfil y Seguridad</span>
        </button>
      </nav>

      <div className="p-6 mt-auto border-t border-zinc-800 bg-zinc-950/30">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" onClick={() => onViewChange('profile')}>
          <div className="size-10 rounded-full bg-zinc-800 ring-2 ring-zinc-700 flex items-center justify-center text-white font-bold">
            {initials}
          </div>
          <div className="overflow-hidden text-left">
            <p className="text-sm font-bold text-zinc-100 truncate">{displayName}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
