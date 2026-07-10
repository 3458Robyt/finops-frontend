import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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
} from '../services/api';

interface MasterAdminProps {
  token: string;
  onTenantsChanged: () => Promise<void>;
}

type StaffCreateRole = 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN';

const accessRoleLabels: Record<MasterAdminAssignmentRole, string> = {
  TECHNICIAN: 'Tecnico',
  LEAD_TECHNICIAN: 'Tecnico lider',
  OPERATOR_ADMIN: 'Admin operador',
};

export default function MasterAdmin({ token, onTenantsChanged }: MasterAdminProps) {
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

  const activeTenants = useMemo(() => tenants.filter((tenant) => tenant.status === 'ACTIVE'), [tenants]);
  const suspendedTenants = tenants.length - activeTenants.length;
  const assignableUsers = useMemo(
    () => users.filter((user) => user.status === 'ACTIVE' && user.role !== 'MASTER_ADMIN'),
    [users],
  );

  const loadData = async () => {
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
      if (assignmentTenantId === '' && tenantResponse.tenants.length > 0) {
        setAssignmentTenantId(tenantResponse.tenants[0]!.id);
      }
      if (assignmentUserId === '' && userResponse.users.length > 0) {
        const firstAssignable = userResponse.users.find((user) => user.role !== 'MASTER_ADMIN');
        if (firstAssignable !== undefined) setAssignmentUserId(firstAssignable.id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la administracion MSP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCreateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createMasterAdminTenant(token, {
        name: tenantName,
        ...(tenantSlug.trim().length > 0 ? { slug: tenantSlug } : {}),
      });
      setTenantName('');
      setTenantSlug('');
      setMessage('Tenant creado correctamente.');
      await Promise.all([loadData(), onTenantsChanged()]);
    } catch (tenantError) {
      setError(tenantError instanceof Error ? tenantError.message : 'No fue posible crear el tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTenant = async (tenant: MasterAdminTenant) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await updateMasterAdminTenant(token, tenant.id, { status: nextStatus });
      setMessage(nextStatus === 'ACTIVE' ? 'Tenant reactivado.' : 'Tenant suspendido.');
      await Promise.all([loadData(), onTenantsChanged()]);
    } catch (tenantError) {
      setError(tenantError instanceof Error ? tenantError.message : 'No fue posible actualizar el tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createMasterAdminUser(token, {
        name: userName,
        email: userEmail,
        role: userRole,
        temporaryPassword,
      });
      setUserName('');
      setUserEmail('');
      setTemporaryPassword('');
      setMessage('Usuario tecnico creado correctamente.');
      await loadData();
    } catch (userError) {
      setError(userError instanceof Error ? userError.message : 'No fue posible crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await assignMasterAdminTenant(token, assignmentTenantId, assignmentUserId, { accessRole: assignmentRole });
      setMessage('Acceso asignado correctamente.');
      await loadData();
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'No fue posible asignar el acceso');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (assignment: MasterAdminAssignment) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await revokeMasterAdminTenant(token, assignment.tenantId, assignment.userId);
      setMessage('Acceso revocado correctamente.');
      await loadData();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'No fue posible revocar el acceso');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-sm font-bold text-zinc-500">Cargando administracion MSP...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-28 lg:pb-8">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric title="Tenants" value={tenants.length} helper={`${activeTenants.length} activos`} />
        <Metric title="Suspendidos" value={suspendedTenants} helper="No aparecen en selector operativo" />
        <Metric title="Usuarios staff" value={users.length} helper="Maestro, operadores y tecnicos" />
        <Metric title="Asignaciones activas" value={assignments.length} helper="Accesos multi-tenant" />
      </section>

      {(error !== null || message !== null) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-bold ${
            error !== null
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Tenants existentes</h2>
              <p className="text-xs text-zinc-500 mt-1">El admin maestro ve activos y suspendidos.</p>
            </div>
            <span className="material-symbols-outlined text-tak-yellow">domain</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/70 text-[11px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Accesos</th>
                  <th className="px-5 py-3 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="text-zinc-300">
                    <td className="px-5 py-4 font-bold text-white">{tenant.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-zinc-500">{tenant.slug}</td>
                    <td className="px-5 py-4">
                      <StatusBadge active={tenant.status === 'ACTIVE'} label={tenant.status} />
                    </td>
                    <td className="px-5 py-4">{tenant.assignedUsers}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleToggleTenant(tenant)}
                        className="rounded border border-zinc-700 px-3 py-1.5 text-xs font-black uppercase text-zinc-200 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-50"
                      >
                        {tenant.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <FormPanel title="Crear tenant" icon="add_business">
            <form onSubmit={(event) => void handleCreateTenant(event)} className="space-y-4">
              <Field label="Nombre">
                <input value={tenantName} onChange={(event) => setTenantName(event.target.value)} required className={inputClass} />
              </Field>
              <Field label="Slug opcional">
                <input value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} className={inputClass} placeholder="se genera desde el nombre" />
              </Field>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                Crear tenant
              </button>
            </form>
          </FormPanel>

          <FormPanel title="Crear usuario tecnico" icon="person_add">
            <form onSubmit={(event) => void handleCreateUser(event)} className="space-y-4">
              <Field label="Nombre">
                <input value={userName} onChange={(event) => setUserName(event.target.value)} required className={inputClass} />
              </Field>
              <Field label="Correo">
                <input type="email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} required className={inputClass} />
              </Field>
              <Field label="Rol">
                <select value={userRole} onChange={(event) => setUserRole(event.target.value as StaffCreateRole)} className={inputClass}>
                  <option value="FINOPS_TECHNICIAN">Tecnico FinOps</option>
                  <option value="OPERATOR_ADMIN">Admin operador</option>
                </select>
              </Field>
              <Field label="Contrasena temporal">
                <input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} required minLength={8} className={inputClass} />
              </Field>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                Crear usuario
              </button>
            </form>
          </FormPanel>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-6">
        <FormPanel title="Asignar tenant" icon="assignment_ind">
          <form onSubmit={(event) => void handleAssign(event)} className="space-y-4">
            <Field label="Tenant">
              <select value={assignmentTenantId} onChange={(event) => setAssignmentTenantId(event.target.value)} className={inputClass}>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.status})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Usuario">
              <select value={assignmentUserId} onChange={(event) => setAssignmentUserId(event.target.value)} className={inputClass}>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Permiso">
              <select value={assignmentRole} onChange={(event) => setAssignmentRole(event.target.value as MasterAdminAssignmentRole)} className={inputClass}>
                <option value="TECHNICIAN">Tecnico</option>
                <option value="LEAD_TECHNICIAN">Tecnico lider</option>
                <option value="OPERATOR_ADMIN">Admin operador</option>
              </select>
            </Field>
            <button type="submit" disabled={saving || assignmentTenantId === '' || assignmentUserId === ''} className={primaryButtonClass}>
              Asignar acceso
            </button>
          </form>
        </FormPanel>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Accesos activos</h2>
              <p className="text-xs text-zinc-500 mt-1">Cada tecnico puede tener uno o varios tenants asignados.</p>
            </div>
            <span className="material-symbols-outlined text-tak-yellow">key</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/70 text-[11px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Permiso</th>
                  <th className="px-5 py-3 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="text-zinc-300">
                    <td className="px-5 py-4 font-bold text-white">{assignment.tenantName}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-zinc-200">{assignment.userName}</p>
                      <p className="text-xs text-zinc-500">{assignment.userEmail}</p>
                    </td>
                    <td className="px-5 py-4">{accessRoleLabels[assignment.role]}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleRevoke(assignment)}
                        className="rounded border border-red-500/30 px-3 py-1.5 text-xs font-black uppercase text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Revocar
                      </button>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm font-bold text-zinc-500">
                      No hay accesos multi-tenant activos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, helper }: { readonly title: string; readonly value: number; readonly helper: string }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function StatusBadge({ active, label }: { readonly active: boolean; readonly label: string }) {
  return (
    <span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${active ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
      {label}
    </span>
  );
}

function FormPanel({ title, icon, children }: { readonly title: string; readonly icon: string; readonly children: ReactNode }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
        <span className="material-symbols-outlined text-tak-yellow">{icon}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow focus:ring-1 focus:ring-tak-yellow';

const primaryButtonClass =
  'w-full rounded bg-tak-yellow px-4 py-2.5 text-sm font-black uppercase text-zinc-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50';
