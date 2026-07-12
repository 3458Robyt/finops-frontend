import { useState } from 'react';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Console from './views/Console';
import Chat from './views/Chat';
import History from './views/History';
import Profile from './views/Profile';
import ResourceDetail from './views/ResourceDetail';
import AgentSettings from './views/AgentSettings';
import Ingesta from './views/Ingesta';
import MetricasTecnicas from './views/MetricasTecnicas';
import MasterAdmin from './views/MasterAdmin';
import CloudInventory, { CloudResourceDetail } from './views/CloudInventory';
import Budgets from './views/Budgets';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopHeader from './components/TopHeader';
import { fetchAccessibleTenants, login, mapApiRoleToAppRole, switchTenant, type ApiRole, type AuthSession, type AppRole } from './services/api';

type View = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail' | 'agent_settings' | 'ingesta' | 'metricas_tecnicas' | 'master_admin' | 'cloud_inventory' | 'cloud_resource_detail' | 'budgets';
export type Role = AppRole;
function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [selectedCloudResourceId, setSelectedCloudResourceId] = useState<string | null>(null);

  const currentRole = authSession !== null ? mapApiRoleToAppRole(authSession.user.role) : 'client';

  const handleLogin = async (email: string, password: string) => {
    const session = await login(email, password);
    const role = mapApiRoleToAppRole(session.user.role);

    setAuthSession(session);
    setCurrentView(role === 'admin' ? 'console' : 'dashboard');
  };

  const handleLogout = () => {
    setAuthSession(null);
    setCurrentView('login');
    setSelectedResourceType(null);
    setSelectedCloudResourceId(null);
  };

const handleTenantChange = async (tenantId: string) => {
    if (authSession === null || tenantId === authSession.activeTenant.id) {
      return;
    }

    const nextSession = await switchTenant(authSession.accessToken, tenantId);
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
case 'agent_settings': return <AgentSettings token={authSession.accessToken} role={authSession.user.role} />;
case 'ingesta': return <Ingesta token={authSession.accessToken} />;
case 'metricas_tecnicas': return <MetricasTecnicas token={authSession.accessToken} />;
case 'budgets': return <Budgets token={authSession.accessToken} canManage={['MASTER_ADMIN', 'OPERATOR_ADMIN', 'ADMIN', 'FINOPS_TECHNICIAN'].includes(authSession.user.role)} />;
case 'cloud_inventory': return <CloudInventory token={authSession.accessToken} onOpenResource={(id) => { setSelectedCloudResourceId(id); setCurrentView('cloud_resource_detail'); }} />;
case 'cloud_resource_detail': return <CloudResourceDetail token={authSession.accessToken} externalResourceId={selectedCloudResourceId ?? ''} onBack={() => setCurrentView('cloud_inventory')} />;
case 'master_admin': return authSession.user.role === 'MASTER_ADMIN'
? <MasterAdmin token={authSession.accessToken} onTenantsChanged={refreshAccessibleTenants} />
: <Dashboard token={authSession.accessToken} onOpenBudgets={() => setCurrentView('budgets')} />;
case 'profile': return <Profile onLogout={handleLogout} currentRole={currentRole} user={authSession.user} />;
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
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;
