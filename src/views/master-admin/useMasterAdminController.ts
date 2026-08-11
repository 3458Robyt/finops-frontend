import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  assignMasterAdminTenant,
  createMasterAdminTenant,
  createMasterAdminUser,
  fetchMasterAdminAssignments,
  fetchMasterAdminTenants,
  fetchMasterAdminUsers,
  revokeMasterAdminTenant,
  updateMasterAdminTenant,
  type MasterAdminAssignment,
  type MasterAdminAssignmentRole,
  type MasterAdminTenant,
  type MasterAdminUser,
} from '../../services/api';

export type StaffCreateRole = 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN';

export interface MasterAdminControllerState {
  readonly tenants: readonly MasterAdminTenant[];
  readonly users: readonly MasterAdminUser[];
  readonly assignments: readonly MasterAdminAssignment[];
  readonly activeTenants: readonly MasterAdminTenant[];
  readonly suspendedTenants: number;
  readonly assignableUsers: readonly MasterAdminUser[];
  readonly loading: boolean;
  readonly saving: boolean;
  readonly message: string | null;
  readonly error: string | null;
  readonly tenantName: string;
  readonly tenantSlug: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly userRole: StaffCreateRole;
  readonly temporaryPassword: string;
  readonly assignmentTenantId: string;
  readonly assignmentUserId: string;
  readonly assignmentRole: MasterAdminAssignmentRole;
  readonly setTenantName: (value: string) => void;
  readonly setTenantSlug: (value: string) => void;
  readonly setUserName: (value: string) => void;
  readonly setUserEmail: (value: string) => void;
  readonly setUserRole: (value: StaffCreateRole) => void;
  readonly setTemporaryPassword: (value: string) => void;
  readonly setAssignmentTenantId: (value: string) => void;
  readonly setAssignmentUserId: (value: string) => void;
  readonly setAssignmentRole: (value: MasterAdminAssignmentRole) => void;
  readonly handleCreateTenant: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly handleToggleTenant: (tenant: MasterAdminTenant) => Promise<void>;
  readonly handleCreateUser: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly handleAssign: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly handleRevoke: (assignment: MasterAdminAssignment) => Promise<void>;
}

export function useMasterAdminController(
  token: string,
  onTenantsChanged: () => Promise<void>,
): MasterAdminControllerState {
  const [tenants, setTenants] = useState<readonly MasterAdminTenant[]>([]);
  const [users, setUsers] = useState<readonly MasterAdminUser[]>([]);
  const [assignments, setAssignments] = useState<readonly MasterAdminAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<StaffCreateRole>('FINOPS_TECHNICIAN');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [assignmentTenantId, setAssignmentTenantId] = useState('');
  const [assignmentUserId, setAssignmentUserId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState<MasterAdminAssignmentRole>('TECHNICIAN');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantResponse, userResponse, assignmentResponse] = await Promise.all([
        fetchMasterAdminTenants(token),
        fetchMasterAdminUsers(token),
        fetchMasterAdminAssignments(token),
      ]);
      setTenants(tenantResponse.tenants);
      setUsers(userResponse.users);
      setAssignments(assignmentResponse.assignments);
      setAssignmentTenantId((current) => current || tenantResponse.tenants[0]?.id || '');
      setAssignmentUserId((current) => current || userResponse.users.find((user) => user.role !== 'MASTER_ADMIN')?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la administracion MSP');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runMutation = async (operation: () => Promise<void>, fallback: string): Promise<void> => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await operation();
      await loadData();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTenant = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await runMutation(async () => {
      await createMasterAdminTenant(token, { name: tenantName, ...(tenantSlug.trim() ? { slug: tenantSlug } : {}) });
      setTenantName('');
      setTenantSlug('');
      setMessage('Tenant creado correctamente.');
      await onTenantsChanged();
    }, 'No fue posible crear el tenant');
  };

  const handleToggleTenant = async (tenant: MasterAdminTenant): Promise<void> => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await runMutation(async () => {
      await updateMasterAdminTenant(token, tenant.id, { status: nextStatus });
      setMessage(nextStatus === 'ACTIVE' ? 'Tenant reactivado.' : 'Tenant suspendido.');
      await onTenantsChanged();
    }, 'No fue posible actualizar el tenant');
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await runMutation(async () => {
      await createMasterAdminUser(token, { name: userName, email: userEmail, role: userRole, temporaryPassword });
      setUserName('');
      setUserEmail('');
      setTemporaryPassword('');
      setMessage('Usuario tecnico creado correctamente.');
    }, 'No fue posible crear el usuario');
  };

  const handleAssign = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await runMutation(async () => {
      await assignMasterAdminTenant(token, assignmentTenantId, assignmentUserId, { accessRole: assignmentRole });
      setMessage('Acceso asignado correctamente.');
    }, 'No fue posible asignar el acceso');
  };

  const handleRevoke = async (assignment: MasterAdminAssignment): Promise<void> => {
    await runMutation(async () => {
      await revokeMasterAdminTenant(token, assignment.tenantId, assignment.userId);
      setMessage('Acceso revocado correctamente.');
    }, 'No fue posible revocar el acceso');
  };

  return {
    tenants,
    users,
    assignments,
    activeTenants: useMemo(() => tenants.filter((tenant) => tenant.status === 'ACTIVE'), [tenants]),
    suspendedTenants: tenants.filter((tenant) => tenant.status !== 'ACTIVE').length,
    assignableUsers: useMemo(() => users.filter((user) => user.status === 'ACTIVE' && user.role !== 'MASTER_ADMIN'), [users]),
    loading,
    saving,
    message,
    error,
    tenantName,
    tenantSlug,
    userName,
    userEmail,
    userRole,
    temporaryPassword,
    assignmentTenantId,
    assignmentUserId,
    assignmentRole,
    setTenantName,
    setTenantSlug,
    setUserName,
    setUserEmail,
    setUserRole,
    setTemporaryPassword,
    setAssignmentTenantId,
    setAssignmentUserId,
    setAssignmentRole,
    handleCreateTenant,
    handleToggleTenant,
    handleCreateUser,
    handleAssign,
    handleRevoke,
  };
}
