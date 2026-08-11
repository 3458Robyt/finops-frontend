// Master-admin DTOs.
export type MasterAdminTenantStatus = 'ACTIVE' | 'SUSPENDED';
export type MasterAdminStaffRole = 'MASTER_ADMIN' | 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN' | 'ADMIN';
export type MasterAdminAssignmentRole = 'TECHNICIAN' | 'LEAD_TECHNICIAN' | 'OPERATOR_ADMIN';
export interface MasterAdminTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: MasterAdminTenantStatus;
  readonly assignedUsers: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface MasterAdminUser {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly role: MasterAdminStaffRole;
  readonly status: 'ACTIVE' | 'DISABLED';
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface MasterAdminAssignment {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly userId: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly role: MasterAdminAssignmentRole;
  readonly createdAt: string;
  readonly disabledAt: string | null;
}
export interface MasterAdminTenantsResponse {
  readonly success: true;
  readonly tenants: readonly MasterAdminTenant[];
}
export interface MasterAdminTenantResponse {
  readonly success: true;
  readonly tenant: MasterAdminTenant;
}
export interface MasterAdminUsersResponse {
  readonly success: true;
  readonly users: readonly MasterAdminUser[];
}
export interface MasterAdminUserResponse {
  readonly success: true;
  readonly user: MasterAdminUser;
}
export interface MasterAdminAssignmentsResponse {
  readonly success: true;
  readonly assignments: readonly MasterAdminAssignment[];
}
export interface MasterAdminAssignmentResponse {
  readonly success: true;
  readonly assignment: MasterAdminAssignment;
}
