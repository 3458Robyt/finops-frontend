import type { MasterAdminAssignmentRole } from '../../services/api';

export const accessRoleLabels: Record<MasterAdminAssignmentRole, string> = {
  TECHNICIAN: 'Tecnico',
  LEAD_TECHNICIAN: 'Tecnico lider',
  OPERATOR_ADMIN: 'Admin operador',
};

export const inputClass = 'w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow focus:ring-1 focus:ring-tak-yellow';
export const primaryButtonClass = 'w-full rounded bg-tak-yellow px-4 py-2.5 text-sm font-black uppercase text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50';
