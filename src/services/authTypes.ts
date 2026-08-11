export type ApiRole =
  | 'ADMIN'
  | 'MASTER_ADMIN'
  | 'VIEWER'
  | 'OPERATOR_ADMIN'
  | 'FINOPS_TECHNICIAN'
  | 'CLIENT_APPROVER'
  | 'CLIENT_VIEWER';

export type AppRole = 'admin' | 'client';

export interface ApiUser {
  readonly id: string;
  readonly tenantId: string;
  readonly homeTenantId: string;
  readonly email: string;
  readonly name: string;
  readonly role: ApiRole;
}

export type TenantAccessRole = 'HOME' | 'TECHNICIAN' | 'LEAD_TECHNICIAN' | 'OPERATOR_ADMIN' | 'MASTER';

export interface AuthTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly accessRole: TenantAccessRole;
  readonly isCurrent: boolean;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly user: ApiUser;
  readonly activeTenant: AuthTenant;
  readonly availableTenants: readonly AuthTenant[];
}

export interface AuthSessionDevice {
  readonly id: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly isCurrent: boolean;
}
