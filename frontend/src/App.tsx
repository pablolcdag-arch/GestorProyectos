import React, { useEffect, useState } from 'react';
import { LoginScreen } from './components/auth/LoginScreen';
import { BoardView } from './components/board/BoardView';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { useAuthStore } from './store/useAuthStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';

export const App: React.FC = () => {
  const { user, restoreSession } = useAuthStore();
  const { loadWorkspaces } = useWorkspaceStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (user) {
      void loadWorkspaces();
    }
  }, [user, loadWorkspaces]);

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f5f6f8] text-[#323338]">
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />
        <BoardView />
      </div>
    </div>
  );
};

export default App;

