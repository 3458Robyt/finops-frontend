import { lazy, Suspense, useState } from 'react';
import Login from './views/Login';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopHeader from './components/TopHeader';
import { clearAccessToken, completeMfaEnrollment, completeMfaLogin, fetchAccessibleTenants, login, logout, mapApiRoleToAppRole, setAccessToken, switchTenant, type ApiRole, type AuthLoginResponse, type AuthSession, type AppRole } from './services/api';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Console = lazy(() => import('./views/Console'));
const Chat = lazy(() => import('./views/Chat'));
const History = lazy(() => import('./views/History'));
const Profile = lazy(() => import('./views/Profile'));
const ResourceDetail = lazy(() => import('./views/ResourceDetail'));
const AgentSettings = lazy(() => import('./views/AgentSettings'));
const Ingesta = lazy(() => import('./views/Ingesta'));
const MetricasTecnicas = lazy(() => import('./views/MetricasTecnicas'));
const MasterAdmin = lazy(() => import('./views/MasterAdmin'));
const CloudInventory = lazy(() => import('./views/CloudInventory'));
const CloudResourceDetail = lazy(() => import('./views/CloudInventory').then((module) => ({ default: module.CloudResourceDetail })));
const Budgets = lazy(() => import('./views/Budgets'));
const CostAllocation = lazy(() => import('./views/CostAllocation'));
const ValueRealization = lazy(() => import('./views/ValueRealization'));

type View = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'cloud_resource_detail' | 'budgets' | 'cost_allocation' | 'value_realization';
export type Role = AppRole;
function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [selectedCloudResourceId, setSelectedCloudResourceId] = useState<string | null>(null);
  const [selectedCloudResourceCanonicalId, setSelectedCloudResourceCanonicalId] = useState<string | null>(null);

  const currentRole = authSession !== null ? mapApiRoleToAppRole(authSession.user.role) : 'client';

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

    const session = result;
    const role = mapApiRoleToAppRole(session.user.role);

    setAccessToken(session.accessToken);
    setAuthSession(session);
    setCurrentView(role === 'admin' ? 'console' : 'dashboard');
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
  };

const handleTenantChange = async (tenantId: string) => {
    if (authSession === null || tenantId === authSession.activeTenant.id) {
      return;
    }

    const nextSession = await switchTenant(authSession.accessToken, tenantId);
    setAccessToken(nextSession.accessToken);
    setAuthSession(nextSession);
    setSelectedResourceType(null);
    if (currentView === 'resource_detail') {
      setCurrentView('console');
    }
    if (currentView === 'cloud_resource_detail') setCurrentView('cloud_inventory');
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

  if (currentView === 'login' || authSession === null) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard token={authSession.accessToken} onOpenBudgets={() => setCurrentView('budgets')} />;
      case 'console': return <Console token={authSession.accessToken} onResourceSelect={(id) => {
        setSelectedResourceType(id);
        setCurrentView('resource_detail');
      }} />;
      case 'resource_detail': return <ResourceDetail recommendationId={selectedResourceType || ''} token={authSession.accessToken} apiRole={authSession.user.role as ApiRole} onBack={() => setCurrentView('console')} />;
      case 'chat': return <Chat token={authSession.accessToken} />;
      case 'history': return <History token={authSession.accessToken} />;
case 'agent_settings': return <AgentSettings
  token={authSession.accessToken}
  role={authSession.user.role}
  onOpenRecommendation={(recommendationId) => {
    setSelectedResourceType(recommendationId);
    setCurrentView('resource_detail');
  }}
/>;
case 'ingesta': return <Ingesta token={authSession.accessToken} canManage={['MASTER_ADMIN', 'OPERATOR_ADMIN', 'ADMIN', 'FINOPS_TECHNICIAN'].includes(authSession.user.role)} onNavigate={setCurrentView} />;
case 'metricas_tecnicas': return <MetricasTecnicas token={authSession.accessToken} />;
case 'budgets': return <Budgets token={authSession.accessToken} canManage={['MASTER_ADMIN', 'OPERATOR_ADMIN', 'ADMIN', 'FINOPS_TECHNICIAN'].includes(authSession.user.role)} onOpenAllocation={() => setCurrentView('cost_allocation')} />;
case 'cost_allocation': return <CostAllocation token={authSession.accessToken} canManage={['MASTER_ADMIN', 'OPERATOR_ADMIN', 'ADMIN', 'FINOPS_TECHNICIAN'].includes(authSession.user.role)} />;
case 'value_realization': return <ValueRealization token={authSession.accessToken} canReconcile={['MASTER_ADMIN', 'OPERATOR_ADMIN', 'ADMIN', 'FINOPS_TECHNICIAN'].includes(authSession.user.role)} onOpenRecommendation={(id) => { setSelectedResourceType(id); setCurrentView('resource_detail'); }} />;
case 'cloud_inventory': return <CloudInventory token={authSession.accessToken} onOpenResource={(resource) => { setSelectedCloudResourceId(resource.externalResourceId); setSelectedCloudResourceCanonicalId(resource.id); setCurrentView('cloud_resource_detail'); }} />;
case 'cloud_resource_detail': return <CloudResourceDetail token={authSession.accessToken} externalResourceId={selectedCloudResourceId ?? ''} cloudResourceId={selectedCloudResourceCanonicalId ?? undefined} onBack={() => setCurrentView('cloud_inventory')} />;
case 'master_admin': return authSession.user.role === 'MASTER_ADMIN'
? <MasterAdmin token={authSession.accessToken} onTenantsChanged={refreshAccessibleTenants} />
: <Dashboard token={authSession.accessToken} onOpenBudgets={() => setCurrentView('budgets')} />;
case 'profile': return <Profile onLogout={handleLogout} currentRole={currentRole} user={authSession.user} token={authSession.accessToken} />;
      default: return <Dashboard token={authSession.accessToken} onOpenBudgets={() => setCurrentView('budgets')} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
<Sidebar currentView={currentView} onViewChange={setCurrentView} currentRole={currentRole} apiRole={authSession.user.role} user={authSession.user} />
<BottomNav currentView={currentView} onViewChange={setCurrentView} currentRole={currentRole} apiRole={authSession.user.role} />
      
      <div className="flex-1 lg:ml-[280px] flex flex-col min-h-[100dvh]">
        <TopHeader 
          currentView={currentView} 
          activeTenant={authSession.activeTenant}
          availableTenants={authSession.availableTenants}
          onTenantChange={handleTenantChange}
          role={authSession.user.role}
          token={authSession.accessToken}
        />
        <main className="flex-1 p-4 lg:p-10 pb-24 lg:pb-10 custom-scrollbar overflow-x-hidden">
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">Cargando módulo…</div>}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
