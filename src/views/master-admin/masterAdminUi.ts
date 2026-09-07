import type { MasterAdminAssignmentRole } from '../../services/api';

export const accessRoleLabels: Record<MasterAdminAssignmentRole, string> = {
  TECHNICIAN: 'Tecnico',
  LEAD_TECHNICIAN: 'Tecnico lider',
  OPERATOR_ADMIN: 'Admin operador',
};

export const inputClass = 'ui-control w-full px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-tak-yellow';
export const primaryButtonClass = 'ui-button ui-button-primary w-full uppercase disabled:cursor-not-allowed disabled:opacity-50';
