// Master-admin DTOs.
export type MasterAdminTenantStatus = 'ACTIVE' | 'SUSPENDED';
export type MasterAdminStaffRole = 'MASTER_ADMIN' | 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN' | 'ADMIN';
export type MasterAdminAssignmentRole = 'TECHNICIAN' | 'LEAD_TECHNICIAN' | 'OPERATOR_ADMIN';
export type ClientInvitationRole = 'CLIENT_APPROVER' | 'CLIENT_VIEWER';
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
export interface MasterAdminClientInvitation {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly tenantSlug: string;
  readonly email: string;
  readonly invitedName: string | null;
  readonly role: ClientInvitationRole;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
}
export interface MasterAdminClientInvitationsResponse {
  readonly success: true;
  readonly invitations: readonly MasterAdminClientInvitation[];
}
export interface MasterAdminClientInvitationResponse {
  readonly success: true;
  readonly invitation: MasterAdminClientInvitation;
  readonly inviteCode: string;
  readonly inviteUrl: string;
  readonly emailDelivery?: {
    readonly status: 'SENT' | 'FAILED' | 'SKIPPED';
    readonly errorMessage?: string;
  };
}

export interface MasterAdminIngestionJob {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly tenantSlug: string;
  readonly cloudConnectionId: string;
  readonly connectionName: string;
  readonly providerCode: string;
  readonly defaultRegion?: string;
  readonly sourceType: import('./ingestion').IngestionSourceType;
  readonly status: import('./ingestion').IngestionJobStatus;
  readonly projectionStatus?: import('./ingestion').MetricProjectionStatus;
  readonly projectionAttempts?: number;
  readonly projectionMaxAttempts?: number;
  readonly projectionAvailableAt?: string;
  readonly projectionStartedAt?: string;
  readonly projectionCompletedAt?: string;
  readonly projectionErrorMessage?: string;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly targetStart: string;
  readonly targetEnd: string;
  readonly errorMessage?: string;
  readonly progress?: Readonly<Record<string, unknown>>;
  readonly resultSummary?: Readonly<Record<string, unknown>>;
  readonly priority: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly availableAt: string;
  readonly cancelRequestedAt?: string;
  readonly archivedAt?: string;
  readonly requestedByUserName?: string;
  readonly requestedByUserEmail?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MasterAdminIngestionJobSummary {
  readonly total: number;
  readonly pending: number;
  readonly running: number;
  readonly success: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly skipped: number;
}

export interface MasterAdminIngestionJobsResponse {
  readonly success: true;
  readonly jobs: readonly MasterAdminIngestionJob[];
  readonly summary: MasterAdminIngestionJobSummary;
  readonly hasMore: boolean;
}

export interface MasterAdminDeletedPendingJobsResponse {
  readonly success: true;
  readonly result: {
    readonly deletedCount: number;
    readonly byTenant: readonly { readonly tenantId: string; readonly count: number }[];
  };
}

export interface MasterAdminIngestionJobResponse {
  readonly success: true;
  readonly job: MasterAdminIngestionJob;
}
