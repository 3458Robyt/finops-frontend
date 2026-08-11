import { createContext, useContext } from 'react';
import type { AuthSession } from '../services/api';

export interface AuthSessionContextValue {
  readonly session: AuthSession;
  readonly accessToken: string;
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (context === null) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider');
  }
  return context;
}

export function useAccessToken(): string {
  return useAuthSession().accessToken;
}
