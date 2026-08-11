import { useMemo, type ReactNode } from 'react';
import type { AuthSession } from '../services/api';
import { AuthSessionContext, type AuthSessionContextValue } from './authSession';

export function AuthSessionProvider({ session, children }: { readonly session: AuthSession; readonly children: ReactNode }) {
  const value = useMemo<AuthSessionContextValue>(() => ({
    session,
    accessToken: session.accessToken,
  }), [session]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
