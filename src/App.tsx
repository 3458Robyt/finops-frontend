import { lazy, Suspense, useEffect, useState } from 'react';
import Login from './views/Login';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopHeader from './components/TopHeader';
import MfaRecoveryCodesDialog from './components/profile/MfaRecoveryCodesDialog';
import { AuthSessionProvider } from './auth/AuthSessionContext';
import { beginSessionTransition, clearAccessToken, completeMfaEnrollment, completeMfaLogin, endSessionTransition, fetchAccessibleTenants, getEffectiveRole, login, logout, restoreSession, setAccessToken, subscribeToSessionExpired, subscribeToSessionRefresh, switchTenant, type ApiRole, type AuthLoginResponse, type AuthSession } from './services/api';
import { canAccessView } from './components/navigation';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Console = lazy(() => import('./views/Console'));
const Chat = lazy(() => import('./views/Chat'));
const History = lazy(() => import('./views/History'));
const Profile = lazy(() => import('./views/Profile'));
const ResourceDetail = lazy(() => import('./views/ResourceDetail'));
const AgentSettings = lazy(() => import('./views/AgentSettings'));
const Messaging = lazy(() => import('./views/Messaging'));
const Ingesta = lazy(() => import('./views/Ingesta'));
const MetricasTecnicas = lazy(() => import('./views/MetricasTecnicas'));
const MasterAdmin = lazy(() => import('./views/MasterAdmin'));
const CloudInventory = lazy(() => import('./views/CloudInventory'));
const CloudResourceDetail = lazy(() => import('./views/CloudInventory').then((module) => ({ default: module.CloudResourceDetail })));
const Budgets = lazy(() => import('./views/Budgets'));
const CostAllocation = lazy(() => import('./views/CostAllocation'));
const ValueRealization = lazy(() => import('./views/ValueRealization'));
const ClientInvitationAccept = lazy(() => import('./views/ClientInvitationAccept'));

type View = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'messaging' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'cloud_resource_detail' | 'budgets' | 'cost_allocation' | 'value_realization';
export type Role = ApiRole;
function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<readonly string[] | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [selectedCloudResourceId, setSelectedCloudResourceId] = useState<string | null>(null);
  const [selectedCloudResourceCanonicalId, setSelectedCloudResourceCanonicalId] = useState<string | null>(null);
  const invitationCode = typeof window !== 'undefined'
    && window.location.pathname.startsWith('/cliente/')
    ? new URLSearchParams(window.location.search).get('invite')
    : null;

  useEffect(() => {
    let active = true;
    void restoreSession()
      .then((session) => {
        if (!active || session === null) return;
        setAuthSession(session);
        setCurrentView('dashboard');
      })
      .catch(() => {
        // El login sigue disponible cuando el backend está temporalmente fuera de línea.
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => subscribeToSessionRefresh((session) => {
    setAuthSession(session);
    setAccessToken(session.accessToken);
  }), []);

  useEffect(() => subscribeToSessionExpired(() => {
    clearAccessToken();
    setAuthSession(null);
    setCurrentView('login');
    setSelectedResourceType(null);
    setSelectedCloudResourceId(null);
    setSelectedCloudResourceCanonicalId(null);
  }), []);

  const currentRole: ApiRole = authSession !== null ? getEffectiveRole(authSession) : 'CLIENT_VIEWER';
  const technicalRole = currentRole === 'MASTER_ADMIN'
    || currentRole === 'OPERATOR_ADMIN'
    || currentRole === 'LEAD_TECHNICIAN'
    || currentRole === 'FINOPS_TECHNICIAN'
    || currentRole === 'ADMIN';
  const canManageFinOps = technicalRole;

  const handleLogin = async (
    email: string,
    password: string,
    mfa?: { readonly challengeToken: string; readonly code: string; readonly enrollment: boolean },
  ): Promise<AuthLoginResponse> => {
    const result = mfa === undefined
      ? await login(email, password)
      : mfa.enrollment
        ? await completeMfaEnrollment(mfa.challengeToken, mfa.code)
        : await completeMfaLogin(mfa.challengeToken, mfa.code);
    if ('mfaRequired' in result) return result;

    const { mfaRecoveryCodes: oneTimeRecoveryCodes, ...session } = result;
    setAccessToken(session.accessToken);
    setAuthSession(session);
    setMfaRecoveryCodes(oneTimeRecoveryCodes ?? null);
    setCurrentView('dashboard');
    return session;
  };

  const handleLogout = async () => {
    const currentToken = authSession?.accessToken;
    if (currentToken !== undefined) {
      try {
        await logout(currentToken);
      } catch {
        // Logout is best-effort: local in-memory credentials are still cleared.
      }
    }
    setAuthSession(null);
    clearAccessToken();
    setCurrentView('login');
    setSelectedResourceType(null);
    setSelectedCloudResourceId(null);
    setMfaRecoveryCodes(null);
  };

const handleTenantChange = async (tenantId: string) => {
    if (authSession === null || tenantId === authSession.activeTenant.id) {
      return;
    }

    beginSessionTransition();
    try {
      const nextSession = await switchTenant(authSession.accessToken, tenantId);
      setAccessToken(nextSession.accessToken);
      setAuthSession(nextSession);
      setSelectedResourceType(null);
      const nextRole = getEffectiveRole(nextSession);
      if (currentView === 'resource_detail') {
        setCurrentView('console');
      }
      if (currentView === 'cloud_resource_detail') setCurrentView('cloud_inventory');
      if (!canAccessView(currentView, nextRole)) setCurrentView('dashboard');
    } finally {
      endSessionTransition();
    }
};

  const refreshAccessibleTenants = async () => {
if (authSession === null) return;
const response = await fetchAccessibleTenants(authSession.accessToken);
setAuthSession((current) => current === null ? current : {
...current,
activeTenant: response.activeTenant ?? current.activeTenant,
availableTenants: response.availableTenants,
});
};

  const handleClientInvitationAccepted = (session: AuthSession): void => {
    setAccessToken(session.accessToken);
    setAuthSession(session);
    setCurrentView('dashboard');
    window.history.replaceState({}, document.title, '/');
  };

  if (invitationCode !== null) {
    return (
        <Suspense fallback={<div className="ui-state-screen">Cargando invitación…</div>}>
        <ClientInvitationAccept code={invitationCode} onAccepted={handleClientInvitationAccepted} />
      </Suspense>
    );
  }

  if (!authReady) {
    return <div className="ui-state-screen">Restaurando sesión…</div>;
  }

  if (currentView === 'login' || authSession === null) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    if (!canAccessView(currentView, currentRole)) return <Dashboard
      apiRole={currentRole}
      onOpenBudgets={() => setCurrentView('budgets')}
      onOpenAgentSettings={() => setCurrentView('agent_settings')}
    />;
    switch (currentView) {
      case 'dashboard': return <Dashboard
        apiRole={currentRole}
        onOpenBudgets={() => setCurrentView('budgets')}
        onOpenAgentSettings={() => setCurrentView('agent_settings')}
      />;
      case 'console': return <Console
        apiRole={currentRole}
        onOpenAgentSettings={() => setCurrentView('agent_settings')}
        onResourceSelect={(id) => {
        setSelectedResourceType(id);
        setCurrentView('resource_detail');
      }} />;
      case 'resource_detail': return <ResourceDetail recommendationId={selectedResourceType || ''} apiRole={currentRole} onBack={() => setCurrentView('console')} />;
      case 'chat': return <Chat role={currentRole} />;
      case 'history': return <History />;
      case 'agent_settings': return technicalRole ? <AgentSettings
  role={currentRole}
  onOpenRecommendation={(recommendationId) => {
    setSelectedResourceType(recommendationId);
    setCurrentView('resource_detail');
  }}
/> : <Dashboard apiRole={currentRole} onOpenBudgets={() => setCurrentView('budgets')} onOpenAgentSettings={() => setCurrentView('agent_settings')} />;
      case 'messaging': return <Messaging role={currentRole} />;
case 'ingesta': return <Ingesta canManage={canManageFinOps} onNavigate={setCurrentView} />;
      case 'metricas_tecnicas': return <MetricasTecnicas />;
case 'budgets': return <Budgets canManage={canManageFinOps} onOpenAllocation={() => setCurrentView('cost_allocation')} />;
case 'cost_allocation': return <CostAllocation canManage={canManageFinOps} />;
case 'value_realization': return <ValueRealization canReconcile={canManageFinOps} onOpenRecommendation={(id) => { setSelectedResourceType(id); setCurrentView('resource_detail'); }} />;
case 'cloud_inventory': return <CloudInventory onOpenResource={(resource) => { setSelectedCloudResourceId(resource.externalResourceId); setSelectedCloudResourceCanonicalId(resource.id); setCurrentView('cloud_resource_detail'); }} />;
case 'cloud_resource_detail': return <CloudResourceDetail externalResourceId={selectedCloudResourceId ?? ''} cloudResourceId={selectedCloudResourceCanonicalId ?? undefined} onBack={() => setCurrentView('cloud_inventory')} />;
case 'master_admin': return currentRole === 'MASTER_ADMIN'
? <MasterAdmin onTenantsChanged={refreshAccessibleTenants} />
: <Dashboard apiRole={currentRole} onOpenBudgets={() => setCurrentView('budgets')} onOpenAgentSettings={() => setCurrentView('agent_settings')} />;
case 'profile': return <Profile onLogout={handleLogout} onOpenMessaging={() => setCurrentView('messaging')} role={currentRole} user={authSession.user} />;
      default: return <Dashboard apiRole={currentRole} onOpenBudgets={() => setCurrentView('budgets')} onOpenAgentSettings={() => setCurrentView('agent_settings')} />;
    }
  };

  return (
    <AuthSessionProvider session={authSession}>
    <div className="app-shell flex h-[100dvh] min-h-0 overflow-hidden">
{mfaRecoveryCodes !== null && <MfaRecoveryCodesDialog codes={mfaRecoveryCodes} onClose={() => setMfaRecoveryCodes(null)} />}
<Sidebar currentView={currentView} onViewChange={setCurrentView} role={currentRole} user={authSession.user} />
<BottomNav currentView={currentView} onViewChange={setCurrentView} role={currentRole} />
      
      <div className="app-content flex min-h-0 min-w-0 flex-1 flex-col lg:ml-20 xl:ml-[280px]">
        <TopHeader 
          currentView={currentView} 
          activeTenant={authSession.activeTenant}
          availableTenants={authSession.availableTenants}
          onTenantChange={handleTenantChange}
          role={currentRole}
        />
        <main className={`min-h-0 min-w-0 flex-1 p-3 pb-24 sm:p-4 lg:p-6 lg:pb-10 xl:p-8 ${currentView === 'chat' ? 'overflow-hidden' : 'custom-scrollbar overflow-y-auto overflow-x-hidden'}`}>
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">Cargando módulo…</div>}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
    </AuthSessionProvider>
  );
}

export default App;
