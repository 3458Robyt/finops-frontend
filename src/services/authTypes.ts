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
  /** Returned once immediately after MFA enrollment; callers must not persist it. */
  readonly mfaRecoveryCodes?: readonly string[];
}

export interface MfaStatusResponse {
  readonly success: true;
  readonly enabled: boolean;
  readonly requiredForRole: boolean;
  readonly recoveryCodesRemaining: number;
}

export interface MfaRecoveryCodesResponse {
  readonly success: true;
  readonly recoveryCodes: readonly string[];
  readonly message: string;
}

export interface AuthMfaChallenge {
  readonly mfaRequired: true;
  readonly mfaSetupRequired?: boolean;
  readonly challengeToken: string;
  readonly expiresAt: string;
  readonly secret?: string;
  readonly otpauthUri?: string;
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly role: ApiRole;
  };
}

export type AuthLoginResponse = AuthSession | AuthMfaChallenge;

export interface AuthSessionDevice {
  readonly id: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly isCurrent: boolean;
}
