export type AppRole = 'admin' | 'client';
export type ApiRole = 'ADMIN' | 'MASTER_ADMIN' | 'VIEWER' | 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN' | 'CLIENT_APPROVER' | 'CLIENT_VIEWER';
export type CurrentView = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'messaging' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'cloud_resource_detail' | 'budgets' | 'cost_allocation' | 'value_realization';
export type NavView = Exclude<CurrentView, 'login' | 'resource_detail' | 'cloud_resource_detail'>;

export interface NavItem {
  readonly id: Exclude<NavView, 'profile'>;
  readonly icon: string;
  readonly label: string;
  readonly roles: readonly AppRole[];
  readonly masterOnly?: boolean;
}

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
  { id: 'messaging', icon: 'campaign', label: 'Mensajería', roles: ['admin', 'client'] },
  { id: 'master_admin', icon: 'admin_panel_settings', label: 'Administración MSP', roles: ['admin'], masterOnly: true },
];

export function getVisibleNavItems(currentRole: AppRole, apiRole: ApiRole): readonly NavItem[] {
  return allNavItems.filter((item) => item.roles.includes(currentRole)
    && (item.masterOnly !== true || apiRole === 'MASTER_ADMIN'));
}
