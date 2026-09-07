import { Field, FormPanel, Metric, StatusBadge } from './master-admin/masterAdminPresentation';
import { accessRoleLabels, inputClass, primaryButtonClass } from './master-admin/masterAdminUi';
import { useMasterAdminController } from './master-admin/useMasterAdminController';
import type { StaffCreateRole } from './master-admin/useMasterAdminController';
import type { MasterAdminAssignmentRole } from '../services/api';
import MasterAdminIngestionJobsPanel from './master-admin/MasterAdminIngestionJobsPanel';

export interface MasterAdminProps {
  onTenantsChanged: () => Promise<void>;
}

export default function MasterAdmin({ onTenantsChanged }: MasterAdminProps) {
  const {
    tenants, users, assignments, activeTenants, suspendedTenants, assignableUsers,
    loading, saving, message, error, tenantName, tenantSlug, userName, userEmail,
    userRole, temporaryPassword, assignmentTenantId, assignmentUserId, assignmentRole,
    invitationEmail, invitationName, invitationRole, inviteUrl,
    setTenantName, setTenantSlug, setUserName, setUserEmail, setUserRole,
    setTemporaryPassword, setAssignmentTenantId, setAssignmentUserId, setAssignmentRole,
    setInvitationEmail, setInvitationName, setInvitationRole,
    handleCreateTenant, handleToggleTenant, handleCreateUser, handleAssign, handleRevoke, handleCreateInvitation,
  } = useMasterAdminController(onTenantsChanged);

  if (loading) {
    return (
      <div className="ui-state-screen text-sm font-bold">
        <p className="text-sm font-bold text-zinc-500">Cargando administracion MSP...</p>
      </div>
    );
  }

  return (
    <div className="ui-page space-y-6 pb-28 lg:pb-8">
      <header className="ui-page-header">
        <div>
          <p className="ui-kicker">Administración MSP</p>
          <h1 className="ui-page-title mt-2">Tenants, usuarios y accesos</h1>
          <p className="ui-page-lead">Administra el perímetro multi-tenant y asigna accesos sin crear cuentas duplicadas.</p>
        </div>
        <span className="ui-status ui-status-accent shrink-0">Vista global</span>
      </header>
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

      <MasterAdminIngestionJobsPanel tenants={tenants} />

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="ui-surface overflow-hidden">
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
                  <option value="LEAD_TECHNICIAN">Tecnico lider</option>
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

          <FormPanel title="Invitar cliente" icon="mail">
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">Genera un enlace de un solo uso. El código nunca se guarda en texto plano.</p>
            <form onSubmit={(event) => void handleCreateInvitation(event)} className="space-y-4">
              <Field label="Tenant destino">
                <select value={assignmentTenantId} onChange={(event) => setAssignmentTenantId(event.target.value)} className={inputClass}>
                  {activeTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </Field>
              <Field label="Correo del cliente">
                <input type="email" required value={invitationEmail} onChange={(event) => setInvitationEmail(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Nombre opcional">
                <input value={invitationName} onChange={(event) => setInvitationName(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Permiso inicial">
                <select value={invitationRole} onChange={(event) => setInvitationRole(event.target.value as 'CLIENT_VIEWER' | 'CLIENT_APPROVER')} className={inputClass}>
                  <option value="CLIENT_VIEWER">Solo lectura</option>
                  <option value="CLIENT_APPROVER">Puede aprobar recomendaciones</option>
                </select>
              </Field>
              <button type="submit" disabled={saving || activeTenants.length === 0} className={primaryButtonClass}>Generar enlace</button>
            </form>
            {inviteUrl !== null && <div className="mt-4 rounded-lg border border-tak-yellow/30 bg-tak-yellow/5 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-tak-yellow">Enlace generado — compartir por correo</p><p className="mt-2 break-all font-mono text-xs text-zinc-200">{inviteUrl}</p></div>}
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

        <div className="ui-surface overflow-hidden">
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
