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

type View = 'login' | 'dashboard' | 'console' | 'chat' | 'history' | 'profile' | 'resource_detail';
type Account = 'prod' | 'dev';
export type Role = 'admin' | 'client';
function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [activeAccount, setActiveAccount] = useState<Account>('prod');
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);

  if (currentView === 'login') {
    return <Login onLogin={(role: Role) => {
      setCurrentRole(role);
      setCurrentView(role === 'admin' ? 'console' : 'dashboard');
    }} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard account={activeAccount} />;
      case 'console': return <Console account={activeAccount} onResourceSelect={(id) => {
        setSelectedResourceType(id);
        setCurrentView('resource_detail');
      }} />;
      case 'resource_detail': return <ResourceDetail resourceId={selectedResourceType || 'prod-app-server'} onBack={() => setCurrentView('console')} />;
      case 'chat': return <Chat />;
      case 'history': return <History />;
      case 'profile': return <Profile onLogout={() => setCurrentView('login')} currentRole={currentRole} />;
      default: return <Dashboard account={activeAccount} />;
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
