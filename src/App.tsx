import { useState } from 'react';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Console from './views/Console';
import Chat from './views/Chat';
import History from './views/History';
import Profile from './views/Profile';
import ResourceDetail from './views/ResourceDetail';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopHeader from './components/TopHeader';
import { login, mapApiRoleToAppRole, type AuthSession, type AppRole } from './services/api';

type View = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail';
type Account = 'prod' | 'dev';
export type Role = AppRole;
function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [activeAccount, setActiveAccount] = useState<Account>('prod');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);

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
  };

  if (currentView === 'login' || authSession === null) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard account={activeAccount} token={authSession.accessToken} />;
      case 'console': return <Console account={activeAccount} token={authSession.accessToken} onResourceSelect={(id) => {
        setSelectedResourceType(id);
        setCurrentView('resource_detail');
      }} />;
      case 'resource_detail': return <ResourceDetail recommendationId={selectedResourceType || ''} token={authSession.accessToken} currentRole={currentRole} onBack={() => setCurrentView('console')} />;
      case 'chat': return <Chat token={authSession.accessToken} />;
      case 'history': return <History token={authSession.accessToken} />;
      case 'profile': return <Profile onLogout={handleLogout} currentRole={currentRole} />;
      default: return <Dashboard account={activeAccount} token={authSession.accessToken} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} currentRole={currentRole} />
      <BottomNav currentView={currentView} onViewChange={setCurrentView} currentRole={currentRole} />
      
      <div className="flex-1 lg:ml-[280px] flex flex-col min-h-[100dvh]">
        <TopHeader 
          currentView={currentView} 
          activeAccount={activeAccount} 
          onAccountChange={setActiveAccount} 
        />
        <main className="flex-1 p-4 lg:p-10 pb-24 lg:pb-10 custom-scrollbar overflow-x-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;
