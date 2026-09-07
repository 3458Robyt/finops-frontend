export type ApiRole = 'ADMIN' | 'MASTER_ADMIN' | 'VIEWER' | 'OPERATOR_ADMIN' | 'LEAD_TECHNICIAN' | 'FINOPS_TECHNICIAN' | 'CLIENT_APPROVER' | 'CLIENT_VIEWER';
export type AppRole = ApiRole;
export type CurrentView = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'messaging' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'cloud_resource_detail' | 'budgets' | 'cost_allocation' | 'value_realization';
export type NavView = Exclude<CurrentView, 'login' | 'resource_detail' | 'cloud_resource_detail'>;

export interface NavItem {
  readonly id: Exclude<NavView, 'profile'>;
  readonly icon: string;
  readonly label: string;
  readonly roles: readonly ApiRole[];
  readonly masterOnly?: boolean;
}

const technicalRoles = ['MASTER_ADMIN', 'OPERATOR_ADMIN', 'LEAD_TECHNICIAN', 'FINOPS_TECHNICIAN', 'ADMIN'] as const;
const executiveRoles = [...technicalRoles, 'CLIENT_APPROVER', 'CLIENT_VIEWER', 'VIEWER'] as const;
const allNavItems: readonly NavItem[] = [
  { id: 'dashboard', icon: 'dashboard', label: 'Panel de Control', roles: executiveRoles },
  { id: 'console', icon: 'terminal', label: 'Consola Técnica', roles: technicalRoles },
  { id: 'ingesta', icon: 'cloud_sync', label: 'Ingesta y Datos', roles: technicalRoles },
  { id: 'metricas_tecnicas', icon: 'monitoring', label: 'Métricas Técnicas', roles: technicalRoles },
  { id: 'cloud_inventory', icon: 'inventory_2', label: 'Inventario Cloud', roles: technicalRoles },
  { id: 'budgets', icon: 'account_balance_wallet', label: 'Presupuestos', roles: executiveRoles },
  { id: 'cost_allocation', icon: 'account_tree', label: 'Asignación de costos', roles: executiveRoles },
  { id: 'value_realization', icon: 'query_stats', label: 'Valor realizado', roles: executiveRoles },
  { id: 'chat', icon: 'smart_toy', label: 'Asistente IA', roles: executiveRoles },
  { id: 'history', icon: 'history', label: 'Historial', roles: executiveRoles },
  { id: 'agent_settings', icon: 'settings_suggest', label: 'Agente IA', roles: technicalRoles },
  { id: 'messaging', icon: 'campaign', label: 'Mensajería', roles: executiveRoles },
  { id: 'master_admin', icon: 'admin_panel_settings', label: 'Administración MSP', roles: ['MASTER_ADMIN'], masterOnly: true },
];

export function getVisibleNavItems(role: ApiRole): readonly NavItem[] {
  return allNavItems.filter((item) => item.roles.includes(role)
    && (item.masterOnly !== true || role === 'MASTER_ADMIN'));
}

export function canAccessView(view: CurrentView, role: ApiRole): boolean {
  if (view === 'login' || view === 'resource_detail') return true;
  if (view === 'cloud_resource_detail') return role === 'MASTER_ADMIN'
    || role === 'OPERATOR_ADMIN'
    || role === 'LEAD_TECHNICIAN'
    || role === 'FINOPS_TECHNICIAN'
    || role === 'ADMIN';
  return view === 'profile' || getVisibleNavItems(role).some((item) => item.id === view);
}

export function roleLabel(role: ApiRole): string {
  return {
    MASTER_ADMIN: 'Administrador maestro',
    OPERATOR_ADMIN: 'Administrador operador',
    LEAD_TECHNICIAN: 'Técnico líder',
    FINOPS_TECHNICIAN: 'Técnico FinOps',
    CLIENT_APPROVER: 'Cliente aprobador',
    CLIENT_VIEWER: 'Cliente lector',
    ADMIN: 'Administrador heredado',
    VIEWER: 'Lector heredado',
  }[role];
}
